import { NextResponse, type NextRequest } from "next/server";
import { parseResume, scoreResume, canonicalProfileString, embedOne } from "@jobpilot/core";
import { getUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authEnabled } from "@/lib/supabase/config";
import { ingestForSearches, loadActiveSearches } from "@/lib/pipeline/ingest";
import { matchForUser } from "@/lib/pipeline/match";
import { loadTopRecs } from "@/lib/pipeline/recs";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  if (!authEnabled) {
    return NextResponse.json({ error: "Resume upload requires sign-in (not available in demo)" }, { status: 400 });
  }
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 5 MB" }, { status: 400 });

  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf") || file.type === "application/pdf";
  const isDocx = name.endsWith(".docx") || file.type.includes("word");
  if (!isPdf && !isDocx) return NextResponse.json({ error: "Upload a PDF or DOCX file" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());

  // 1) Extract text
  let text = "";
  try {
    if (isPdf) {
      const { getDocumentProxy, extractText } = await import("unpdf");
      const doc = await getDocumentProxy(bytes);
      text = (await extractText(doc, { mergePages: true })).text;
    } else {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
    }
  } catch {
    return NextResponse.json({ error: "Couldn't read that file. Try re-exporting it." }, { status: 422 });
  }
  if (text.trim().length < 100) {
    return NextResponse.json(
      { error: "This looks like a scanned/image PDF. Please upload a text-based PDF or DOCX." },
      { status: 422 },
    );
  }

  const admin = createAdminClient();

  // 2) Target role from the user's first saved search (else a sensible default)
  const { data: search } = await admin
    .from("saved_searches")
    .select("role_query")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const targetRole = (form.get("targetRole") as string) || search?.role_query || "Software Engineer";

  // 3) AI: parse + score (OpenRouter when configured, else deterministic mock)
  const profile = await parseResume(text);
  const ats = await scoreResume(profile, targetRole);
  let embedding: number[] | null = null;
  try {
    embedding = await embedOne(canonicalProfileString(profile));
  } catch {
    embedding = null;
  }

  // 4) Versioning + storage
  const { data: last } = await admin
    .from("resumes")
    .select("version")
    .eq("user_id", user.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const ext = isPdf ? "pdf" : "docx";
  const storagePath = `${user.id}/v${version}.${ext}`;

  await ensureBucket(admin);
  const { error: upErr } = await admin.storage
    .from("resumes")
    .upload(storagePath, bytes, { contentType: file.type || (isPdf ? "application/pdf" : undefined), upsert: true });
  if (upErr) return NextResponse.json({ error: `Storage: ${upErr.message}` }, { status: 500 });

  // 5) Persist (previous version deactivated)
  await admin.from("resumes").update({ is_active: false }).eq("user_id", user.id).eq("is_active", true);
  const base = {
    user_id: user.id,
    version,
    storage_path: storagePath,
    raw_text: text.slice(0, 50000),
    parsed: profile,
    ats_score: ats.ats_score,
    ats_breakdown: ats,
    is_active: true,
  };
  let { error: insErr } = await admin
    .from("resumes")
    .insert({ ...base, embedding: embedding ? `[${embedding.join(",")}]` : null });
  if (insErr && embedding) {
    // Retry without the vector so the ATS result still saves on any pgvector quirk.
    ({ error: insErr } = await admin.from("resumes").insert(base));
  }
  if (insErr) return NextResponse.json({ error: `DB: ${insErr.message}` }, { status: 500 });

  await admin.from("events").insert({ user_id: user.id, name: "resume_scored", props: { version, ats: ats.ats_score, targetRole } });

  // Run the match pipeline inline so recommended jobs are ready by the time the
  // ATS score is shown. Ingestion is best-effort (skip if it takes too long).
  try {
    let searches = await loadActiveSearches(user.id);
    // No onboarding yet? Auto-seed a default saved_search from the resume so
    // ingestion has something to pull. Locations left empty on purpose so the
    // ingest fan-out searches across all major India hubs.
    if (!searches.length) {
      const guessed = profile.headline || profile.roles[0]?.title || targetRole;
      await admin.from("saved_searches").insert({
        user_id: user.id,
        role_query: guessed,
        locations: [],
        remote_ok: true,
      });
      searches = await loadActiveSearches(user.id);
    }
    if (searches.length) await ingestForSearches(searches);
    await matchForUser(user.id);
  } catch (e) {
    console.error("[resume/process] recs pipeline (non-fatal):", (e as Error).message);
  }
  const recs = await loadTopRecs(user.id, 5).catch(() => []);

  return NextResponse.json({
    version,
    targetRole,
    ats_score: ats.ats_score,
    ats_breakdown: ats,
    skills: profile.skills,
    fileName: file.name,
    recs,
  });
}

async function ensureBucket(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.storage.getBucket("resumes");
  if (!data) {
    await admin.storage.createBucket("resumes", {
      public: false,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    });
  }
}
