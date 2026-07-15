import { AppShell } from "@/components/app-shell";
import { authEnabled } from "@/lib/supabase/config";
import { getProfile } from "@/lib/profile";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Real user when auth is on; demo identity otherwise (mock-first, see D1).
  const profile = authEnabled ? await getProfile() : null;
  const user = profile
    ? { name: profile.full_name ?? "Member", city: profile.city ?? "India" }
    : { name: "Priya Sharma", city: "Bengaluru" };

  return (
    <AppShell user={user} authEnabled={authEnabled}>
      {children}
    </AppShell>
  );
}
