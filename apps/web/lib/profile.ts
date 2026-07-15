import { createClient, getUser } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  full_name: string | null;
  city: string | null;
  plan: string;
}

/**
 * Ensure a profiles row exists for the current user (§6.1). Called after login;
 * idempotent. Best-effort — swallows errors so login still succeeds before the
 * schema migration has been applied.
 */
export async function ensureProfile(): Promise<void> {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
}

/** Load the current user's profile (or null). */
export async function getProfile(): Promise<Profile | null> {
  const user = await getUser();
  if (!user) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, city, plan")
      .eq("id", user.id)
      .maybeSingle();
    return (
      data ?? { id: user.id, full_name: user.email?.split("@")[0] ?? null, city: null, plan: "free" }
    );
  } catch {
    return { id: user.id, full_name: user.email?.split("@")[0] ?? null, city: null, plan: "free" };
  }
}
