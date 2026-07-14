import {
  AtsBreakdownSchema,
  MatchRerankItemSchema,
  EmailDraftSchema,
  type AtsBreakdown,
  type EmailDraft,
  type MatchRerankItem,
  type NormalizedJob,
  type RecruiterContact,
  type ResumeProfile,
} from "./types";
import { z } from "zod";
import { completeJson } from "./llm";
import { cosine, embedOne } from "./embeddings";
import {
  atsScoringPrompt,
  atsSystemPrompt,
  emailDraftPrompt,
  emailSystemPrompt,
  matchRerankPrompt,
} from "./prompts";

/** ATS scoring (§6.2 / §8.1) with a deterministic offline mock. */
export async function scoreResume(
  profile: ResumeProfile,
  targetRole: string,
  sampleJds: string[] = [],
): Promise<AtsBreakdown> {
  return completeJson(atsScoringPrompt({ profile, targetRole, sampleJds }), AtsBreakdownSchema, {
    system: atsSystemPrompt,
    model: "claude-sonnet-4-6",
    temperature: 0,
    mock: () => mockAts(profile, targetRole),
  });
}

/** Batched match rerank (§6.4 / §8.2) — one call for all jobs. */
export async function rerankMatches(
  profile: ResumeProfile,
  jobs: { job_id: string; title: string; company: string; jd_excerpt: string }[],
): Promise<MatchRerankItem[]> {
  return completeJson(matchRerankPrompt({ profile, jobs }), z.array(MatchRerankItemSchema), {
    system: "You rank job fit precisely and concisely.",
    model: "claude-sonnet-4-6",
    temperature: 0.1,
    mock: () => jobs.map((j) => mockMatch(profile, j)),
  });
}

/** Recruiter email draft (§6.6 / §8.3). */
export async function draftRecruiterEmail(
  contact: RecruiterContact,
  job: NormalizedJob,
  profile: ResumeProfile,
): Promise<EmailDraft> {
  return completeJson(emailDraftPrompt({ contact, job, profile }), EmailDraftSchema, {
    system: emailSystemPrompt,
    model: "claude-sonnet-4-6",
    temperature: 0.4,
    mock: () => mockEmail(contact, job, profile),
  });
}

/** Stage-1 similarity used by the matching engine + "quick match" score. */
export async function similarityScore(resumeText: string, jobText: string): Promise<number> {
  const [a, b] = [await embedOne(resumeText), await embedOne(jobText)];
  return cosine(a, b);
}

// ─── Deterministic offline mocks ─────────────────────────────────────────────

function overlap(a: string[], b: string[]): number {
  const bl = b.map((s) => s.toLowerCase());
  const hits = a.filter((s) => bl.includes(s.toLowerCase())).length;
  return a.length ? hits / a.length : 0;
}

export function mockAts(profile: ResumeProfile, targetRole: string): AtsBreakdown {
  const skills = [...profile.skills, ...profile.tools];
  const roleWords = targetRole.toLowerCase().split(/\s+/);
  const relevance = Math.min(100, 55 + skills.length * 3 + (profile.headline?.toLowerCase().includes(roleWords[0] ?? "") ? 15 : 0));
  const impact = Math.min(100, 40 + profile.roles.reduce((s, r) => s + r.achievements.length * 8, 0));
  const completeness = Math.min(
    100,
    40 + (profile.education.length ? 20 : 0) + (profile.projects.length ? 15 : 0) + (profile.certifications.length ? 10 : 0) + (profile.phone ? 5 : 0),
  );
  const keywords = Math.min(100, 45 + skills.length * 4);
  const formatting = 82;
  const ats = Math.round(
    keywords * 0.3 + relevance * 0.25 + impact * 0.2 + completeness * 0.15 + formatting * 0.1,
  );
  return AtsBreakdownSchema.parse({
    ats_score: ats,
    sections: {
      keywords: { score: keywords, missing: ["Docker", "CI/CD", "Kubernetes"].filter((k) => !skills.map((s) => s.toLowerCase()).includes(k.toLowerCase())).slice(0, 3) },
      impact: { score: impact, note: impact > 70 ? "Good use of quantified outcomes." : "Add metrics (%, ₹, scale) to more bullets." },
      formatting: { score: formatting, issues: ["Keep to a single column for ATS parsing."] },
      completeness: { score: completeness, missing_sections: [profile.projects.length ? "" : "Projects", profile.certifications.length ? "" : "Certifications"].filter(Boolean) },
      relevance: { score: relevance, note: `Alignment to "${targetRole}".` },
    },
    suggestions: [
      `Mirror "${targetRole}" keywords in your headline and top 3 bullets.`,
      "Quantify at least 2 more achievements with %, ₹ or user scale.",
      "Add a Projects section highlighting AI/RAG work relevant to the role.",
      "List tools (Docker, CI/CD) that appear in target JDs but are missing.",
      "Move the most relevant role to the top and trim older, off-target detail.",
    ],
  });
}

export function mockMatch(
  profile: ResumeProfile,
  job: { job_id: string; title: string; company: string; jd_excerpt: string; meta?: unknown },
): MatchRerankItem {
  const jobSkills = ((job as { meta?: { skills?: string[] } }).meta?.skills ?? []) as string[];
  const jdTokens = job.jd_excerpt.toLowerCase();
  const mySkills = [...profile.skills, ...profile.tools];
  const skillOverlap = jobSkills.length
    ? overlap(mySkills, jobSkills)
    : mySkills.filter((s) => jdTokens.includes(s.toLowerCase())).length / Math.max(mySkills.length, 1);
  const titleAlign = job.title.toLowerCase().includes((profile.headline ?? "").toLowerCase().split(" ")[0] ?? "zzz") ? 1 : 0.5;
  const score = Math.round(Math.min(100, 45 + skillOverlap * 45 + titleAlign * 10));
  const matched = mySkills.filter((s) => jdTokens.includes(s.toLowerCase())).slice(0, 2);
  const reason =
    matched.length > 0
      ? `Strong ${matched.join(" + ")} overlap; ${profile.total_experience_years ?? 4}y exp fits the ask.`
      : `Transferable skills match; ${profile.total_experience_years ?? 4}y experience aligns.`;
  return MatchRerankItemSchema.parse({ job_id: job.job_id, match_score: score, match_reason: reason.slice(0, 120) });
}

export function mockEmail(contact: RecruiterContact, job: NormalizedJob, profile: ResumeProfile): EmailDraft {
  const name = profile.name ?? "the candidate";
  const phone = profile.phone ?? "+91 90000 00000";
  const ach = profile.roles[0]?.achievements[0] ?? "shipped production systems at scale";
  const skill = profile.skills.slice(0, 2).join(" and ") || "full-stack engineering";
  return EmailDraftSchema.parse({
    subject: `${job.title} @ ${job.company} — ${skill} fit`.slice(0, 60),
    body: `Hi ${contact.name.split(" ")[0]},\n\nI'm applying for the ${job.title} role. In my last role I ${ach.replace(/^[-•]\s*/, "").toLowerCase()}, which maps directly to what ${job.company} is building with ${skill}.\n\n${job.company}'s pace and ownership culture is exactly the environment I do my best work in, and I'd bring ${profile.total_experience_years ?? 4} years across ${skill} on day one.\n\nCould we do a 15-min call this week? I'm reachable at ${phone}.\n\n${name}\n${phone}`,
  });
}
