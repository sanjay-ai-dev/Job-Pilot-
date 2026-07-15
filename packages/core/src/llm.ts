import { env } from "@jobpilot/config/env";
import { z } from "zod";

/**
 * Single LLM client (§13.3). All LLM calls route through here: provider is
 * OpenRouter (OpenAI-compatible) when OPENROUTER_API_KEY is set, else Anthropic
 * direct, else the caller's mock. Retry on JSON-parse failure (one retry), and
 * cost logging via the injected event sink (web/worker → `events` table).
 * See DECISIONS.md D3.
 */
export type ModelId = "claude-sonnet-4-6" | "claude-haiku-4-5-20251001";

export interface LlmCallOptions {
  /** Intent: the haiku id maps to the cheap model; anything else to primary. */
  model?: ModelId;
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

type EventSink = (name: string, props: Record<string, unknown>) => void | Promise<void>;
let eventSink: EventSink = () => {};
export function setLlmEventSink(sink: EventSink) {
  eventSink = sink;
}

// Rough INR cost per 1M tokens for Anthropic-direct budget logging.
const ANTHROPIC_COST: Record<ModelId, { in: number; out: number }> = {
  "claude-sonnet-4-6": { in: 250, out: 1250 },
  "claude-haiku-4-5-20251001": { in: 70, out: 350 },
};

const isCheap = (m?: ModelId) => m === "claude-haiku-4-5-20251001";

/** Low-level text completion. Callers should prefer `completeJson`. */
export async function completeText(prompt: string, opts: LlmCallOptions = {}): Promise<string> {
  if (env.llmProvider === "openrouter") return openrouterText(prompt, opts);
  if (env.llmProvider === "anthropic") return anthropicText(prompt, opts);
  throw new Error("LLM called with no provider — callers must supply a mock path");
}

async function openrouterText(prompt: string, opts: LlmCallOptions): Promise<string> {
  const model = isCheap(opts.model) ? env.llmModelCheap : env.llmModel;
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "https://jobpilot.app",
      "X-Title": "JobPilot",
    },
    body: JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 2048,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens: number; completion_tokens: number; cost?: number };
  };
  await eventSink("llm_call", {
    provider: "openrouter",
    model,
    input_tokens: json.usage?.prompt_tokens,
    output_tokens: json.usage?.completion_tokens,
    cost_usd: json.usage?.cost,
  });
  return json.choices[0]?.message?.content ?? "";
}

async function anthropicText(prompt: string, opts: LlmCallOptions): Promise<string> {
  const model = opts.model ?? "claude-sonnet-4-6";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.2,
      system: opts.system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as {
    content: { text: string }[];
    usage: { input_tokens: number; output_tokens: number };
  };
  const c = ANTHROPIC_COST[model];
  await eventSink("llm_call", {
    provider: "anthropic",
    model,
    input_tokens: json.usage.input_tokens,
    output_tokens: json.usage.output_tokens,
    cost_inr: (json.usage.input_tokens / 1e6) * c.in + (json.usage.output_tokens / 1e6) * c.out,
  });
  return json.content.map((p) => p.text).join("");
}

/**
 * JSON completion with schema validation + one repair retry (§8). The `mock`
 * callback is invoked instead of the network when running key-free, so every
 * feature has a deterministic offline path.
 */
export async function completeJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  opts: LlmCallOptions & { mock: () => T },
): Promise<T> {
  if (!env.hasLlm) {
    return schema.parse(opts.mock());
  }
  const strict = `${prompt}\n\nRespond with a single JSON value only. No markdown fences, no prose.`;
  let raw = await completeText(strict, opts);
  let parsed = tryParse(raw, schema);
  if (parsed.ok) return parsed.value;

  const repair = `${strict}\n\nYour previous reply failed to parse: ${parsed.error}\nReturn corrected JSON only.`;
  raw = await completeText(repair, opts);
  parsed = tryParse(raw, schema);
  if (parsed.ok) return parsed.value;
  throw new Error(`LLM JSON parse failed after retry: ${parsed.error}`);
}

function tryParse<T>(raw: string, schema: z.ZodType<T>): { ok: true; value: T } | { ok: false; error: string } {
  try {
    const cleaned = raw.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    return { ok: true, value: schema.parse(JSON.parse(cleaned)) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
