import { env } from "@jobpilot/config/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export * as schema from "./schema";
export * from "./schema";

/**
 * DB client. In MOCK_MODE (no DATABASE_URL) this is null — the web app reads
 * from the mock data layer instead of Postgres (see DECISIONS.md D1).
 */
export const db = env.DATABASE_URL
  ? drizzle(postgres(env.DATABASE_URL, { prepare: false }), { schema })
  : null;

export type Database = NonNullable<typeof db>;
