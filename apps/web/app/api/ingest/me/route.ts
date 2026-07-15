import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { authEnabled } from "@/lib/supabase/config";
import { ingestForSearches, loadActiveSearches } from "@/lib/pipeline/ingest";
import { matchForUser } from "@/lib/pipeline/match";

export const runtime = "nodejs";
export const maxDuration = 60;

/** On-demand first fetch (§6.1) — warms the current user's feed after onboarding. */
export async function POST() {
  if (!authEnabled) return NextResponse.json({ error: "not available" }, { status: 400 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const searches = await loadActiveSearches(user.id);
    const ingest = searches.length ? await ingestForSearches(searches) : { fetched: 0, upserted: 0 };
    const match = await matchForUser(user.id);
    return NextResponse.json({ ok: true, ingest, match });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
