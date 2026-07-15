"use server";
import { createClient, getUser } from "@/lib/supabase/server";
import { authEnabled } from "@/lib/supabase/config";

export interface OnboardingInput {
  roles: string[];
  cities: string[];
  experience: string;
  expectedCtc: string;
  notice: string;
}

/**
 * Persist onboarding to profiles + saved_searches (§6.1). Best-effort: a no-op
 * when auth is off or the visitor isn't signed in, so the public demo still
 * flows straight to the dashboard.
 */
export async function saveOnboarding(input: OnboardingInput): Promise<{ ok: boolean }> {
  if (!authEnabled) return { ok: false };
  const user = await getUser();
  if (!user) return { ok: false };

  const supabase = await createClient();
  const expYears = Number(input.experience.match(/\d+/)?.[0] ?? 0) || null;
  const ctc = Number(input.expectedCtc) || null;
  const notice = Number(input.notice) || null;

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      experience_years: expYears,
      expected_ctc_lpa: ctc,
      notice_period_days: notice,
      city: input.cities[0] ?? null,
    },
    { onConflict: "id" },
  );

  // Replace any existing searches with the (up to 3) chosen roles.
  await supabase.from("saved_searches").delete().eq("user_id", user.id);
  const rows = input.roles.slice(0, 3).map((role) => ({
    user_id: user.id,
    role_query: role,
    locations: input.cities,
    remote_ok: input.cities.includes("Remote"),
  }));
  if (rows.length) await supabase.from("saved_searches").insert(rows);

  return { ok: true };
}
