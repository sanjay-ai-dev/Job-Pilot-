"use client";
import { KanbanSquare, ChevronRight, ChevronLeft, Inbox } from "lucide-react";
import type { MatchStatus, MatchView } from "@jobpilot/core/types";
import { useApp } from "@/lib/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, initials, brandColor, timeAgo } from "@/lib/utils";

const PIPELINE: { status: MatchStatus; label: string; accent: string }[] = [
  { status: "saved", label: "Saved", accent: "bg-slate-400" },
  { status: "applied", label: "Applied", accent: "bg-sky-500" },
  { status: "emailed", label: "Emailed", accent: "bg-violet-500" },
  { status: "interview", label: "Interview", accent: "bg-amber-500" },
  { status: "offer", label: "Offer", accent: "bg-emerald-500" },
];

const ORDER: MatchStatus[] = ["saved", "applied", "emailed", "interview", "offer"];

export default function TrackerPage() {
  const { matches, setStatus } = useApp();

  const byStatus = (s: MatchStatus) => matches.filter((m) => m.status === s);
  const totalTracked = matches.filter((m) => ORDER.includes(m.status)).length;

  function move(m: MatchView, dir: 1 | -1) {
    const idx = ORDER.indexOf(m.status);
    const next = ORDER[idx + dir];
    if (next) setStatus(m.id, next);
  }

  return (
    <div className="container max-w-6xl space-y-5 py-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <KanbanSquare className="h-6 w-6 text-primary" /> Application Tracker
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalTracked} applications in your pipeline · save or apply to a job to add it here
        </p>
      </div>

      {totalTracked === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-20 text-center">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Your pipeline is empty</p>
          <p className="text-sm text-muted-foreground">Save or apply to jobs from the feed to start tracking them.</p>
          <Button variant="gradient" size="sm" asChild>
            <a href="/dashboard">Go to feed</a>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
          {PIPELINE.map((col) => {
            const items = byStatus(col.status);
            return (
              <div key={col.status} className="rounded-2xl border bg-muted/20 p-3">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className={cn("h-2 w-2 rounded-full", col.accent)} />
                    {col.label}
                  </div>
                  <Badge variant="secondary" className="text-[11px]">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((m) => (
                    <div key={m.id} className="rounded-xl border bg-card p-3 shadow-sm">
                      <div className="flex items-start gap-2">
                        <div className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white", brandColor(m.job.company))}>
                          {initials(m.job.company)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium leading-tight">{m.job.title}</div>
                          <div className="truncate text-xs text-muted-foreground">{m.job.company}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{timeAgo(m.job.postedAt)}</span>
                        <div className="flex gap-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={ORDER.indexOf(m.status) === 0}
                            onClick={() => move(m, -1)}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6"
                            disabled={ORDER.indexOf(m.status) === ORDER.length - 1}
                            onClick={() => move(m, 1)}
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-xl border border-dashed py-6 text-center text-xs text-muted-foreground">
                      Nothing here yet
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
