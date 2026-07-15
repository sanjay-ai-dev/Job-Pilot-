/**
 * Auth is a two-gate switch so the mock demo never breaks unexpectedly:
 *   1. Supabase public creds must be present, AND
 *   2. NEXT_PUBLIC_AUTH_ENABLED must be "true".
 * This lets us deploy the auth code while keeping the public demo open until the
 * Supabase project (redirect URLs, migration, storage) is fully configured. Flip
 * NEXT_PUBLIC_AUTH_ENABLED=true to require login.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const authEnabled =
  process.env.NEXT_PUBLIC_AUTH_ENABLED === "true" && supabaseConfigured;

/** Routes that require a session when auth is enabled. */
export const PROTECTED_PREFIXES = ["/dashboard", "/resume", "/tracker", "/billing"];
