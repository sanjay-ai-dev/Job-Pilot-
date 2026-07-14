"use client";
import { useState } from "react";
import { UploadCloud, FileText, Lightbulb, CheckCircle2, History, Loader2, Target } from "lucide-react";
import { DEMO_ATS, DEMO_PROFILE, TARGET_ROLE } from "@/lib/data";
import { ScoreRing } from "@/components/score-ring";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SECTION_META: Record<string, { label: string; weight: number }> = {
  keywords: { label: "Keywords", weight: 30 },
  relevance: { label: "Role relevance", weight: 25 },
  impact: { label: "Impact & metrics", weight: 20 },
  completeness: { label: "Completeness", weight: 15 },
  formatting: { label: "Formatting", weight: 10 },
};

export default function ResumePage() {
  const [rescoring, setRescoring] = useState(false);
  const [score, setScore] = useState(DEMO_ATS.ats_score);
  const ats = DEMO_ATS;

  function rescore() {
    setRescoring(true);
    setTimeout(() => {
      setScore(Math.min(100, DEMO_ATS.ats_score + 6));
      setRescoring(false);
    }, 1400);
  }

  return (
    <div className="container max-w-4xl space-y-5 py-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FileText className="h-6 w-6 text-primary" /> Resume & ATS Score
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Target className="h-3.5 w-3.5" /> Scored against your target role: <span className="font-medium text-foreground">{TARGET_ROLE}</span>
        </p>
      </div>

      {/* Score + upload */}
      <div className="grid gap-5 md:grid-cols-[280px_1fr]">
        <Card className="flex flex-col items-center justify-center gap-3 p-6">
          {rescoring ? (
            <div className="flex h-[132px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScoreRing value={score} label="ATS Score" />
          )}
          <Badge variant={score >= 75 ? "success" : "default"}>
            {score >= 75 ? "Interview-ready" : score >= 55 ? "Good, improvable" : "Needs work"}
          </Badge>
          <Button variant="outline" size="sm" className="w-full" onClick={rescore} disabled={rescoring}>
            {rescoring ? "Re-scoring…" : "Re-score resume"}
          </Button>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-medium">Priya_Sharma_Resume_v2.pdf</div>
                <div className="text-xs text-muted-foreground">Active version · uploaded today</div>
              </div>
            </div>
            <Badge variant="secondary">v2</Badge>
          </div>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-center transition-colors hover:border-primary hover:bg-accent/30">
            <UploadCloud className="h-7 w-7 text-muted-foreground" />
            <span className="text-sm font-medium">Drop a new resume or click to upload</span>
            <span className="text-xs text-muted-foreground">PDF or DOCX · max 5 MB · scanned PDFs not supported</span>
            <input type="file" accept=".pdf,.docx" className="hidden" onChange={rescore} />
          </label>
        </Card>
      </div>

      {/* Section breakdown */}
      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold">Section breakdown</h2>
        <div className="space-y-4">
          {Object.entries(SECTION_META).map(([key, meta]) => {
            const s = (ats.sections as Record<string, { score: number }>)[key]!;
            return (
              <div key={key}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    {meta.label}
                    <span className="text-xs font-normal text-muted-foreground">weight {meta.weight}%</span>
                  </span>
                  <span className={cn("font-semibold tabular-nums", s.score >= 70 ? "text-success" : s.score >= 45 ? "text-primary" : "text-warning-foreground")}>
                    {s.score}
                  </span>
                </div>
                <Progress
                  value={s.score}
                  indicatorClassName={s.score >= 70 ? "bg-success" : s.score >= 45 ? "bg-primary" : "bg-warning"}
                />
              </div>
            );
          })}
        </div>
      </Card>

      {/* Suggestions */}
      <Card className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="h-4 w-4 text-warning" /> Top 5 fixes (ordered by impact)
        </h2>
        <ol className="space-y-3">
          {ats.suggestions.map((sug, i) => (
            <li key={i} className="flex gap-3">
              <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </div>
              <span className="text-sm text-muted-foreground">{sug}</span>
            </li>
          ))}
        </ol>
      </Card>

      {/* Missing keywords + version history */}
      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-3 text-sm font-semibold">Missing keywords for {TARGET_ROLE}</h2>
          <div className="flex flex-wrap gap-2">
            {ats.sections.keywords.missing.length ? (
              ats.sections.keywords.missing.map((k) => (
                <Badge key={k} variant="warning">{k}</Badge>
              ))
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Great keyword coverage!
              </p>
            )}
          </div>
          <div className="mt-4 border-t pt-4">
            <div className="mb-2 text-xs font-medium text-muted-foreground">Detected skills</div>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_PROFILE.skills.slice(0, 10).map((s) => (
                <Badge key={s} variant="secondary">{s}</Badge>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <History className="h-4 w-4" /> Version history
          </h2>
          <div className="space-y-2">
            {[
              { v: "v2", score, date: "Today", active: true },
              { v: "v1", score: 71, date: "3 days ago", active: false },
            ].map((h) => (
              <div key={h.v} className={cn("flex items-center justify-between rounded-lg border px-3 py-2.5", h.active && "border-primary/40 bg-primary/5")}>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={h.active ? "default" : "outline"}>{h.v}</Badge>
                  <span className="text-muted-foreground">{h.date}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums">{h.score}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
