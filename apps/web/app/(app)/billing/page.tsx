"use client";
import { CreditCard, Check, Zap, Mail, Wand2, Search, RefreshCw } from "lucide-react";
import { PLAN_LIMITS, type PlanId } from "@jobpilot/config";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const cap = (n: number) => (n === Infinity ? "Unlimited" : n === 0 ? "—" : String(n));

const PLAN_FEATURES: Record<PlanId, string[]> = {
  free: ["ATS score + top 5 fixes", "10 quick matches / day", "1 saved search", "Daily digest email"],
  pro: ["Unlimited matches + full AI rerank", "10 recruiter emails / day", "5 Assisted Applies / day", "3 saved searches", "5 re-scores / month"],
  power: ["Everything in Pro", "30 recruiter emails / day", "20 Assisted Applies / day", "5 saved searches", "Unlimited re-scores"],
};

export default function BillingPage() {
  const { plan, setPlan, emailsSentToday, assistedAppliesToday, pushToast } = useApp();
  const limits = PLAN_LIMITS[plan];

  function choose(p: PlanId) {
    if (p === plan) return;
    // Demo: stands in for a Razorpay subscription checkout + webhook (§6.9).
    setPlan(p);
    pushToast(p === "free" ? "Downgraded to Free" : `Upgraded to ${PLAN_LIMITS[p].label} — limits applied instantly`);
  }

  return (
    <div className="container max-w-5xl space-y-6 py-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <CreditCard className="h-6 w-6 text-primary" /> Billing & Plan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Server-enforced limits. Change plan any time — no lock-in.</p>
      </div>

      {/* Usage today */}
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold">Today&apos;s usage · {limits.label} plan</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <UsageStat icon={Mail} label="Recruiter emails" used={emailsSentToday} total={limits.emailsPerDay} />
          <UsageStat icon={Wand2} label="Assisted Applies" used={assistedAppliesToday} total={limits.assistedAppliesPerDay} />
          <UsageStat icon={Search} label="Saved searches" used={plan === "free" ? 1 : plan === "pro" ? 2 : 3} total={limits.savedSearches} />
        </div>
      </Card>

      {/* Plans */}
      <div className="grid gap-5 lg:grid-cols-3">
        {(Object.keys(PLAN_LIMITS) as PlanId[]).map((p) => {
          const l = PLAN_LIMITS[p];
          const current = p === plan;
          const highlight = p === "pro";
          return (
            <Card
              key={p}
              className={cn(
                "relative flex flex-col p-6",
                highlight && "border-primary ring-1 ring-primary/30",
                current && "ring-2 ring-primary",
              )}
            >
              {current && (
                <Badge variant="success" className="absolute -top-3 left-6">Current plan</Badge>
              )}
              {highlight && !current && (
                <Badge variant="default" className="absolute -top-3 left-6">Popular</Badge>
              )}
              <h3 className="text-lg font-semibold">{l.label}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">₹{l.priceInr}</span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {PLAN_FEATURES[p].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-6"
                variant={current ? "outline" : highlight ? "gradient" : "default"}
                disabled={current}
                onClick={() => choose(p)}
              >
                {current ? "Active" : l.priceInr === 0 ? "Downgrade" : (<><Zap className="h-4 w-4" /> Upgrade</>)}
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <RefreshCw className="h-3.5 w-3.5" />
        Payments run through Razorpay subscriptions. A webhook updates your plan &amp; validity — limits flip immediately.
      </div>
    </div>
  );
}

function UsageStat({
  icon: Icon,
  label,
  used,
  total,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  used: number;
  total: number;
}) {
  const pct = total === Infinity ? (used > 0 ? 20 : 4) : total === 0 ? 100 : (used / total) * 100;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <span className="text-sm font-medium tabular-nums">
          {used} / {cap(total)}
        </span>
      </div>
      <Progress value={pct} indicatorClassName={total === 0 ? "bg-muted-foreground/30" : undefined} />
    </div>
  );
}
