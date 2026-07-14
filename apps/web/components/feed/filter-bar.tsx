"use client";
import { Search, SlidersHorizontal, ArrowDownWideNarrow, Sparkles, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useApp, type DatePosted, type SortMode } from "@/lib/store";

const DATE_OPTS: { value: DatePosted; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "3d", label: "3 days" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All" },
];

const SOURCES = [
  { id: "jsearch", label: "JSearch" },
  { id: "adzuna", label: "Adzuna" },
];

export function FilterBar() {
  const { filters, setFilter, resetFilters } = useApp();

  function toggleSource(id: string) {
    const next = filters.sources.includes(id)
      ? filters.sources.filter((s) => s !== id)
      : [...filters.sources, id];
    setFilter("sources", next);
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      {/* Row 1: search + sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search role or company…"
            className="pl-9"
            value={filters.query}
            onChange={(e) => setFilter("query", e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
          {(["newest", "best"] as SortMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setFilter("sort", m)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filters.sort === m ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "newest" ? <ArrowDownWideNarrow className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
              {m === "newest" ? "Newest" : "Best match"}
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: filters */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
        <div>
          <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <SlidersHorizontal className="h-3 w-3" /> Posted
          </div>
          <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
            {DATE_OPTS.map((o) => (
              <button
                key={o.value}
                onClick={() => setFilter("datePosted", o.value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  filters.datePosted === o.value ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-[180px]">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Min match</span>
            <span className="text-primary">{filters.minScore}%</span>
          </div>
          <Slider
            value={[filters.minScore]}
            onValueChange={([v]) => setFilter("minScore", v ?? 0)}
            max={100}
            step={5}
          />
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Source</div>
          <div className="flex gap-1.5">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                onClick={() => toggleSource(s.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filters.sources.includes(s.id)
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Remote</div>
          <button
            onClick={() => setFilter("remoteOnly", !filters.remoteOnly)}
            className={cn(
              "flex h-6 w-11 items-center rounded-full border p-0.5 transition-colors",
              filters.remoteOnly ? "border-primary bg-primary justify-end" : "bg-muted justify-start",
            )}
          >
            <span className="h-4 w-4 rounded-full bg-white shadow transition-transform" />
          </button>
        </div>

        <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={resetFilters}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>
    </div>
  );
}
