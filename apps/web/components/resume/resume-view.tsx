"use client";
import { useRef, useState } from "react";
import { UploadCloud, FileText, Lightbulb, CheckCircle2, History, Loader2, Target, AlertCircle } from "lucide-react";
import type { AtsBreakdown, MatchView } from "@jobpilot/core/types";
import { ScoreRing } from "@/components/score-ring";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RecsStrip } from "./recs-strip";

const SECTION_META: Record<string, { label: string; weight: number }> = {
  keywords: { label: "Keywords", weight: 30 },
  relevance: { label: "Role relevance", weight: 25 },
  impact: { label: "Impact & metrics", weight: 20 },
  completeness: { label: "Completeness", weight: 15 },
  formatting: { label: "Formatting", weight: 10 },
};

export interface VersionRow {
  version: number;
  score: number;
  date: string;
  active: boolean;
}

export function ResumeView({
  mode,
  targetRole,
  initialAts,
  initialFileName,
  initialSkills,
  initialVersions,
  initialRecs = [],
}: {
  mode: "real" | "demo";
  targetRole: string;
  initialAts: AtsBreakdown | null;
  initialFileName: string | null;
  initialSkills: string[];
  initialVersions: VersionRow[];
  initialRecs?: MatchView[];
}) {
  const [ats, setAts] = useState<AtsBreakdown | null>(initialAts);
  const [fileName, setFileName] = useState<string | null>(initialFileName);
  const [skills, setSkills] = useState<string[]>(initialSkills);
  const [versions, setVersions] = useState<VersionRow[]>(initialVersions);
  const [recs, setRecs] = useState<MatchView[]>(initialRecs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const score = ats?.ats_score ?? 0;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setBusy(true);

    if (mode === "demo") {
      // No backend in the public demo — simulate a re-score.
      setTimeout(() => {
        setFileName(file.name);
        setAts((prev) => (prev ? { ...prev, ats_score: Math.min(100, prev.ats_score + 4) } : prev));
        setBusy(false);
      }, 1400);
      return;
    }

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/resume/process", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setAts(data.ats_breakdown as AtsBreakdown);
      setFileName(data.fileName);
      setSkills((data.skills as string[]) ?? skills);
      if (Array.isArray(data.recs)) setRecs(data.recs as MatchView[]);
      setVersions((v) => [
        { version: data.version, score: data.ats_score, date: "Just now", active: true },
        ...v.map((x) => ({ ...x, active: false })),
      ]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="container max-w-4xl space-y-5 py-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <FileText className="h-6 w-6 text-primary" /> Resume & ATS Score
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Target className="h-3.5 w-3.5" /> Scored against your target role:{" "}
          <span className="font-medium text-foreground">{targetRole}</span>
          {mode === "demo" && <Badge variant="outline" className="ml-1">demo</Badge>}
        </p>
      </div>

      {/* Score + upload */}
      <div className="grid gap-5 md:grid-cols-[280px_1fr]">
        <Card className="flex flex-col items-center justify-center gap-3 p-6">
          {busy ? (
            <div className="flex h-[132px] w-[132px] flex-col items-center justify-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">Scoring…</span>
            </div>
          ) : ats ? (
            <ScoreRing value={score} label="ATS Score" />
          ) : (
            <div className="flex h-[132px] w-[132px] items-center justify-center rounded-full border-2 border-dashed text-center text-xs text-muted-foreground">
              No resume yet
            </div>
          )}
          {ats && (
            <Badge variant={score >= 75 ? "success" : "default"}>
              {score >= 75 ? "Interview-ready" : score >= 55 ? "Good, improvable" : "Needs work"}
            </Badge>
          )}
        </Card>

        <Card className="p-6">
          {fileName && (
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-accent-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="max-w-[220px] truncate text-sm font-medium">{fileName}</div>
                  <div className="text-xs text-muted-foreground">
                    Active version{versions[0] ? ` · v${versions[0].version}` : ""}
                  </div>
                </div>
              </div>
              {versions[0] && <Badge variant="secondary">v{versions[0].version}</Badge>}
            </div>
          )}
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-8 text-center transition-colors hover:border-primary hover:bg-accent/30",
              busy && "pointer-events-none opacity-60",
            )}
          >
            <UploadCloud className="h-7 w-7 text-muted-foreground" />
            <span className="text-sm font-medium">
              {fileName ? "Upload a new version" : "Drop your resume or click to upload"}
            </span>
            <span className="text-xs text-muted-foreground">PDF or DOCX · max 5 MB · scanned PDFs not supported</span>
            <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden" onChange={onFile} disabled={busy} />
          </label>
          {error && (
            <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
        </Card>
      </div>

      {!ats ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Upload a resume to see your ATS score</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            We&apos;ll extract the text, score it against your target role, and give you the top 5 fixes.
          </p>
        </Card>
      ) : (
        <>
          {/* Recommended jobs — shown right after the score, ahead of section detail */}
          {recs.length > 0 && <RecsStrip initial={recs} />}

          {/* Section breakdown */}
          <Card className="p-6">
            <h2 className="mb-4 text-sm font-semibold">Section breakdown</h2>
            <div className="space-y-4">
              {Object.entries(SECTION_META).map(([key, meta]) => {
                const s = (ats.sections as Record<string, { score: number }>)[key];
                if (!s) return null;
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
                    <Progress value={s.score} indicatorClassName={s.score >= 70 ? "bg-success" : s.score >= 45 ? "bg-primary" : "bg-warning"} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Suggestions */}
          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-warning" /> Top fixes (ordered by impact)
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
              <h2 className="mb-3 text-sm font-semibold">Missing keywords for {targetRole}</h2>
              <div className="flex flex-wrap gap-2">
                {ats.sections.keywords.missing.length ? (
                  ats.sections.keywords.missing.map((k) => <Badge key={k} variant="warning">{k}</Badge>)
                ) : (
                  <p className="flex items-center gap-1.5 text-sm text-success">
                    <CheckCircle2 className="h-4 w-4" /> Great keyword coverage!
                  </p>
                )}
              </div>
              {skills.length > 0 && (
                <div className="mt-4 border-t pt-4">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">Detected skills</div>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.slice(0, 12).map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                  </div>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4" /> Version history
              </h2>
              <div className="space-y-2">
                {versions.map((h) => (
                  <div key={h.version} className={cn("flex items-center justify-between rounded-lg border px-3 py-2.5", h.active && "border-primary/40 bg-primary/5")}>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={h.active ? "default" : "outline"}>v{h.version}</Badge>
                      <span className="text-muted-foreground">{h.date}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{h.score}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
