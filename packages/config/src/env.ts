import { z } from "zod";

/**
 * Env validation (spec §7). Fails fast at boot in server contexts.
 *
 * Design: every external integration is optional so the app boots in MOCK
 * mode with zero keys. `mockMode` is derived: explicit MOCK_MODE=true, or the
 * absence of the core Supabase + Anthropic keys. Individual adapters check
 * their own keys and fall back to mock when missing.
 */
const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null ? def : v === "true" || v === "1"));

const intWithDefault = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null || v === "" ? def : Number(v)))
    .pipe(z.number().int().nonnegative());

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  MOCK_MODE: bool(false),

  // Supabase. The Vercel↔Supabase integration injects its own names, so we
  // accept both our canonical vars and the integration's (resolved in loadEnv).
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_URL: z.string().url().optional(), // integration (server-side)
  SUPABASE_ANON_KEY: z.string().optional(), // integration (server-side)
  DATABASE_URL: z.string().optional(),
  POSTGRES_URL: z.string().optional(), // integration: pooled (pgbouncer)
  POSTGRES_URL_NON_POOLING: z.string().optional(), // integration: direct (migrations)

  // Queue
  REDIS_URL: z.string().optional(),

  // LLM + embeddings. OpenRouter (OpenAI-compatible) is the primary provider;
  // Anthropic-direct is still supported. See DECISIONS.md D3.
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(), // default: google/gemini-2.5-flash
  OPENROUTER_MODEL_CHEAP: z.string().optional(), // default: google/gemini-2.5-flash-lite
  VOYAGE_API_KEY: z.string().optional(),

  // Job source APIs
  RAPIDAPI_KEY: z.string().optional(),
  ADZUNA_APP_ID: z.string().optional(),
  ADZUNA_APP_KEY: z.string().optional(),

  // Recruiter contacts
  APOLLO_API_KEY: z.string().optional(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  // Payments
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),

  // Optional scraper sources — OFF by default (§5)
  ENABLE_APIFY_SOURCES: bool(false),
  APIFY_TOKEN: z.string().optional(),

  // Budget guards
  MAX_JSEARCH_CALLS_PER_DAY: intWithDefault(200),
  MAX_ADZUNA_CALLS_PER_DAY: intWithDefault(500),

  // Admin
  ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
});

export type Env = z.infer<typeof envSchema> & {
  mockMode: boolean;
  /** True when any real LLM provider (OpenRouter or Anthropic) is configured. */
  hasLlm: boolean;
  llmProvider: "openrouter" | "anthropic" | "mock";
  llmModel: string;
  llmModelCheap: string;
  /** Resolved runtime connection string (pooled) — for serverless queries. */
  databaseUrl?: string;
  /** Resolved direct connection string — for migrations (drizzle-kit). */
  databaseUrlDirect?: string;
  /** Resolved Supabase URL, from either naming scheme. */
  supabaseUrl?: string;
};

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error("Environment validation failed");
  }
  const data = parsed.data;

  // Reconcile our canonical names with the Vercel↔Supabase integration's names.
  const databaseUrl = data.DATABASE_URL || data.POSTGRES_URL || data.POSTGRES_URL_NON_POOLING;
  const databaseUrlDirect = data.POSTGRES_URL_NON_POOLING || data.DATABASE_URL || data.POSTGRES_URL;
  const supabaseUrl = data.NEXT_PUBLIC_SUPABASE_URL || data.SUPABASE_URL;

  // LLM provider resolution (OpenRouter preferred). Independent of mockMode so
  // real AI scoring works even while job adapters remain mocked.
  const llmProvider: Env["llmProvider"] = data.OPENROUTER_API_KEY
    ? "openrouter"
    : data.ANTHROPIC_API_KEY
      ? "anthropic"
      : "mock";
  const hasLlm = llmProvider !== "mock";
  const llmModel = data.OPENROUTER_MODEL || "google/gemini-2.5-flash";
  const llmModelCheap = data.OPENROUTER_MODEL_CHEAP || "google/gemini-2.5-flash-lite";

  // MOCK if explicitly requested, or if the minimum real stack is not configured.
  const hasRealStack = Boolean(supabaseUrl && hasLlm && databaseUrl);

  cached = {
    ...data,
    // Backfill canonical fields so downstream code can read them uniformly.
    DATABASE_URL: databaseUrl,
    databaseUrl,
    databaseUrlDirect,
    supabaseUrl,
    hasLlm,
    llmProvider,
    llmModel,
    llmModelCheap,
    mockMode: data.MOCK_MODE || !hasRealStack,
  };
  return cached;
}

export const env = loadEnv();
