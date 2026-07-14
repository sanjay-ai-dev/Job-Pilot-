"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  FileText,
  KanbanSquare,
  CreditCard,
  Menu,
  X,
  Check,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, initials } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { PLAN_LIMITS, type PlanId } from "@jobpilot/config";

const NAV = [
  { href: "/dashboard", label: "Job Feed", icon: LayoutGrid },
  { href: "/resume", label: "Resume & ATS", icon: FileText },
  { href: "/tracker", label: "Tracker", icon: KanbanSquare },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const plan = useApp((s) => s.plan);

  return (
    <div className="min-h-screen bg-muted/20">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-5">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="space-y-1 p-3">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute inset-x-3 bottom-4">
          <PlanCard />
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b glass px-4 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <Badge variant={plan === "free" ? "outline" : "success"} className="capitalize">
              {PLAN_LIMITS[plan].label} plan
            </Badge>
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary to-violet-600 text-xs font-bold text-white">
                {initials("Priya Sharma")}
              </div>
              <div className="hidden text-sm sm:block">
                <div className="font-medium leading-tight">Priya Sharma</div>
                <div className="text-xs text-muted-foreground">Bengaluru</div>
              </div>
            </div>
          </div>
        </header>
        <main className="animate-fade-up">{children}</main>
      </div>

      <ToastHost />
    </div>
  );
}

function PlanCard() {
  const { plan, setPlan } = useApp();
  const plans: PlanId[] = ["free", "pro", "power"];
  return (
    <div className="rounded-xl border bg-gradient-to-br from-accent/60 to-card p-3.5">
      <div className="text-xs font-semibold">Demo: switch plan</div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">See how limits & paywalls change.</p>
      <div className="mt-2.5 grid grid-cols-3 gap-1">
        {plans.map((p) => (
          <button
            key={p}
            onClick={() => setPlan(p)}
            className={cn(
              "rounded-md px-1 py-1.5 text-[11px] font-medium capitalize transition-colors",
              plan === p ? "bg-primary text-primary-foreground" : "bg-background hover:bg-secondary",
            )}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[60] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex animate-fade-up items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 shadow-lg"
        >
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-success" />
            {t.message}
          </div>
          {t.action && (
            <button
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => {
                t.action!.run();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
