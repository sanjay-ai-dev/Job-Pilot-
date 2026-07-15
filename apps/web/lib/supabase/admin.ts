import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Service-role client (server-only) — bypasses RLS for trusted server work like
 * writing resume rows and uploading to private storage. NEVER import from a
 * client component. Callers must scope every query by the authenticated user id.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = SUPABASE_URL || process.env.SUPABASE_URL || "";
  if (!url || !serviceKey) throw new Error("Supabase service role not configured");
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
