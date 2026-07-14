import { env } from "@jobpilot/config/env";
import type { ConnectionOptions } from "bullmq";
import { QUEUES } from "./queues.js";

/**
 * JobPilot worker (spec §3, §6.3). Owns ingestion (4h cron), matching, outreach
 * contact lookup, assisted-apply generation, daily digest (08:00 IST), and the
 * nightly purge. Uses the Supabase service role (bypasses RLS).
 *
 * In MOCK_MODE there is no Redis, so we boot in "inert" mode and log the plan.
 * The processor bodies live in ./processors/* and reuse @jobpilot/core so the
 * exact same scoring/matching runs in web (on-demand) and worker (background).
 */
async function main() {
  console.log("🛫 JobPilot worker starting…");

  if (env.mockMode || !env.REDIS_URL) {
    console.log("⚠️  MOCK_MODE / no REDIS_URL — worker is inert.");
    console.log("    Registered queues:");
    for (const q of Object.values(QUEUES)) console.log(`      • ${q}`);
    console.log("    Set REDIS_URL + real keys to activate BullMQ workers.");
    return;
  }

  // Real path (Phase 2+): lazily import bullmq only when Redis is configured.
  const { Worker, Queue } = await import("bullmq");
  const { default: IORedis } = await import("ioredis");
  const connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  }) as unknown as ConnectionOptions;

  const ingestQueue = new Queue(QUEUES.ingestCron, { connection });
  await ingestQueue.add(
    "cron",
    {},
    { repeat: { every: 4 * 60 * 60 * 1000 }, jobId: "ingest-cron" }, // 4h (§6.3)
  );

  new Worker(
    QUEUES.ingestCron,
    async () => {
      const { runIngestion } = await import("./processors/ingest.js");
      await runIngestion();
    },
    { connection, concurrency: 3 },
  );

  console.log("✅ Worker online. Ingestion cron every 4h.");
}

main().catch((e) => {
  console.error("Worker crashed:", e);
  process.exit(1);
});
