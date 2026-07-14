import { env } from "@jobpilot/config/env";
import type { JobSourceAdapter } from "./index";
import type { NormalizedJob, SavedSearchQuery } from "../types";
import { dedupeHash, resolvePostedAt, toLpa } from "../util";
import { generateJobs } from "../mock/data";

/**
 * JSearch (RapidAPI) adapter. Falls back to mock generation in MOCK_MODE or when
 * RAPIDAPI_KEY is absent, so the pipeline runs key-free. Real path normalizes
 * the JSearch payload to NormalizedJob per §5.
 */
export const jsearchAdapter: JobSourceAdapter = {
  id: "jsearch",
  enabled: () => true,
  async fetchJobs(q: SavedSearchQuery): Promise<NormalizedJob[]> {
    if (env.mockMode || !env.RAPIDAPI_KEY) {
      return generateJobs(q, { source: "jsearch", seed: 42, count: 16 });
    }
    const loc = q.locations[0] ?? "India";
    const url = new URL("https://jsearch.p.rapidapi.com/search");
    url.searchParams.set("query", `${q.roleQuery} in ${loc}`);
    url.searchParams.set("date_posted", "week");
    url.searchParams.set("num_pages", "1");

    const res = await fetch(url, {
      headers: {
        "X-RapidAPI-Key": env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
      },
    });
    if (!res.ok) throw new Error(`JSearch ${res.status}`);
    const json = (await res.json()) as { data?: JSearchRow[] };

    return (json.data ?? []).map((r): NormalizedJob => {
      const city = r.job_city ?? r.job_country ?? loc;
      const { postedAt, estimated } = resolvePostedAt(
        r.job_posted_at_datetime_utc ?? r.job_posted_at_timestamp ?? null,
      );
      const period = r.job_salary_period === "MONTH" ? "month" : r.job_salary_period === "HOUR" ? "hour" : "year";
      return {
        dedupeHash: dedupeHash(r.employer_name ?? "", r.job_title ?? "", city ?? ""),
        source: "jsearch",
        sourceJobId: r.job_id,
        title: r.job_title ?? "",
        company: r.employer_name ?? "",
        locations: [city ?? "India"],
        remote: Boolean(r.job_is_remote),
        description: r.job_description ?? undefined,
        salaryMinLpa: toLpa(r.job_min_salary, period, r.job_salary_currency ?? "INR"),
        salaryMaxLpa: toLpa(r.job_max_salary, period, r.job_salary_currency ?? "INR"),
        applyUrl: r.job_apply_link,
        postedAt,
        meta: { postedAtEstimated: estimated },
      };
    });
  },
};

interface JSearchRow {
  job_id?: string;
  job_title?: string;
  employer_name?: string;
  job_city?: string;
  job_country?: string;
  job_is_remote?: boolean;
  job_description?: string;
  job_apply_link?: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_salary_currency?: string;
  job_salary_period?: string;
  job_posted_at_datetime_utc?: string;
  job_posted_at_timestamp?: number;
}
