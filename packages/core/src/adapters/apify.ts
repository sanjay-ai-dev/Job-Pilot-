import { env } from "@jobpilot/config/env";
import type { JobSourceAdapter } from "./index";
import type { NormalizedJob, SavedSearchQuery } from "../types";

/**
 * Apify scraper sources — OPTIONAL, disabled by default (§5).
 * Per-source kill switch via ENABLE_APIFY_SOURCES. All Apify-specific code is
 * isolated in this file. Ships as a stub — real actor wiring is a TODO and must
 * remain compliant (no automated submission).
 */
function apifyEnabled(): boolean {
  return env.ENABLE_APIFY_SOURCES === true && Boolean(env.APIFY_TOKEN);
}

export const apifyLinkedinAdapter: JobSourceAdapter = {
  id: "apify_linkedin",
  enabled: apifyEnabled,
  async fetchJobs(_q: SavedSearchQuery): Promise<NormalizedJob[]> {
    if (!apifyEnabled()) return [];
    // TODO: call Apify LinkedIn jobs actor, normalize to NormalizedJob.
    // Must NOT drive any automated application flow.
    return [];
  },
};

export const apifyNaukriAdapter: JobSourceAdapter = {
  id: "apify_naukri",
  enabled: apifyEnabled,
  async fetchJobs(_q: SavedSearchQuery): Promise<NormalizedJob[]> {
    if (!apifyEnabled()) return [];
    // TODO: call Apify Naukri actor, normalize to NormalizedJob.
    return [];
  },
};
