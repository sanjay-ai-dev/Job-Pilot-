import {
  jsearchAdapter,
  adzunaAdapter,
  apifyLinkedinAdapter,
  apifyNaukriAdapter,
  type JobSourceAdapter,
} from "@jobpilot/core";
import type { SavedSearchQuery } from "@jobpilot/core";

const ADAPTERS: JobSourceAdapter[] = [
  jsearchAdapter,
  adzunaAdapter,
  apifyLinkedinAdapter,
  apifyNaukriAdapter,
];

/**
 * Ingestion run (§6.3): for each active saved_search, fan out to enabled
 * adapters, normalize, upsert `jobs` (on conflict on dedupe_hash do nothing but
 * refresh apply_url/posted_at if newer), embed new jobs, then enqueue match:user.
 * A single source failing must never fail the whole run.
 *
 * Scaffolded here; the DB upsert + embed steps land with Phase 2 wiring.
 */
export async function runIngestion(): Promise<void> {
  // TODO(Phase 2): load active saved_searches from DB.
  const searches: SavedSearchQuery[] = [];
  for (const search of searches) {
    for (const adapter of ADAPTERS) {
      if (!adapter.enabled()) continue;
      try {
        const jobs = await adapter.fetchJobs(search);
        console.log(`[ingest] ${adapter.id} → ${jobs.length} jobs for "${search.roleQuery}"`);
        // TODO: dedupe upsert + embed + enqueue match:user
      } catch (e) {
        console.error(`[ingest] ${adapter.id} failed (isolated):`, (e as Error).message);
      }
    }
  }
}
