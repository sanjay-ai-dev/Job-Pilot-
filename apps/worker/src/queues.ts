import { z } from "zod";

/** Queue names + payload schemas (validated on every job, §9). */
export const QUEUES = {
  ingestUserFirstFetch: "ingest:user-first-fetch",
  ingestCron: "ingest:cron",
  resumeProcess: "resume:process",
  matchUser: "match:user",
  outreachFindContact: "outreach:find-contact",
  assistedApply: "assisted:apply",
  digestDaily: "digest:daily",
  purgeNightly: "purge:nightly",
} as const;

export const payloads = {
  [QUEUES.ingestUserFirstFetch]: z.object({ userId: z.string().uuid() }),
  [QUEUES.resumeProcess]: z.object({ userId: z.string().uuid(), resumeId: z.string().uuid() }),
  [QUEUES.matchUser]: z.object({ userId: z.string().uuid() }),
  [QUEUES.outreachFindContact]: z.object({ userId: z.string().uuid(), matchId: z.string().uuid() }),
  [QUEUES.assistedApply]: z.object({ userId: z.string().uuid(), matchId: z.string().uuid() }),
} as const;
