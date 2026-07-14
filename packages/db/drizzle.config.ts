import { defineConfig } from "drizzle-kit";
import { env } from "@jobpilot/config/env";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: { url: env.DATABASE_URL ?? "postgres://localhost:5432/jobpilot" },
  verbose: true,
  strict: true,
});
