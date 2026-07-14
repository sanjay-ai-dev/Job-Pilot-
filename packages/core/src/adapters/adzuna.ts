import { env } from "@jobpilot/config/env";
import type { JobSourceAdapter } from "./index";
import type { NormalizedJob, SavedSearchQuery } from "../types";
import { dedupeHash, resolvePostedAt, toLpa } from "../util";
import { generateJobs } from "../mock/data";

/**
 * Adzuna adapter (India — gb replaced by `in`). Salary from Adzuna is annual INR.
 * Falls back to mock generation without credentials.
 */
export const adzunaAdapter: JobSourceAdapter = {
  id: "adzuna",
  enabled: () => true,
  async fetchJobs(q: SavedSearchQuery): Promise<NormalizedJob[]> {
    if (env.mockMode || !env.ADZUNA_APP_ID || !env.ADZUNA_APP_KEY) {
      return generateJobs(q, { source: "adzuna", seed: 7, count: 10 });
    }
    const loc = q.locations[0] ?? "";
    const url = new URL("https://api.adzuna.com/v1/api/jobs/in/search/1");
    url.searchParams.set("app_id", env.ADZUNA_APP_ID);
    url.searchParams.set("app_key", env.ADZUNA_APP_KEY);
    url.searchParams.set("what", q.roleQuery);
    if (loc) url.searchParams.set("where", loc);
    url.searchParams.set("results_per_page", "30");
    url.searchParams.set("sort_by", "date");

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Adzuna ${res.status}`);
    const json = (await res.json()) as { results?: AdzunaRow[] };

    return (json.results ?? []).map((r): NormalizedJob => {
      const city = r.location?.display_name ?? loc ?? "India";
      const { postedAt, estimated } = resolvePostedAt(r.created ?? null);
      return {
        dedupeHash: dedupeHash(r.company?.display_name ?? "", r.title ?? "", city),
        source: "adzuna",
        sourceJobId: r.id,
        title: r.title ?? "",
        company: r.company?.display_name ?? "",
        locations: [city],
        remote: /remote/i.test(`${r.title} ${r.description}`),
        description: r.description,
        salaryMinLpa: toLpa(r.salary_min, "year", "INR"),
        salaryMaxLpa: toLpa(r.salary_max, "year", "INR"),
        applyUrl: r.redirect_url,
        postedAt,
        meta: { postedAtEstimated: estimated },
      };
    });
  },
};

interface AdzunaRow {
  id?: string;
  title?: string;
  description?: string;
  redirect_url?: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
  company?: { display_name?: string };
  location?: { display_name?: string };
}
