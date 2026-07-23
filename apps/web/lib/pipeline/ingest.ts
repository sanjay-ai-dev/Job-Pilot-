import {
  jsearchAdapter,
  adzunaAdapter,
  apifyLinkedinAdapter,
  apifyNaukriAdapter,
  type JobSourceAdapter,
  type NormalizedJob,
  type SavedSearchQuery,
} from "@jobpilot/core";
import { createAdminClient } from "@/lib/supabase/admin";

const ADAPTERS: JobSourceAdapter[] = [
  jsearchAdapter,
  adzunaAdapter,
  apifyLinkedinAdapter,
  apifyNaukriAdapter,
];

export interface SavedSearchRow {
  id: string;
  role_query: string;
  locations: string[] | null;
  remote_ok: boolean | null;
  min_experience: number | null;
  max_experience: number | null;
}

/** Prominent India job hubs — used when a user has 0 or >1 cities set. */
const MAJOR_CITIES = [
  "Bengaluru", "Hyderabad", "Pune", "Gurugram", "Mumbai", "Chennai", "Noida", "Delhi",
];

/**
 * Ingestion (§6.3): fan out to enabled adapters for each saved search, dedupe by
 * hash, upsert into `jobs` with a 30-day expiry. In-process only — no embeddings
 * stored here (matching computes them), which keeps this resilient to pgvector.
 * A single source failing never fails the whole run.
 */
export async function ingestForSearches(searches: SavedSearchRow[]): Promise<{ fetched: number; upserted: number }> {
  const byHash = new Map<string, NormalizedJob>();

  for (const s of searches) {
    // Expand a saved_search into per-city queries so we get real coverage across
    // major hubs (Adzuna doesn't OR locations). User-picked cities take priority;
    // if the user selected none or many, fan out across MAJOR_CITIES.
    const userCities = (s.locations ?? []).filter((c) => c && c.toLowerCase() !== "remote");
    const cities = userCities.length >= 1 && userCities.length <= 2 ? userCities : MAJOR_CITIES;

    // Cap concurrent Adzuna calls to stay well under free-tier rate limits.
    for (const city of cities) {
      const q: SavedSearchQuery = {
        id: s.id,
        roleQuery: s.role_query,
        locations: [city],
        remoteOk: s.remote_ok ?? true,
        minExperience: s.min_experience ?? undefined,
        maxExperience: s.max_experience ?? undefined,
      };
      for (const adapter of ADAPTERS) {
        if (!adapter.enabled()) continue;
        try {
          const jobs = await adapter.fetchJobs(q);
          for (const j of jobs) if (!byHash.has(j.dedupeHash)) byHash.set(j.dedupeHash, j);
        } catch (e) {
          console.error(`[ingest] ${adapter.id} ${city} failed:`, (e as Error).message);
        }
      }
    }

    // One extra pass for remote roles when the user is remote-open.
    if (s.remote_ok !== false) {
      const q: SavedSearchQuery = {
        id: s.id,
        roleQuery: `${s.role_query} remote`,
        locations: [],
        remoteOk: true,
      };
      for (const adapter of ADAPTERS) {
        if (!adapter.enabled()) continue;
        try {
          const jobs = await adapter.fetchJobs(q);
          for (const j of jobs) if (!byHash.has(j.dedupeHash)) byHash.set(j.dedupeHash, j);
        } catch (e) {
          console.error(`[ingest] ${adapter.id} remote failed:`, (e as Error).message);
        }
      }
    }
  }

  const jobs = [...byHash.values()];
  if (!jobs.length) return { fetched: 0, upserted: 0 };

  const now = Date.now();
  const rows = jobs.map((j) => ({
    dedupe_hash: j.dedupeHash,
    source: j.source,
    source_job_id: j.sourceJobId ?? null,
    title: j.title,
    company: j.company,
    locations: j.locations,
    remote: j.remote,
    description: j.description ?? null,
    salary_min_lpa: j.salaryMinLpa ?? null,
    salary_max_lpa: j.salaryMaxLpa ?? null,
    apply_url: j.applyUrl ?? null,
    posted_at: j.postedAt,
    expires_at: new Date(now + 30 * 864e5).toISOString(),
    meta: j.meta ?? null,
  }));

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("jobs")
    .upsert(rows, { onConflict: "dedupe_hash" })
    .select("id");
  if (error) throw new Error(`jobs upsert: ${error.message}`);
  return { fetched: jobs.length, upserted: data?.length ?? 0 };
}

/** Load all active saved searches (optionally for one user). */
export async function loadActiveSearches(userId?: string): Promise<(SavedSearchRow & { user_id: string })[]> {
  const admin = createAdminClient();
  let q = admin
    .from("saved_searches")
    .select("id, user_id, role_query, locations, remote_ok, min_experience, max_experience")
    .eq("is_active", true);
  if (userId) q = q.eq("user_id", userId);
  const { data, error } = await q;
  if (error) throw new Error(`load searches: ${error.message}`);
  return (data ?? []) as (SavedSearchRow & { user_id: string })[];
}
