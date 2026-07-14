"use client";
import Link from "next/link";
import { Sparkles, Check, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/store";

const COPY = {
  email: {
    title: "Recruiter outreach is a Pro feature",
    desc: "Send AI-drafted emails to the right recruiter, straight from your verified address.",
  },
  assisted: {
    title: "Assisted Apply is a Pro feature",
    desc: "Auto-prep a tailored resume, cover letter, and screening answers — you just review and submit.",
  },
} as const;

export function PaywallModal({
  feature,
  onClose,
}: {
  feature: "email" | "assisted" | null;
  onClose: () => void;
}) {
  const setPlan = useApp((s) => s.setPlan);
  const open = feature !== null;
  const copy = feature ? COPY[feature] : COPY.email;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <div className="mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-lg shadow-primary/30">
          <Zap className="h-6 w-6" />
        </div>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.desc}</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">Pro</span>
            <span><span className="text-2xl font-bold">₹499</span><span className="text-sm text-muted-foreground">/mo</span></span>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {["Unlimited matches + full AI rerank", "10 recruiter emails / day", "5 Assisted Applies / day", "3 saved searches"].map(
              (f) => (
                <li key={f} className="flex items-center gap-2 text-muted-foreground">
                  <Check className="h-4 w-4 text-success" /> {f}
                </li>
              ),
            )}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="gradient"
            onClick={() => {
              // Demo: simulate a successful Razorpay upgrade.
              setPlan("pro");
              onClose();
            }}
          >
            <Sparkles className="h-4 w-4" /> Upgrade to Pro (demo)
          </Button>
          <Button variant="ghost" asChild>
            <Link href="/billing" onClick={onClose}>Compare all plans</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
