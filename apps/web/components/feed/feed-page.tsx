"use client";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Radar, SearchX, Loader2, Sparkles } from "lucide-react";
import type { MatchView } from "@jobpilot/core/types";
import { useApp, selectFeed } from "@/lib/store";
import { FilterBar } from "@/components/feed/filter-bar";
import { JobCard } from "@/components/feed/job-card";
import { Button } from "@/components/ui/button";

export function FeedPage({
  initialMatches,
  realMode,
}: {
  initialMatches: MatchView[];
  realMode: boolean;
}) {
  const state = useApp();
  const [refreshing, setRefreshing] = useState(false);

  // Hydrate the store with server-fetched matches when running on real data.
  useEffect(() => {
    if (realMode) state.hydrate(initialMatches, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realMode, initialMatches]);

  const feed = useMemo(() => selectFeed(state), [state.matches, state.filters]);
  const freshCount = state.matches.filter(
    (m) => Date.now() - +new Date(m.job.postedAt) < 24 * 3600 * 1000,
  ).length;

  async function refresh() {
    if (!realMode) return window.location.reload();
    setRefreshing(true);
    try {
      await fetch("/api/ingest/me", { method: "POST" });
    } finally {
      window.location.reload();
    }
  }

  const empty = feed.length === 0;

  return (
    <div className="container max-w-4xl space-y-5 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Radar className="h-6 w-6 text-primary" /> Your Job Feed
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {feed.length} matches · <span className="font-medium text-success">{freshCount} new in the last 24h</span> · sorted newest first
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {refreshing ? "Fetching…" : "Refresh"}
        </Button>
      </div>

      <FilterBar />

      {empty ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-20 text-center">
          <SearchX className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">{realMode ? "No matches yet" : "No jobs match these filters"}</p>
            <p className="text-sm text-muted-foreground">
              {realMode
                ? "Upload a resume and we'll fetch + score jobs for you."
                : "Try widening the date range or lowering the match threshold."}
            </p>
          </div>
          {realMode ? (
            <Button variant="gradient" size="sm" onClick={refresh} disabled={refreshing}>
              <Sparkles className="h-4 w-4" /> Fetch matches now
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={state.resetFilters}>
              Reset filters
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((m, i) => (
            <div key={m.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <JobCard match={m} />
            </div>
          ))}
          <p className="py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up — new matches arrive on the next refresh ✨
          </p>
        </div>
      )}
    </div>
  );
}
