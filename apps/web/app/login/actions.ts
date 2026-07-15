"use server";
import { ensureProfile } from "@/lib/profile";

/** Create the profiles row for the just-signed-in user (idempotent, best-effort). */
export async function bootstrapProfile(): Promise<void> {
  await ensureProfile().catch(() => {});
}
