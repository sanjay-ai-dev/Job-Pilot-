-- JobPilot initial schema (spec §4). Apply via Supabase SQL editor or drizzle-kit.
create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  city text,
  experience_years numeric(4,1),
  current_ctc_lpa numeric(6,1),
  expected_ctc_lpa numeric(6,1),
  notice_period_days int,
  plan text not null default 'free',
  plan_valid_till timestamptz,
  sender_email text,
  sender_verified boolean default false,
  created_at timestamptz default now()
);

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  version int not null,
  storage_path text not null,
  raw_text text,
  parsed jsonb,
  ats_score int,
  ats_breakdown jsonb,
  embedding vector(1024),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  role_query text not null,
  locations text[] default '{}',
  remote_ok boolean default true,
  min_experience numeric(4,1),
  max_experience numeric(4,1),
  is_active boolean default true,
  last_fetched_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  dedupe_hash text not null unique,
  source text not null,
  source_job_id text,
  title text not null,
  company text not null,
  locations text[] default '{}',
  remote boolean default false,
  description text,
  salary_min_lpa numeric(8,1),
  salary_max_lpa numeric(8,1),
  apply_url text,
  posted_at timestamptz,
  fetched_at timestamptz default now(),
  embedding vector(1024),
  expires_at timestamptz,
  meta jsonb
);
create index if not exists jobs_posted_at_idx on jobs (posted_at desc);
create index if not exists jobs_embedding_idx on jobs using hnsw (embedding vector_cosine_ops);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  saved_search_id uuid references saved_searches(id) on delete set null,
  similarity real,
  match_score int,
  match_reason text,
  status text not null default 'new',
  status_changed_at timestamptz default now(),
  created_at timestamptz default now(),
  unique (user_id, job_id)
);
create index if not exists matches_feed_idx on matches (user_id, status, created_at desc);

create table if not exists outreach (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  contact_name text, contact_title text, contact_email text, contact_phone text,
  contact_source text default 'apollo',
  email_subject text, email_body text,
  sent_at timestamptz, resend_message_id text, opened_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  match_id uuid not null references matches(id) on delete cascade,
  mode text not null,
  tailored_resume_path text,
  cover_letter text,
  screening_answers jsonb,
  applied_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists usage_counters (
  user_id uuid references profiles(id) on delete cascade,
  day date not null,
  matches_served int default 0,
  emails_sent int default 0,
  assisted_applies int default 0,
  rescores int default 0,
  primary key (user_id, day)
);

create table if not exists events (
  id bigint generated always as identity primary key,
  user_id uuid,
  name text not null,
  props jsonb,
  created_at timestamptz default now()
);

-- ─── Row Level Security (§9): auth.uid() = user_id on user-owned tables ───────
alter table profiles enable row level security;
alter table resumes enable row level security;
alter table saved_searches enable row level security;
alter table matches enable row level security;
alter table outreach enable row level security;
alter table applications enable row level security;
alter table usage_counters enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own resumes" on resumes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own searches" on saved_searches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own matches" on matches for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own outreach" on outreach for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own applications" on applications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own usage" on usage_counters for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- `jobs` is shared catalog: readable by authenticated users, writable only by
-- the service role (worker). RLS on, no client write policy.
alter table jobs enable row level security;
create policy "jobs readable" on jobs for select using (auth.role() = 'authenticated');
