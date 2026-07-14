import { generateJobs, SAMPLE_PROFILE } from "@jobpilot/core/mock";
import { mockMatch, mockAts } from "@jobpilot/core";
import type { MatchView, JobView, RecruiterContact } from "@jobpilot/core/types";

/**
 * Demo feed builder — runs entirely on @jobpilot/core mock functions (no keys).
 * This mirrors what the ingestion + matching worker would persist to `matches`,
 * so the UI is wired to the exact same shapes the real pipeline produces.
 */
export const TARGET_ROLE = "AI Engineer";

export function buildDemoFeed(): MatchView[] {
  const jobsA = generateJobs(
    { id: "s1", roleQuery: "AI Engineer", locations: ["Bengaluru", "Hyderabad", "Remote"], remoteOk: true },
    { source: "jsearch", seed: 42, count: 22 },
  );
  const jobsB = generateJobs(
    { id: "s1", roleQuery: "Full Stack Developer", locations: ["Bengaluru", "Pune", "Remote"], remoteOk: true },
    { source: "adzuna", seed: 7, count: 14 },
  );

  const seen = new Set<string>();
  const all = [...jobsA, ...jobsB].filter((j) => {
    if (seen.has(j.dedupeHash)) return false; // dedupe (§5)
    seen.add(j.dedupeHash);
    return true;
  });

  const matches: MatchView[] = all.map((job, i): MatchView => {
    const jv: JobView = { ...job, id: `job-${i}` };
    const m = mockMatch(SAMPLE_PROFILE, {
      job_id: jv.id,
      title: job.title,
      company: job.company,
      jd_excerpt: job.description ?? "",
      meta: job.meta,
    });
    return {
      id: `match-${i}`,
      job: jv,
      similarity: Math.min(0.98, 0.35 + m.match_score / 140),
      matchScore: m.match_score,
      matchReason: m.match_reason,
      status: "new",
      createdAt: job.postedAt,
    };
  });

  // Newest-first is the hard product requirement (§6.5).
  return matches.sort((a, b) => +new Date(b.job.postedAt) - +new Date(a.job.postedAt));
}

export const DEMO_ATS = mockAts(SAMPLE_PROFILE, TARGET_ROLE);
export const DEMO_PROFILE = SAMPLE_PROFILE;

/** Mock recruiter contact lookup (stands in for Apollo, §6.6). */
export function findRecruiterContact(company: string): RecruiterContact | null {
  // Simulate ~78% hit rate deterministically.
  const miss = company.length % 9 === 0;
  if (miss) return null;
  const firsts = ["Ananya", "Rohit", "Kavya", "Arjun", "Neha", "Vikram", "Sneha"];
  const lasts = ["Iyer", "Nair", "Reddy", "Gupta", "Menon", "Rao", "Bose"];
  const h = company.length;
  const name = `${firsts[h % firsts.length]} ${lasts[(h * 3) % lasts.length]}`;
  return {
    name,
    title: h % 2 === 0 ? "Talent Acquisition Lead" : "Senior Recruiter",
    email: `${name.split(" ")[0]!.toLowerCase()}@${company.toLowerCase().replace(/[^a-z]/g, "")}.com`,
    phone: h % 3 === 0 ? `+91 ${90000 + (h % 9999)} ${10000 + (h % 89999)}` : undefined,
    source: "apollo",
  };
}
