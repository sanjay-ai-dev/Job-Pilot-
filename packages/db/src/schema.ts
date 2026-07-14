import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  real,
  date,
  bigint,
  index,
  unique,
  customType,
  primaryKey,
} from "drizzle-orm/pg-core";

/** pgvector column (1024-dim, §4). */
const vector = (name: string, dim: number) =>
  customType<{ data: number[]; driverData: string }>({
    dataType: () => `vector(${dim})`,
    toDriver: (v) => `[${v.join(",")}]`,
    fromDriver: (v) => (v as string).slice(1, -1).split(",").map(Number),
  })(name);

/** App profile — extends auth.users (§4). */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name"),
  phone: text("phone"),
  city: text("city"),
  experienceYears: numeric("experience_years", { precision: 4, scale: 1 }),
  currentCtcLpa: numeric("current_ctc_lpa", { precision: 6, scale: 1 }),
  expectedCtcLpa: numeric("expected_ctc_lpa", { precision: 6, scale: 1 }),
  noticePeriodDays: integer("notice_period_days"),
  plan: text("plan").notNull().default("free"),
  planValidTill: timestamp("plan_valid_till", { withTimezone: true }),
  senderEmail: text("sender_email"),
  senderVerified: boolean("sender_verified").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const resumes = pgTable("resumes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  version: integer("version").notNull(),
  storagePath: text("storage_path").notNull(),
  rawText: text("raw_text"),
  parsed: jsonb("parsed"),
  atsScore: integer("ats_score"),
  atsBreakdown: jsonb("ats_breakdown"),
  embedding: vector("embedding", 1024),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const savedSearches = pgTable("saved_searches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  roleQuery: text("role_query").notNull(),
  locations: text("locations").array().default(sql`'{}'`),
  remoteOk: boolean("remote_ok").default(true),
  minExperience: numeric("min_experience", { precision: 4, scale: 1 }),
  maxExperience: numeric("max_experience", { precision: 4, scale: 1 }),
  isActive: boolean("is_active").default(true),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    dedupeHash: text("dedupe_hash").notNull().unique(),
    source: text("source").notNull(),
    sourceJobId: text("source_job_id"),
    title: text("title").notNull(),
    company: text("company").notNull(),
    locations: text("locations").array().default(sql`'{}'`),
    remote: boolean("remote").default(false),
    description: text("description"),
    salaryMinLpa: numeric("salary_min_lpa", { precision: 8, scale: 1 }),
    salaryMaxLpa: numeric("salary_max_lpa", { precision: 8, scale: 1 }),
    applyUrl: text("apply_url"),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow(),
    embedding: vector("embedding", 1024),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    meta: jsonb("meta"),
  },
  (t) => ({
    postedAtIdx: index("jobs_posted_at_idx").on(t.postedAt.desc()),
    embeddingIdx: index("jobs_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
  }),
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    jobId: uuid("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
    savedSearchId: uuid("saved_search_id").references(() => savedSearches.id, { onDelete: "set null" }),
    similarity: real("similarity"),
    matchScore: integer("match_score"),
    matchReason: text("match_reason"),
    status: text("status").notNull().default("new"),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    feedIdx: index("matches_feed_idx").on(t.userId, t.status, t.createdAt.desc()),
    userJob: unique("matches_user_job_uq").on(t.userId, t.jobId),
  }),
);

export const outreach = pgTable("outreach", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  contactName: text("contact_name"),
  contactTitle: text("contact_title"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactSource: text("contact_source").default("apollo"),
  emailSubject: text("email_subject"),
  emailBody: text("email_body"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  resendMessageId: text("resend_message_id"),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(), // deeplink | assisted | email
  tailoredResumePath: text("tailored_resume_path"),
  coverLetter: text("cover_letter"),
  screeningAnswers: jsonb("screening_answers"),
  appliedAt: timestamp("applied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const usageCounters = pgTable(
  "usage_counters",
  {
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    matchesServed: integer("matches_served").default(0),
    emailsSent: integer("emails_sent").default(0),
    assistedApplies: integer("assisted_applies").default(0),
    rescores: integer("rescores").default(0),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.day] }) }),
);

export const events = pgTable("events", {
  id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
  userId: uuid("user_id"),
  name: text("name").notNull(),
  props: jsonb("props"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
