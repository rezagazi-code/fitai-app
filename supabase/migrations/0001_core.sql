-- ============================================================================
-- اپ هوشمند بدنسازی (Fit AI-style) — 0001_core.sql
--
-- هسته‌ی دیتابیس: پروفایل کاربر، برنامه‌های تمرینی، آیتم‌های هر روز برنامه،
-- جلسات تمرین و لاگ هر ست. اپ شخصی است (یک کاربر در هر اکانت) — بدون مربی،
-- بدون نقش اضافه: هر سطر فقط متعلق به user_id سازنده‌اش است.
--
-- ⛔ مرز دارویی (تصمیم رضا): این فایل هیچ ستون/جدولی برای تجویز دارو یا مکمل
--    ندارد و هرگز نخواهد داشت. (آینده: جدول supplements فقط برای ثبت
--    آیتم‌هایی که *کاربر خودش* وارد کرده — بدون هیچ فیلد تجویزی.)
--
-- RUN: به ترتیب 0001 → 0002 → 0003. Idempotent (safe to re-run).
-- NOTE (Supabase rule in force from Oct 30, 2026): explicit GRANTs for
-- authenticated / anon / service_role are included in this file.
-- ============================================================================


-- ============================================================================
-- 1. PROFILES — یک سطر برای هر کاربر احرازشده (auth.users).
-- ============================================================================
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
comment on table profiles is 'One row per authenticated user (auth.users). display_name = user-chosen name shown in the app.';
comment on column profiles.user_id is 'PK + FK to auth.users(id); RLS key for the whole schema.';


-- ============================================================================
-- 2. WORKOUT_PROGRAMS — برنامه‌ی تمرینی کاربر (ساخته‌ی هوش مصنوعی یا دستی).
-- ============================================================================
create table if not exists workout_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name_fa text not null default '',
  name_en text not null default '',
  goal text not null default ''
    check (goal in ('', 'strength', 'hypertrophy', 'fat_loss', 'general_fitness')),
  days_per_week int not null default 3
    check (days_per_week between 1 and 7),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
comment on table workout_programs is 'User workout program (AI-generated or hand-built). goal = one of strength/hypertrophy/fat_loss/general_fitness.';
comment on column workout_programs.is_active is 'Only one program is typically active at a time; history stays for reference.';
create index if not exists idx_programs_user on workout_programs(user_id);


-- ============================================================================
-- 3. PROGRAM_ITEMS — آیتم‌های هر روز برنامه (یک حرکت در یک روز).
-- ============================================================================
create table if not exists program_items (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references workout_programs(id) on delete cascade,
  day_index int not null check (day_index between 0 and 6),
  -- FK to exercises(key) is added in 0003_exercise_library.sql (the table
  -- must exist first; 0001 runs before 0003).
  exercise_key text not null,
  sets int not null check (sets between 1 and 20),
  reps text not null default '10' check (char_length(reps) between 1 and 20),
  rest_seconds int not null default 90 check (rest_seconds between 0 and 900),
  sort_order int not null default 0
);
comment on table program_items is 'One exercise slot in a program day. exercise_key joins the exercise library (0003). reps is text to allow ranges like "8-12".';
comment on column program_items.day_index is '0..6 = index of the training day within the program week.';
create index if not exists idx_programitems_program on program_items(program_id, day_index, sort_order);


-- ============================================================================
-- 4. WORKOUT_SESSIONS — یک جلسه‌ی تمرینی واقعی (اجرا شده توسط کاربر).
-- ============================================================================
create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid references workout_programs(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  notes text not null default '',
  client_uuid uuid not null default gen_random_uuid(),
  unique (client_uuid)
);
comment on table workout_sessions is 'A real executed training session. client_uuid = offline-capable idempotency key (retry-safe sync).';
create index if not exists idx_sessions_user_started on workout_sessions(user_id, started_at desc);


-- ============================================================================
-- 5. LOGGED_SETS — هر ست ثبت‌شده: وزن × تکرار + RPE.
-- ============================================================================
create table if not exists logged_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references workout_sessions(id) on delete cascade,
  -- FK to exercises(key) is added in 0003_exercise_library.sql (the table
  -- must exist first; 0001 runs before 0003).
  exercise_key text not null,
  set_index int not null check (set_index between 1 and 50),
  reps int not null check (reps between 1 and 500),
  weight_kg numeric not null default 0 check (weight_kg >= 0 and weight_kg <= 500),
  rpe numeric check (rpe is null or (rpe >= 1 and rpe <= 10)),
  logged_at timestamptz not null default now()
);
comment on table logged_sets is 'Per-set log: weight x reps + optional RPE (1-10). Personal-record detection runs client-side.';
create index if not exists idx_sets_session on logged_sets(session_id);


-- ============================================================================
-- 6. RLS — اپ شخصی: هر کاربر فقط به سطرهای خودش دسترسی دارد.
--    جداول فرزند (program_items / logged_sets) از طریق FK والد به auth.uid()
--    وصل می‌شوند (join-through-parent pattern).
-- ============================================================================

-- ---- profiles: کاربر فقط پروفایل خودش را می‌بیند/می‌سازد/ویرایش می‌کند
alter table profiles enable row level security;
drop policy if exists fitai_profiles_own on profiles;
create policy fitai_profiles_own on profiles
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- workout_programs: کاربر فقط برنامه‌های خودش
alter table workout_programs enable row level security;
drop policy if exists fitai_programs_own on workout_programs;
create policy fitai_programs_own on workout_programs
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- program_items: از طریق workout_programs والد (join through parent)
alter table program_items enable row level security;
drop policy if exists fitai_programitems_own on program_items;
create policy fitai_programitems_own on program_items
  for all
  using (exists (
    select 1 from workout_programs p
    where p.id = program_items.program_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from workout_programs p
    where p.id = program_items.program_id and p.user_id = auth.uid()
  ));

-- ---- workout_sessions: کاربر فقط جلسات خودش
alter table workout_sessions enable row level security;
drop policy if exists fitai_sessions_own on workout_sessions;
create policy fitai_sessions_own on workout_sessions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- logged_sets: از طریق workout_sessions والد (join through parent)
alter table logged_sets enable row level security;
drop policy if exists fitai_loggedsets_own on logged_sets;
create policy fitai_loggedsets_own on logged_sets
  for all
  using (exists (
    select 1 from workout_sessions s
    where s.id = logged_sets.session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from workout_sessions s
    where s.id = logged_sets.session_id and s.user_id = auth.uid()
  ));


-- ============================================================================
-- 7. GRANTs — صریح برای هر جدول (Supabase Data API rule, in force Oct 30, 2026)
-- ============================================================================
grant select, insert, update, delete on profiles          to authenticated;
grant select, insert, update, delete on workout_programs  to authenticated;
grant select, insert, update, delete on program_items     to authenticated;
grant select, insert, update, delete on workout_sessions  to authenticated;
grant select, insert, update, delete on logged_sets       to authenticated;

grant all on profiles          to service_role;
grant all on workout_programs  to service_role;
grant all on program_items     to service_role;
grant all on workout_sessions  to service_role;
grant all on logged_sets       to service_role;

-- NOTE: no grants to anon — every row is user-scoped; anonymous users
-- must authenticate before touching any of these tables.
