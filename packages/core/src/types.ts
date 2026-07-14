import { z } from "zod";

/** Canonical domain types shared across web + worker. Mirror the DB schema (§4). */

export type PlanId = "free" | "pro" | "power";

export type JobSourceId = "jsearch" | "adzuna" | "apify_linkedin" | "apify_naukri";

export type MatchStatus =
  | "new"
  | "saved"
  | "dismissed"
  | "applied"
  | "emailed"
  | "interview"
  | "offer"
  | "rejected";

/** Query passed to a job source adapter (derived from a saved_search). */
export interface SavedSearchQuery {
  id: string;
  roleQuery: string;
  locations: string[];
  remoteOk: boolean;
  minExperience?: number;
  maxExperience?: number;
}

/** Normalized job — the `jobs` table shape pre-insert (§5). */
export interface NormalizedJob {
  dedupeHash: string;
  source: JobSourceId;
  sourceJobId?: string;
  title: string;
  company: string;
  locations: string[];
  remote: boolean;
  description?: string;
  salaryMinLpa?: number | null;
  salaryMaxLpa?: number | null;
  applyUrl?: string;
  postedAt: string; // ISO
  meta?: { postedAtEstimated?: boolean; [k: string]: unknown };
}

/** Structured resume profile (§6.2). */
export const ResumeProfileSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  headline: z.string().nullable(),
  total_experience_years: z.number().nullable(),
  skills: z.array(z.string()),
  tools: z.array(z.string()),
  roles: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      start: z.string().nullable(),
      end: z.string().nullable(),
      achievements: z.array(z.string()),
    }),
  ),
  education: z.array(z.string()),
  certifications: z.array(z.string()),
  projects: z.array(z.string()),
});
export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;

/** ATS score output (§8.1). */
export const AtsSectionSchema = z.object({
  score: z.number().min(0).max(100),
});
export const AtsBreakdownSchema = z.object({
  ats_score: z.number().min(0).max(100),
  sections: z.object({
    keywords: z.object({ score: z.number(), missing: z.array(z.string()) }),
    impact: z.object({ score: z.number(), note: z.string() }),
    formatting: z.object({ score: z.number(), issues: z.array(z.string()) }),
    completeness: z.object({ score: z.number(), missing_sections: z.array(z.string()) }),
    relevance: z.object({ score: z.number(), note: z.string() }),
  }),
  suggestions: z.array(z.string()).length(5),
});
export type AtsBreakdown = z.infer<typeof AtsBreakdownSchema>;

/** Match rerank output (§8.2). */
export const MatchRerankItemSchema = z.object({
  job_id: z.string(),
  match_score: z.number().min(0).max(100),
  match_reason: z.string().max(160),
});
export type MatchRerankItem = z.infer<typeof MatchRerankItemSchema>;

/** Recruiter email draft (§8.3). */
export const EmailDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
});
export type EmailDraft = z.infer<typeof EmailDraftSchema>;

/** View models the web app renders (denormalized for the feed). */
export interface JobView extends NormalizedJob {
  id: string;
}

export interface MatchView {
  id: string;
  job: JobView;
  savedSearchId?: string;
  similarity: number;
  matchScore: number;
  matchReason: string;
  status: MatchStatus;
  createdAt: string;
}

export interface RecruiterContact {
  name: string;
  title: string;
  email?: string;
  phone?: string;
  source: "apollo" | "jd_text";
}
