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

/**
 * Ingestion (§6.3): fan out to enabled adapters for each saved search, dedupe by
 * hash, upsert into `jobs` with a 30-day expiry. In-process only — no embeddings
 * stored here (matching computes them), which keeps this resilient to pgvector.
 * A single source failing never fails the whole run.
 */
export async function ingestForSearches(searches: SavedSearchRow[]): Promise<{ fetched: number; upserted: number }> {
  const byHash = new Map<string, NormalizedJob>();

  for (const s of searches) {
    const q: SavedSearchQuery = {
      id: s.id,
      roleQuery: s.role_query,
      locations: s.locations ?? [],
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
        console.error(`[ingest] ${adapter.id} failed (isolated):`, (e as Error).message);
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
