"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Check, MapPin, Briefcase, Loader2, Radar } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saveOnboarding } from "./actions";

const ROLES = ["AI Engineer", "Full Stack Developer", "Backend Engineer", "Frontend Engineer", "Data Scientist", "Product Manager", "DevOps Engineer", "ML Engineer"];
const CITIES = ["Bengaluru", "Hyderabad", "Pune", "Gurugram", "Mumbai", "Chennai", "Noida", "Remote"];
const EXPERIENCE = ["0–2 yrs", "2–4 yrs", "4–7 yrs", "7–10 yrs", "10+ yrs"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [roles, setRoles] = useState<string[]>(["AI Engineer"]);
  const [cities, setCities] = useState<string[]>(["Bengaluru", "Remote"]);
  const [exp, setExp] = useState("4–7 yrs");
  const [ctc, setCtc] = useState("");
  const [notice, setNotice] = useState("30");
  const [warming, setWarming] = useState(false);

  function toggle<T>(arr: T[], set: (v: T[]) => void, v: T, max = Infinity) {
    if (arr.includes(v)) set(arr.filter((x) => x !== v));
    else if (arr.length < max) set([...arr, v]);
  }

  async function finish() {
    // Persist to profiles + saved_searches, then run the first fetch (§6.1) so
    // the feed is warm on arrival. Both are no-ops/fast in the public demo.
    setWarming(true);
    try {
      await saveOnboarding({ roles, cities, experience: exp, expectedCtc: ctc, notice });
      await fetch("/api/ingest/me", { method: "POST" });
    } catch {
      /* best-effort — land on the feed regardless */
    }
    router.push("/dashboard");
  }

  const canNext = step === 0 ? roles.length > 0 : step === 1 ? cities.length > 0 : true;

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="flex h-16 items-center justify-between border-b glass px-6">
        <Link href="/"><Logo /></Link>
        <span className="text-sm text-muted-foreground">Step {Math.min(step + 1, 3)} of 3</span>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {warming ? (
            <WarmingUp />
          ) : (
            <>
              {/* Progress */}
              <div className="mb-8 flex gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-secondary")} />
                ))}
              </div>

              <div className="animate-fade-up rounded-2xl border bg-card p-8 shadow-sm">
                {step === 0 && (
                  <Step title="What roles are you targeting?" subtitle="Pick up to 3. We'll build a feed for each.">
                    <div className="flex flex-wrap gap-2">
                      {ROLES.map((r) => (
                        <Chip key={r} active={roles.includes(r)} onClick={() => toggle(roles, setRoles, r, 3)}>
                          {r}
                        </Chip>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{roles.length}/3 selected</p>
                  </Step>
                )}

                {step === 1 && (
                  <Step title="Where do you want to work?" subtitle="Select all that apply.">
                    <div className="flex flex-wrap gap-2">
                      {CITIES.map((c) => (
                        <Chip key={c} active={cities.includes(c)} onClick={() => toggle(cities, setCities, c)}>
                          <MapPin className="h-3.5 w-3.5" /> {c}
                        </Chip>
                      ))}
                    </div>
                  </Step>
                )}

                {step === 2 && (
                  <Step title="A few details" subtitle="This tunes your match scores and salary fit.">
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium">Experience</label>
                        <div className="flex flex-wrap gap-2">
                          {EXPERIENCE.map((e) => (
                            <Chip key={e} active={exp === e} onClick={() => setExp(e)}>
                              <Briefcase className="h-3.5 w-3.5" /> {e}
                            </Chip>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-2 block text-sm font-medium">Expected CTC (LPA)</label>
                          <Input placeholder="e.g. 35" value={ctc} onChange={(e) => setCtc(e.target.value)} inputMode="numeric" />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-medium">Notice period (days)</label>
                          <Input placeholder="30" value={notice} onChange={(e) => setNotice(e.target.value)} inputMode="numeric" />
                        </div>
                      </div>
                    </div>
                  </Step>
                )}

                <div className="mt-8 flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  {step < 2 ? (
                    <Button variant="gradient" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
                      Continue <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button variant="gradient" onClick={finish}>
                      Build my feed <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-95",
        active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary",
      )}
    >
      {active && <Check className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

function WarmingUp() {
  return (
    <div className="flex animate-fade-up flex-col items-center gap-4 rounded-2xl border bg-card p-12 text-center shadow-sm">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
        <div className="relative grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-primary to-violet-600 text-white">
          <Radar className="h-8 w-8" />
        </div>
      </div>
      <h1 className="text-xl font-bold">Warming up your feed…</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        We&apos;re scanning legitimate job sources and ranking matches for you. This usually takes about a minute.
      </p>
      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Fetching & scoring jobs
      </div>
    </div>
  );
}
