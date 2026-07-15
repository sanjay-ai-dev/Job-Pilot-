import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestForSearches, loadActiveSearches } from "@/lib/pipeline/ingest";
import { matchForUser } from "@/lib/pipeline/match";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * 4-hourly ingestion cron (§6.3). Vercel Cron sends `Authorization: Bearer
 * $CRON_SECRET`. Ingest all active searches, then re-match every user who has
 * an active resume. Manual trigger allowed when CRON_SECRET is unset (dev).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const searches = await loadActiveSearches();
    const ingest = searches.length ? await ingestForSearches(searches) : { fetched: 0, upserted: 0 };

    // Re-match each user who has an active resume.
    const admin = createAdminClient();
    const { data: resumeUsers } = await admin
      .from("resumes")
      .select("user_id")
      .eq("is_active", true);
    const userIds = [...new Set((resumeUsers ?? []).map((r) => r.user_id as string))];

    let matched = 0;
    for (const uid of userIds) {
      try {
        const res = await matchForUser(uid);
        matched += res.matched;
      } catch (e) {
        console.error(`[cron] match failed for ${uid}:`, (e as Error).message);
      }
    }
    return NextResponse.json({ ok: true, ingest, users: userIds.length, matched });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
