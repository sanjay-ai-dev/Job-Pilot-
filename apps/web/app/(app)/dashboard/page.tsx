"use client";
import { useMemo } from "react";
import { RefreshCw, Radar, SearchX } from "lucide-react";
import { useApp, selectFeed } from "@/lib/store";
import { FilterBar } from "@/components/feed/filter-bar";
import { JobCard } from "@/components/feed/job-card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const state = useApp();
  const feed = useMemo(() => selectFeed(state), [state.matches, state.filters]);

  const freshCount = state.matches.filter(
    (m) => Date.now() - +new Date(m.job.postedAt) < 24 * 3600 * 1000,
  ).length;

  return (
    <div className="container max-w-4xl space-y-5 py-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Radar className="h-6 w-6 text-primary" /> Your Job Feed
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {feed.length} matches · <span className="text-success font-medium">{freshCount} new in the last 24h</span> · sorted newest first
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <FilterBar />

      {/* Feed */}
      {feed.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-20 text-center">
          <SearchX className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No jobs match these filters</p>
            <p className="text-sm text-muted-foreground">Try widening the date range or lowering the match threshold.</p>
          </div>
          <Button variant="outline" size="sm" onClick={state.resetFilters}>
            Reset filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {feed.map((m, i) => (
            <div key={m.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <JobCard match={m} />
            </div>
          ))}
          <p className="py-6 text-center text-sm text-muted-foreground">
            You&apos;re all caught up — new matches arrive every 4 hours ✨
          </p>
        </div>
      )}
    </div>
  );
}
