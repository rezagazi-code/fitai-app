-- ============================================================================
-- اپ هوشمند بدنسازی (Fit AI-style) — 0002_tracking.sql
--
-- رهگیری پیشرفت: اندازه‌گیری‌های بدن + رکوردهای شخصی.
--
-- RUN: بعد از 0001_core.sql. Idempotent (safe to re-run).
-- NOTE (Supabase rule in force from Oct 30, 2026): explicit GRANTs for
-- authenticated / anon / service_role are included in this file.
-- ============================================================================


-- ============================================================================
-- 1. BODY_MEASUREMENTS — اندازه‌گیری‌های بدن در یک تاریخ مشخص.
-- ============================================================================
create table if not exists body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric not null check (weight_kg > 0 and weight_kg <= 500),
  body_fat_pct numeric check (body_fat_pct is null or (body_fat_pct >= 0 and body_fat_pct <= 100)),
  chest_cm numeric check (chest_cm is null or (chest_cm > 0 and chest_cm <= 300)),
  waist_cm numeric check (waist_cm is null or (waist_cm > 0 and waist_cm <= 300)),
  arm_cm   numeric check (arm_cm   is null or (arm_cm   > 0 and arm_cm   <= 200)),
  created_at timestamptz not null default now(),
  -- One row per user per day: a re-entry on the same day updates the record.
  unique (user_id, measured_on)
);
comment on table body_measurements is 'Body measurements per day (weight + optional body-fat % and circumference). One row per user per day — re-entry updates.';
create index if not exists idx_measurements_user_date on body_measurements(user_id, measured_on desc);


-- ============================================================================
-- 2. PERSONAL_RECORDS — رکورد شخصی هر حرکت (یک سطر برای هر user+exercise).
-- ============================================================================
create table if not exists personal_records (
  user_id uuid not null references auth.users(id) on delete cascade,
  -- FK to exercises(key) is added in 0003_exercise_library.sql (the table
  -- must exist first; 0002 runs before 0003).
  exercise_key text not null,
  best_weight_kg numeric not null default 0 check (best_weight_kg >= 0 and best_weight_kg <= 500),
  best_reps int not null default 0 check (best_reps >= 0 and best_reps <= 500),
  achieved_on date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_key)
);
comment on table personal_records is 'One row per (user, exercise): the heaviest lifted (best_weight_kg at best_reps). App upserts it when a logged set beats the record.';
create index if not exists idx_prs_user on personal_records(user_id);


-- ============================================================================
-- 3. RLS — اپ شخصی: هر کاربر فقط به سطرهای خودش.
-- ============================================================================
alter table body_measurements enable row level security;
drop policy if exists fitai_measurements_own on body_measurements;
create policy fitai_measurements_own on body_measurements
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table personal_records enable row level security;
drop policy if exists fitai_prs_own on personal_records;
create policy fitai_prs_own on personal_records
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================================
-- 4. GRANTs — صریح برای هر جدول (Supabase Data API rule, in force Oct 30, 2026)
-- ============================================================================
grant select, insert, update, delete on body_measurements to authenticated;
grant select, insert, update, delete on personal_records  to authenticated;

grant all on body_measurements to service_role;
grant all on personal_records  to service_role;

-- NOTE: no grants to anon — every row is user-scoped; anonymous users
-- must authenticate before touching these tables.
