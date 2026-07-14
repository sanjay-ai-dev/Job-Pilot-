import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "3 hours ago" style relative time (IST-agnostic, from ISO). */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

export function formatLpa(min?: number | null, max?: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `₹${min}–${max} LPA`;
  return `₹${(min ?? max)!} LPA`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Stable brand color per company name (for avatar chips). */
export function brandColor(name: string): string {
  const palette = [
    "bg-rose-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500",
    "bg-teal-500", "bg-sky-500", "bg-indigo-500", "bg-violet-500", "bg-fuchsia-500",
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return palette[h % palette.length]!;
}
