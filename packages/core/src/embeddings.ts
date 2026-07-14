import { env } from "@jobpilot/config/env";

/**
 * Embeddings abstraction (§3) — Voyage `voyage-3-lite` (1024-dim) behind an
 * interface so the provider can swap. Mock mode returns a deterministic hashed
 * vector so pgvector similarity still produces sensible, stable orderings.
 */
export const EMBEDDING_DIM = 1024;

export async function embed(texts: string[]): Promise<number[][]> {
  if (env.mockMode || !env.VOYAGE_API_KEY) {
    return texts.map(hashedEmbedding);
  }
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.VOYAGE_API_KEY}`,
    },
    body: JSON.stringify({ input: texts, model: "voyage-3-lite" }),
  });
  if (!res.ok) throw new Error(`Voyage ${res.status}`);
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}

export async function embedOne(text: string): Promise<number[]> {
  return (await embed([text]))[0]!;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/** Deterministic bag-of-words hashing embedding for offline dev. */
function hashedEmbedding(text: string): number[] {
  const v = new Array(EMBEDDING_DIM).fill(0);
  const tokens = text.toLowerCase().match(/[a-z0-9+#.]+/g) ?? [];
  for (const t of tokens) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) {
      h ^= t.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    v[(h >>> 0) % EMBEDDING_DIM] += 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}
