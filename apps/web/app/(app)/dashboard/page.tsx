import type { MatchView } from "@jobpilot/core/types";
import { authEnabled } from "@/lib/supabase/config";
import { createClient, getUser } from "@/lib/supabase/server";
import { FeedPage } from "@/components/feed/feed-page";

export const dynamic = "force-dynamic";

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

export default async function DashboardPage() {
  if (!authEnabled) {
    // Public demo — the store seeds itself with mock matches.
    return <FeedPage initialMatches={[]} realMode={false} />;
  }

  const user = await getUser();
  let matches: MatchView[] = [];
  if (user) {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("matches")
        .select(
          "id, similarity, match_score, match_reason, status, created_at, job:jobs(id, title, company, locations, remote, description, salary_min_lpa, salary_max_lpa, apply_url, posted_at, source, meta)",
        )
        .eq("user_id", user.id)
        .neq("status", "dismissed")
        .limit(200);

      matches = (data ?? [])
        .filter((m) => m.job)
        .map((m): MatchView => {
          const j = m.job as unknown as JobEmbed;
          return {
            id: m.id as string,
            job: {
              id: j.id,
              dedupeHash: "",
              source: j.source as MatchView["job"]["source"],
              title: j.title,
              company: j.company,
              locations: j.locations ?? [],
              remote: Boolean(j.remote),
              description: j.description ?? undefined,
              salaryMinLpa: num(j.salary_min_lpa),
              salaryMaxLpa: num(j.salary_max_lpa),
              applyUrl: j.apply_url ?? undefined,
              postedAt: j.posted_at ?? (m.created_at as string),
              meta: (j.meta as MatchView["job"]["meta"]) ?? undefined,
            },
            similarity: Number(m.similarity ?? 0),
            matchScore: Number(m.match_score ?? 0),
            matchReason: (m.match_reason as string) ?? "",
            status: (m.status as MatchView["status"]) ?? "new",
            createdAt: (m.created_at as string) ?? new Date().toISOString(),
          };
        });
    } catch {
      // matches/jobs tables not ready — show empty real feed.
    }
  }

  return <FeedPage initialMatches={matches} realMode={true} />;
}
