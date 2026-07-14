"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Animated circular score dial (0–100). Color shifts by band. */
export function ScoreRing({
  value,
  size = 132,
  stroke = 11,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 60);
    return () => clearTimeout(t);
  }, [value]);

  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (shown / 100) * circ;
  const band =
    value >= 75 ? "text-success" : value >= 50 ? "text-primary" : value >= 30 ? "text-warning" : "text-destructive";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-secondary" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={cn("fill-none stroke-current transition-all duration-1000 ease-out", band)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-3xl font-bold tabular-nums", band)}>{Math.round(shown)}</span>
        {label && <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>}
        {sublabel && <span className="text-[10px] text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}

/** Compact match-score badge for job cards. */
export function MatchBadge({ score }: { score: number }) {
  const band =
    score >= 75
      ? "bg-success/12 text-success ring-success/20"
      : score >= 50
        ? "bg-primary/10 text-primary ring-primary/20"
        : "bg-warning/15 text-warning-foreground ring-warning/20";
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", band)}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-40" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {score}% match
    </div>
  );
}
