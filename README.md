# JobPilot 🛫

**Your AI copilot for the entire job hunt.** A B2C SaaS for Indian job seekers:
upload a resume → get an ATS score with fixes → the system aggregates matching
jobs from across the web, ranks them with an AI match score (newest first), and
lets you Apply, Email a recruiter, Call, or Assisted-Apply — all in one tap.

> **Status:** MVP scaffold. The full monorepo (Phase 0) is in place and the web
> app runs the entire product journey on **mock adapters with zero paid API
> keys**. See [`DECISIONS.md`](./DECISIONS.md) for how mock vs. real is wired,
> and the build spec for the phased roadmap.

## Quick start (zero keys required)

```bash
pnpm install
pnpm --filter @jobpilot/web build   # typechecks + compiles all routes
pnpm dev                            # web on :3000, worker (inert in mock mode)
```

Then open http://localhost:3000 — start at `/onboarding` or jump to `/dashboard`.
Everything runs in **MOCK_MODE** (default when keys are absent): seeded jobs,
deterministic ATS/match scoring, mock recruiter lookup. No network calls.

To run just one app:

```bash
pnpm web       # Next.js web app
pnpm worker    # BullMQ worker (inert without REDIS_URL)
```

## Monorepo layout

```
apps/
  web/       Next.js 15 (App Router) — marketing, onboarding, dashboard, tracker, billing
  worker/    BullMQ processors — ingestion (4h cron), matching, outreach, digest, purge
packages/
  db/        Drizzle schema + SQL migration (RLS, pgvector) — spec §4
  core/      Adapters, scoring, prompts, embeddings, LLM client, mock data — spec §5/§8
  config/    Zod env validation + plan limits — spec §7/§10
```

## The mock layer (why it runs key-free)

`packages/config` derives `mockMode = true` when the core keys (Supabase +
Anthropic + DB) are absent. In that mode:

| Real dependency | Mock stand-in |
|---|---|
| JSearch / Adzuna | `generateJobs()` seeded, deterministic (`packages/core/mock`) |
| Anthropic (ATS, rerank, email) | `mockAts` / `mockMatch` / `mockEmail` (`scoring.ts`) |
| Voyage embeddings | hashed bag-of-words vector (`embeddings.ts`) |
| Apollo recruiter lookup | `findRecruiterContact()` (`apps/web/lib/data.ts`) |
| Supabase Postgres | in-memory feed built from the same typed shapes |

The exact same `@jobpilot/core` functions power both the mock web demo and the
(future) real worker pipeline — swap a key, not a codebase.

## Going live (per phase)

1. Fill `.env` from `.env.example` (`MOCK_MODE=false` once the core keys exist).
2. Apply the schema: run `packages/db/migrations/0000_init.sql` in Supabase
   (enables `vector`, creates tables, RLS policies), or `pnpm --filter @jobpilot/db push`.
3. Set `REDIS_URL` to activate the BullMQ worker (4h ingestion cron).
4. Wire the remaining adapters (JSearch/Adzuna already normalize real payloads;
   Apollo/Resend/Razorpay follow the same key-gated fallback pattern).

## Compliance stance (baked in)

- Primary data from **legitimate aggregator APIs** (JSearch, Adzuna). Apify
  scraper adapters are **disabled by default** behind `ENABLE_APIFY_SOURCES`.
- **No auto-submit** on LinkedIn/Naukri — Assisted Apply always ends with a human click.
- Outreach sends only from the user's **verified sender** with per-day caps.
- RLS on every user table; worker uses the service role. JD text treated as
  untrusted (prompt-injection delimiters).

## Scripts

| Command | What |
|---|---|
| `pnpm dev` | Run web + worker |
| `pnpm build` | Build all |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm --filter @jobpilot/db push` | Push Drizzle schema to Supabase |

## Verified in this build

- ✅ All 6 workspaces typecheck; web app builds (9 routes, static).
- ✅ Worker boots in mock mode (inert, lists queues).
- ✅ Onboarding → feed → ATS → tracker → billing all render and are interactive.
- ✅ Pure-JS `dedupeHash` (SHA-256) is byte-identical to Node's `crypto` and
  runs isomorphically (browser demo + node worker).
