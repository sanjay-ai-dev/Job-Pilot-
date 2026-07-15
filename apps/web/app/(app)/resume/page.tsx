import type { AtsBreakdown } from "@jobpilot/core/types";
import { authEnabled } from "@/lib/supabase/config";
import { createClient, getUser } from "@/lib/supabase/server";
import { DEMO_ATS, DEMO_PROFILE, TARGET_ROLE } from "@/lib/data";
import { ResumeView, type VersionRow } from "@/components/resume/resume-view";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  if (!authEnabled) {
    // Public demo — deterministic mock ATS.
    return (
      <ResumeView
        mode="demo"
        targetRole={TARGET_ROLE}
        initialAts={DEMO_ATS}
        initialFileName="Priya_Sharma_Resume_v2.pdf"
        initialSkills={DEMO_PROFILE.skills}
        initialVersions={[
          { version: 2, score: DEMO_ATS.ats_score, date: "Today", active: true },
          { version: 1, score: 71, date: "3 days ago", active: false },
        ]}
      />
    );
  }

  const user = await getUser();
  let ats: AtsBreakdown | null = null;
  let fileName: string | null = null;
  let skills: string[] = [];
  let versions: VersionRow[] = [];
  let targetRole = "Software Engineer";

  if (user) {
    try {
      const supabase = await createClient();
      const [{ data: rows }, { data: search }] = await Promise.all([
        supabase
          .from("resumes")
          .select("version, ats_score, ats_breakdown, parsed, storage_path, is_active, created_at")
          .eq("user_id", user.id)
          .order("version", { ascending: false }),
        supabase
          .from("saved_searches")
          .select("role_query")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      targetRole = search?.role_query ?? targetRole;
      if (rows && rows.length) {
        const active = rows.find((r) => r.is_active) ?? rows[0]!;
        ats = active.ats_breakdown as AtsBreakdown;
        skills = ((active.parsed as { skills?: string[] } | null)?.skills ?? []) as string[];
        fileName = active.storage_path?.split("/").pop() ?? "resume";
        versions = rows.map((r) => ({
          version: r.version,
          score: r.ats_score ?? 0,
          date: new Date(r.created_at as string).toLocaleDateString("en-IN"),
          active: Boolean(r.is_active),
        }));
      }
    } catch {
      // Table not created yet (migration pending) — show the empty upload state.
    }
  }

  return (
    <ResumeView
      mode="real"
      targetRole={targetRole}
      initialAts={ats}
      initialFileName={fileName}
      initialSkills={skills}
      initialVersions={versions}
    />
  );
}
