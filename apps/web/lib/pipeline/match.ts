import {
  embed,
  embedOne,
  cosine,
  canonicalProfileString,
  rerankMatches,
  type ResumeProfile,
} from "@jobpilot/core";
import { createAdminClient } from "@/lib/supabase/admin";

interface JobRow {
  id: string;
  title: string;
  company: string;
  description: string | null;
}

const jobText = (j: JobRow) => `${j.title} at ${j.company}. ${j.description ?? ""}`.slice(0, 1500);

/**
 * Matching engine (§6.4): stage 1 cosine (resume vs recent jobs, top 30),
 * stage 2 a single batched Gemini rerank → match_score + reason. Upserts new
 * matches, never re-ranking an existing pair. Embeddings computed in-process.
 */
export async function matchForUser(userId: string): Promise<{ matched: number; note?: string }> {
  const admin = createAdminClient();

  const { data: resume } = await admin
    .from("resumes")
    .select("parsed")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  const profile = resume?.parsed as ResumeProfile | undefined;
  if (!profile) return { matched: 0, note: "no active resume" };

  // Candidate jobs: freshest 120, minus ones already matched for this user.
  const [{ data: jobs }, { data: existing }] = await Promise.all([
    admin
      .from("jobs")
      .select("id, title, company, description")
      .order("posted_at", { ascending: false })
      .limit(120),
    admin.from("matches").select("job_id").eq("user_id", userId),
  ]);
  const seen = new Set((existing ?? []).map((m) => m.job_id));
  const candidates = ((jobs ?? []) as JobRow[]).filter((j) => !seen.has(j.id));
  if (!candidates.length) return { matched: 0, note: "no new jobs" };

  // Stage 1 — cosine similarity.
  const resumeVec = await embedOne(canonicalProfileString(profile));
  const jobVecs = await embed(candidates.map(jobText));
  const ranked = candidates
    .map((job, i) => ({ job, sim: cosine(resumeVec, jobVecs[i] ?? []) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, 30);
  if (!ranked.length) return { matched: 0 };

  // Stage 2 — one batched LLM rerank for all candidates.
  let rer: Awaited<ReturnType<typeof rerankMatches>> = [];
  try {
    rer = await rerankMatches(
      profile,
      ranked.map((r) => ({
        job_id: r.job.id,
        title: r.job.title,
        company: r.job.company,
        jd_excerpt: r.job.description ?? "",
      })),
    );
  } catch (e) {
    console.error("[match] rerank failed, falling back to similarity:", (e as Error).message);
  }
  const byId = new Map(rer.map((r) => [r.job_id, r]));

  const rows = ranked.map(({ job, sim }) => {
    const r = byId.get(job.id);
    return {
      user_id: userId,
      job_id: job.id,
      similarity: sim,
      match_score: r?.match_score ?? Math.round(Math.min(100, 40 + sim * 60)),
      match_reason: r?.match_reason ?? "Skills and experience alignment.",
      status: "new",
    };
  });

  const { error } = await admin.from("matches").upsert(rows, {
    onConflict: "user_id,job_id",
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`matches upsert: ${error.message}`);
  return { matched: rows.length };
}
