import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestForSearches, loadActiveSearches } from "@/lib/pipeline/ingest";
import { matchForUser } from "@/lib/pipeline/match";

export const runtime = "nodejs";
export const maxDuration = 120;

function authed(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

/**
 * Diagnostics endpoint (CRON_SECRET-guarded) — returns row counts and a
 * per-user summary so we can debug the pipeline without needing DB access.
 */
export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const admin = createAdminClient();
    const counts = await Promise.all([
      admin.from("profiles").select("id", { count: "exact", head: true }),
      admin.from("resumes").select("id", { count: "exact", head: true }),
      admin.from("resumes").select("id", { count: "exact", head: true }).eq("is_active", true),
      admin.from("saved_searches").select("id", { count: "exact", head: true }),
      admin.from("jobs").select("id", { count: "exact", head: true }),
      admin.from("matches").select("id", { count: "exact", head: true }),
    ]);

    const [{ data: resumes }, { data: searches }, { data: recentEvents }] = await Promise.all([
      admin.from("resumes").select("user_id, version, ats_score, is_active, created_at").order("created_at", { ascending: false }).limit(5),
      admin.from("saved_searches").select("user_id, role_query, locations, is_active").limit(10),
      admin.from("events").select("name, props, created_at").order("created_at", { ascending: false }).limit(10),
    ]);

    return NextResponse.json({
      ok: true,
      counts: {
        profiles: counts[0].count,
        resumes_total: counts[1].count,
        resumes_active: counts[2].count,
        saved_searches: counts[3].count,
        jobs: counts[4].count,
        matches: counts[5].count,
      },
      recent_resumes: resumes,
      saved_searches: searches,
      recent_events: recentEvents,
      env_flags: {
        auth_enabled: process.env.NEXT_PUBLIC_AUTH_ENABLED,
        has_openrouter: Boolean(process.env.OPENROUTER_API_KEY),
        has_adzuna: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
        has_jsearch: Boolean(process.env.RAPIDAPI_KEY),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/**
 * Seed a saved_search for a user + trigger ingestion + matching. Body:
 * { userId, role, locations?: string[] }. CRON_SECRET-guarded.
 */
export async function POST(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { userId, role, locations = [] } = (await req.json()) as {
    userId?: string;
    role?: string;
    locations?: string[];
  };
  if (!userId || !role) return NextResponse.json({ error: "userId + role required" }, { status: 400 });

  const admin = createAdminClient();
  try {
    // Ensure the saved_search exists (upsert-like: skip if the exact role already exists).
    const { data: existing } = await admin
      .from("saved_searches")
      .select("id")
      .eq("user_id", userId)
      .eq("role_query", role)
      .maybeSingle();
    if (!existing) {
      await admin.from("saved_searches").insert({
        user_id: userId,
        role_query: role,
        locations,
        remote_ok: true,
      });
    }

    const searches = await loadActiveSearches(userId);
    const ingest = searches.length ? await ingestForSearches(searches) : { fetched: 0, upserted: 0 };
    const match = await matchForUser(userId);
    return NextResponse.json({ ok: true, seeded_role: role, ingest, match });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
