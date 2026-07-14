import type { JobSourceAdapter } from "./index";
import type { SavedSearchQuery } from "../types";
import { generateJobs } from "../mock/data";

/**
 * Mock source — always enabled, no keys. Emits jobs from two logical "sources"
 * so ingestion dedupe is exercised end-to-end (§Phase 2 acceptance).
 */
export const mockAdapter: JobSourceAdapter = {
  id: "jsearch",
  enabled: () => true,
  async fetchJobs(q: SavedSearchQuery) {
    const a = generateJobs(q, { source: "jsearch", seed: 42, count: 16 });
    const b = generateJobs(q, { source: "adzuna", seed: 7, count: 10 });
    // Force one overlap: give the first adzuna job the same dedupe_hash as a jsearch one.
    if (a[0] && b[0]) b[0] = { ...b[0], dedupeHash: a[0].dedupeHash };
    return [...a, ...b];
  },
};
