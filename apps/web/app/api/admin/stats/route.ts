import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Diagnostics endpoint (CRON_SECRET-guarded) — returns row counts and a
 * per-user summary so we can debug the pipeline without needing DB access.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
