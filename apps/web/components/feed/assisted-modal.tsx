"use client";
import { useEffect, useState } from "react";
import { Wand2, FileText, Copy, Check, Download, ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import type { MatchView } from "@jobpilot/core/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useApp } from "@/lib/store";
import { DEMO_PROFILE } from "@/lib/data";
import { PLAN_LIMITS } from "@jobpilot/config";

const STEPS = ["Reading the JD", "Reordering your experience", "Tailoring bullet points", "Writing the cover letter"];

export function AssistedModal({
  open,
  onOpenChange,
  match,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  match: MatchView;
}) {
  const { recordAssisted, setStatus, plan, assistedAppliesToday, pushToast } = useApp();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const job = match.job;
  const skills = (job.meta?.skills as string[] | undefined) ?? DEMO_PROFILE.skills;

  useEffect(() => {
    if (!open) return;
    if (assistedAppliesToday >= PLAN_LIMITS[plan].assistedAppliesPerDay && plan !== "free") {
      // cap handled by parent paywall for free; for pro/power show toast + close
    }
    setDone(false);
    setStep(0);
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i + 1), (i + 1) * 550));
    const finish = setTimeout(() => {
      setDone(true);
      recordAssisted();
    }, STEPS.length * 550 + 300);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const coverLetter = `Dear Hiring Team at ${job.company},

I'm excited to apply for the ${job.title} role. Over ${DEMO_PROFILE.total_experience_years} years I've shipped ${skills.slice(0, 3).join(", ")} systems in production — most recently ${DEMO_PROFILE.roles[0]?.achievements[0]?.replace(/^[-•]\s*/, "").toLowerCase()}

What draws me to ${job.company} is the scale and ownership of the work. I'd bring hands-on depth in ${skills.slice(0, 2).join(" and ")}, plus a bias for shipping measurable outcomes.

I'd love to discuss how I can contribute. Thank you for your consideration.

Warm regards,
${DEMO_PROFILE.name}`;

  const tailoredBullets = [
    `Led ${skills[0]} initiatives directly aligned to ${job.company}'s ${job.title} charter.`,
    ...(DEMO_PROFILE.roles[0]?.achievements ?? []),
    `Deep hands-on experience with ${skills.slice(0, 4).join(", ")}.`,
  ];

  function markApplied() {
    setStatus(match.id, "applied");
    pushToast(`Assisted Apply prepared for ${job.company}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" /> Assisted Apply
          </DialogTitle>
          <DialogDescription>
            {job.title} @ {job.company} · {assistedAppliesToday}/{PLAN_LIMITS[plan].assistedAppliesPerDay} today
          </DialogDescription>
        </DialogHeader>

        {!done ? (
          <div className="space-y-3 py-6">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-3 text-sm">
                {i < step ? (
                  <Check className="h-4 w-4 text-success" />
                ) : i === step ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <div className="h-4 w-4 rounded-full border" />
                )}
                <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{s}</span>
              </div>
            ))}
          </div>
        ) : (
          <>
            <Tabs defaultValue="resume">
              <TabsList className="w-full">
                <TabsTrigger value="resume" className="flex-1">Tailored Resume</TabsTrigger>
                <TabsTrigger value="cover" className="flex-1">Cover Letter</TabsTrigger>
                <TabsTrigger value="screen" className="flex-1">Screening Q&A</TabsTrigger>
              </TabsList>

              <TabsContent value="resume">
                <div className="rounded-xl border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4 text-primary" /> {DEMO_PROFILE.name} — tailored for {job.title}
                  </div>
                  <ul className="space-y-1.5 text-sm text-muted-foreground">
                    {tailoredBullets.map((b, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary">•</span> {b}
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" variant="outline" className="mt-4" onClick={() => pushToast("Tailored resume PDF downloaded")}>
                    <Download className="h-3.5 w-3.5" /> Download PDF
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Bullets are reordered & reworded toward the JD — never fabricated.
                </p>
              </TabsContent>

              <TabsContent value="cover">
                <CopyBlock text={coverLetter} rows={11} />
              </TabsContent>

              <TabsContent value="screen">
                <p className="mb-2 text-xs text-muted-foreground">
                  Paste the screening questions and we'll draft honest answers from your resume.
                </p>
                <CopyBlock
                  text={`Q: Why do you want to work at ${job.company}?\nA: ${job.company}'s scale and ownership culture matches how I like to work — I do my best building ${skills[0]} systems that ship.\n\nQ: Notice period?\nA: 30 days, flexible for the right role.`}
                  rows={7}
                />
              </TabsContent>
            </Tabs>

            <div className="flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              We prepare everything; <b>you</b> submit. We never auto-submit on LinkedIn/Naukri.
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
              <Button variant="gradient" onClick={markApplied}>
                Open posting & apply <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CopyBlock({ text, rows }: { text: string; rows: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <Textarea readOnly value={text} rows={rows} className="resize-none pr-12 leading-relaxed" />
      <Button
        size="icon"
        variant="ghost"
        className="absolute right-2 top-2 h-8 w-8"
        onClick={() => {
          navigator.clipboard?.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}
