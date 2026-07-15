import { NextResponse, type NextRequest } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";
import { authEnabled } from "@/lib/supabase/config";

const VALID = new Set(["new", "saved", "dismissed", "applied", "emailed", "interview", "offer", "rejected"]);

/** Persist a feed action to matches.status (RLS-scoped to the user). */
export async function POST(req: NextRequest) {
  if (!authEnabled) return NextResponse.json({ ok: false }, { status: 400 });
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { matchId, status } = (await req.json()) as { matchId?: string; status?: string };
  if (!matchId || !status || !VALID.has(status)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ status, status_changed_at: new Date().toISOString() })
    .eq("id", matchId)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
