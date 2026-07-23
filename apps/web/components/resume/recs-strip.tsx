"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Bookmark, ExternalLink, MapPin, IndianRupee, Sparkles, Wifi, Rocket } from "lucide-react";
import type { MatchView } from "@jobpilot/core/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MatchBadge } from "@/components/score-ring";
import { brandColor, cn, formatLpa, initials, timeAgo } from "@/lib/utils";

/**
 * Compact "Recommended jobs to apply" strip shown right below the ATS score.
 * Same actions as the feed card (Apply / Save), lighter chrome, top-5 only.
 */
export function RecsStrip({ initial }: { initial: MatchView[] }) {
  const [items, setItems] = useState(initial);

  async function setStatus(match: MatchView, status: MatchView["status"]) {
    // Optimistic local update; feed page re-fetches on next visit.
    setItems((prev) =>
      status === "dismissed" ? prev.filter((m) => m.id !== match.id) : prev.map((m) => (m.id === match.id ? { ...m, status } : m)),
    );
    void fetch("/api/match/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ matchId: match.id, status }),
    }).catch(() => {});
  }

  if (!items.length) return null;

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Rocket className="h-4 w-4 text-primary" /> Recommended jobs to apply
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Ranked by AI match score against this resume · top {items.length}
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="space-y-2.5">
        {items.map((m) => {
          const job = m.job;
          const salary = formatLpa(job.salaryMinLpa, job.salaryMaxLpa);
          const applied = m.status === "applied" || m.status === "emailed";
          return (
            <div key={m.id} className="group flex items-start gap-3 rounded-xl border bg-background p-3.5 transition-colors hover:border-primary/30">
              <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-lg text-xs font-bold text-white", brandColor(job.company))}>
                {initials(job.company)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold leading-snug">{job.title}</div>
                    <div className="truncate text-xs text-muted-foreground">{job.company}</div>
                  </div>
                  <MatchBadge score={m.matchScore} />
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.locations.join(", ")}</span>
                  {job.remote && <span className="flex items-center gap-1 text-success"><Wifi className="h-3 w-3" /> Remote</span>}
                  {salary && <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{salary.replace("₹", "")}</span>}
                  <span>{timeAgo(job.postedAt)}</span>
                </div>

                {m.matchReason && (
                  <p className="mt-1.5 flex items-start gap-1 text-[11px] text-accent-foreground">
                    <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    <span className="line-clamp-1">{m.matchReason}</span>
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {job.applyUrl ? (
                  <Button
                    size="sm"
                    variant={applied ? "success" : "gradient"}
                    className="h-8 px-3 text-xs"
                    asChild
                  >
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => !applied && setStatus(m, "applied")}
                    >
                      {applied ? "Applied ✓" : (<>Apply <ExternalLink className="h-3 w-3" /></>)}
                    </a>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs" disabled title="No application link">
                    No link
                  </Button>
                )}
                {!applied && (
                  <button
                    onClick={() => setStatus(m, m.status === "saved" ? "new" : "saved")}
                    className={cn(
                      "flex items-center gap-1 text-[11px] transition-colors",
                      m.status === "saved" ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Bookmark className={cn("h-3 w-3", m.status === "saved" && "fill-current")} />
                    {m.status === "saved" ? "Saved" : "Save"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-accent/40 px-3 py-2 text-xs text-accent-foreground">
        <Badge variant="default" className="text-[10px]">AI-ranked</Badge>
        Scored using your resume · updates every time you re-upload.
      </div>
    </Card>
  );
}
