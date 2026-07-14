# DECISIONS.md

Running log of engineering decisions where reality diverged from, or extended,
the build spec. Schema changes are NEVER made without asking; anything here is
adaptation of behavior / infra sequencing.

## D1 — Session 1: Frontend-first runnable MVP with mock adapters
**Context:** The spec is a 21-day, 6-phase build spanning Supabase, Redis/BullMQ,
and 6 paid external APIs. None of those keys/services are available in this
environment, and the founder emphasized "compelling & intuitive UI/UX."

**Decision:** Build the full monorepo scaffold (Phase 0) plus a polished,
fully interactive web app that exercises the entire product journey
(onboarding → ATS score → job feed → per-job actions → tracker → billing paywall)
driven by deterministic **mock adapters** and **seeded data** (working rule #4).

**Consequences:**
- A `MOCK_MODE` flag (default `true` when keys are absent) routes every external
  dependency to an in-memory/mock implementation under `packages/core/mock` and
  `apps/web/lib/data`. Swapping to real providers is a per-adapter change, not a
  rewrite.
- The DB schema (`packages/db`) is written exactly to spec §4 as Drizzle + SQL,
  ready to `drizzle-kit push` once `DATABASE_URL` is set. It is not yet the live
  data source for the web app in this session — the web app reads the same
  typed shapes from the mock layer.
- tRPC/Supabase-auth/BullMQ wiring is scaffolded (types, procedures, processor
  stubs) but not the live path this session. No schema deviation.

**Not changed:** DB schema, plan limits (§10), adapter interface (§5), prompts (§8).

## D2 — shadcn/ui components hand-authored
The shadcn CLI requires interactive init. To keep the build non-interactive and
runnable, the handful of primitives used (Button, Card, Badge, Dialog, Slider,
Progress, Tabs, Input) are hand-authored in `apps/web/components/ui` following
shadcn's Radix + class-variance-authority conventions, so the real CLI can
later overwrite them 1:1 if desired.
