import type { MatchView } from "@jobpilot/core/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface JobEmbed {
  id: string;
  title: string;
  company: string;
  locations: string[] | null;
  remote: boolean | null;
  description: string | null;
  salary_min_lpa: string | number | null;
  salary_max_lpa: string | number | null;
  apply_url: string | null;
  posted_at: string | null;
  source: string;
  meta: unknown;
}
const num = (v: string | number | null) => (v == null ? null : Number(v));

/** Shape a matches row (with joined job) into the client MatchView. */
function toMatchView(m: {
  id: string;
  similarity: number | null;
  match_score: number | null;
  match_reason: string | null;
  status: string;
  created_at: string;
  job: JobEmbed;
}): MatchView {
  return {
    id: m.id,
    job: {
      id: m.job.id,
      dedupeHash: "",
      source: m.job.source as MatchView["job"]["source"],
      title: m.job.title,
      company: m.job.company,
      locations: m.job.locations ?? [],
      remote: Boolean(m.job.remote),
      description: m.job.description ?? undefined,
      salaryMinLpa: num(m.job.salary_min_lpa),
      salaryMaxLpa: num(m.job.salary_max_lpa),
      applyUrl: m.job.apply_url ?? undefined,
      postedAt: m.job.posted_at ?? m.created_at,
      meta: (m.job.meta as MatchView["job"]["meta"]) ?? undefined,
    },
    similarity: Number(m.similarity ?? 0),
    matchScore: Number(m.match_score ?? 0),
    matchReason: m.match_reason ?? "",
    status: m.status as MatchView["status"],
    createdAt: m.created_at,
  };
}

/** Top N recommended matches for a user (best-match order, excludes dismissed/applied). */
export async function loadTopRecs(userId: string, limit = 5): Promise<MatchView[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("matches")
    .select(
      "id, similarity, match_score, match_reason, status, created_at, job:jobs(id, title, company, locations, remote, description, salary_min_lpa, salary_max_lpa, apply_url, posted_at, source, meta)",
    )
    .eq("user_id", userId)
    .in("status", ["new", "saved"])
    .order("match_score", { ascending: false })
    .limit(limit);
  return (data ?? []).filter((m) => m.job).map((m) => toMatchView(m as never));
}

/** RLS-scoped version (safe to use from server pages when a user is signed in). */
export async function loadTopRecsForCurrentUser(userId: string, limit = 5): Promise<MatchView[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select(
      "id, similarity, match_score, match_reason, status, created_at, job:jobs(id, title, company, locations, remote, description, salary_min_lpa, salary_max_lpa, apply_url, posted_at, source, meta)",
    )
    .eq("user_id", userId)
    .in("status", ["new", "saved"])
    .order("match_score", { ascending: false })
    .limit(limit);
  return (data ?? []).filter((m) => m.job).map((m) => toMatchView(m as never));
}
