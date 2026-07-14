export * from "./env";

/** Plan limits (spec §10) — server-enforced source of truth. */
export const PLAN_LIMITS = {
  free: {
    label: "Free",
    priceInr: 0,
    matchesPerDay: 10,
    quickMatchOnly: true,
    atsRescoresTotal: 1,
    atsRescoresPerMonth: 1,
    emailsPerDay: 0,
    assistedAppliesPerDay: 0,
    savedSearches: 1,
    digest: true,
  },
  pro: {
    label: "Pro",
    priceInr: 499,
    matchesPerDay: Infinity,
    quickMatchOnly: false,
    atsRescoresTotal: Infinity,
    atsRescoresPerMonth: 5,
    emailsPerDay: 10,
    assistedAppliesPerDay: 5,
    savedSearches: 3,
    digest: true,
  },
  power: {
    label: "Power",
    priceInr: 999,
    matchesPerDay: Infinity,
    quickMatchOnly: false,
    atsRescoresTotal: Infinity,
    atsRescoresPerMonth: Infinity,
    emailsPerDay: 30,
    assistedAppliesPerDay: 20,
    savedSearches: 5,
    digest: true,
  },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;
