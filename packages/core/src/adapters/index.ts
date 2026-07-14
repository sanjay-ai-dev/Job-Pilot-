import type { NormalizedJob, SavedSearchQuery, JobSourceId } from "../types";

/** Job source adapter interface (spec §5). */
export interface JobSourceAdapter {
  id: JobSourceId;
  /** Feature-flag / env driven. A disabled source is skipped silently. */
  enabled(): boolean;
  fetchJobs(q: SavedSearchQuery): Promise<NormalizedJob[]>;
}

export { jsearchAdapter } from "./jsearch";
export { adzunaAdapter } from "./adzuna";
export { apifyLinkedinAdapter, apifyNaukriAdapter } from "./apify";
export { mockAdapter } from "./mock";
