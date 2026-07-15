"use client";
import { create } from "zustand";
import type { MatchStatus, MatchView } from "@jobpilot/core/types";
import { PLAN_LIMITS, type PlanId } from "@jobpilot/config";
import { buildDemoFeed } from "./data";

export type SortMode = "newest" | "best";
export type DatePosted = "24h" | "3d" | "7d" | "30d" | "all";

export interface Filters {
  datePosted: DatePosted;
  minScore: number;
  remoteOnly: boolean;
  sources: string[];
  locations: string[];
  query: string;
  sort: SortMode;
}

interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

interface AppState {
  matches: MatchView[];
  realMode: boolean;
  filters: Filters;
  plan: PlanId;
  emailsSentToday: number;
  assistedAppliesToday: number;
  toasts: Toast[];

  hydrate: (matches: MatchView[], realMode: boolean) => void;
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  resetFilters: () => void;
  setStatus: (matchId: string, status: MatchStatus) => void;
  setPlan: (plan: PlanId) => void;
  recordEmail: () => boolean; // returns false if over cap
  recordAssisted: () => boolean;
  pushToast: (message: string, action?: Toast["action"]) => void;
  dismissToast: (id: number) => void;
}

const DEFAULT_FILTERS: Filters = {
  datePosted: "all",
  minScore: 0,
  remoteOnly: false,
  sources: [],
  locations: [],
  query: "",
  sort: "newest",
};

let toastSeq = 1;

export const useApp = create<AppState>((set, get) => ({
  matches: buildDemoFeed(),
  realMode: false,
  filters: DEFAULT_FILTERS,
  plan: "free",
  emailsSentToday: 0,
  assistedAppliesToday: 0,
  toasts: [],

  hydrate: (matches, realMode) => set({ matches, realMode }),
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),

  setStatus: (matchId, status) => {
    set((s) => ({ matches: s.matches.map((m) => (m.id === matchId ? { ...m, status } : m)) }));
    // Persist to Supabase when running on real data (fire-and-forget).
    if (get().realMode) {
      void fetch("/api/match/status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ matchId, status }),
      }).catch(() => {});
    }
  },

  setPlan: (plan) => set({ plan }),

  recordEmail: () => {
    const { plan, emailsSentToday } = get();
    const cap = PLAN_LIMITS[plan].emailsPerDay;
    if (emailsSentToday >= cap) return false;
    set({ emailsSentToday: emailsSentToday + 1 });
    return true;
  },

  recordAssisted: () => {
    const { plan, assistedAppliesToday } = get();
    const cap = PLAN_LIMITS[plan].assistedAppliesPerDay;
    if (assistedAppliesToday >= cap) return false;
    set({ assistedAppliesToday: assistedAppliesToday + 1 });
    return true;
  },

  pushToast: (message, action) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts, { id, message, action }] }));
    setTimeout(() => get().dismissToast(id), 5000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Derived, filtered + sorted feed (matches DB `matches_feed_idx` behavior). */
export function selectFeed(state: AppState): MatchView[] {
  const { filters, matches } = state;
  const now = Date.now();
  const windows: Record<DatePosted, number> = {
    "24h": 864e5,
    "3d": 3 * 864e5,
    "7d": 7 * 864e5,
    "30d": 30 * 864e5,
    all: Infinity,
  };
  const win = windows[filters.datePosted];

  const out = matches.filter((m) => {
    if (m.status === "dismissed") return false;
    if (now - +new Date(m.job.postedAt) > win) return false;
    if (m.matchScore < filters.minScore) return false;
    if (filters.remoteOnly && !m.job.remote) return false;
    if (filters.sources.length && !filters.sources.includes(m.job.source)) return false;
    if (filters.locations.length && !m.job.locations.some((l) => filters.locations.includes(l))) return false;
    if (filters.query) {
      const q = filters.query.toLowerCase();
      if (!`${m.job.title} ${m.job.company}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  out.sort((a, b) =>
    state.filters.sort === "best"
      ? b.matchScore - a.matchScore
      : +new Date(b.job.postedAt) - +new Date(a.job.postedAt),
  );
  return out;
}
