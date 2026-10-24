-- ============================================================================
-- اپ هوشمند بدنسازی (Fit AI-style) — 0003_exercise_library.sql
--
-- کتابخانه‌ی حرکات (shared reference table): کلید متنی ثابت برای هر حرکت،
-- نام فارسی/انگلیسی، گروه عضلانی، وسیله و ویدیوی آموزشی.
-- video_url فعلاً خالی ('') است — هیچ URL ویدیوی ساختگی/اختراعی در دیتابیس
-- نمی‌نشیند؛ لینک‌های واقعی (مثل MuscleWiki) بعداً توسط رضا/اپ اضافه می‌شوند.
--
-- این جدول مرجع مشترک است (نه داده‌ی شخصی): همه (حتی anon) می‌توانند بخوانند؛
-- نوشتن فقط از طریق service_role / SQL (سید بعدی).
--
-- RUN: بعد از 0002_tracking.sql. Idempotent (safe to re-run).
-- NOTE (Supabase rule in force from Oct 30, 2026): explicit GRANTs for
-- authenticated / anon / service_role are included in this file.
-- ============================================================================


-- ============================================================================
-- 1. EXERCISES — کتابخانه‌ی حرکات.
-- ============================================================================
create table if not exists exercises (
  key text primary key,
  name_fa text not null,
  name_en text not null,
  muscle_group text not null default ''
    check (muscle_group in ('', 'chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'glutes', 'full_body')),
  equipment text not null default ''
    check (equipment in ('', 'barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'bands')),
  video_url text not null default '',
  instructions_fa text not null default '',
  instructions_en text not null default ''
);
comment on table exercises is 'Shared exercise library (read-only for clients). exercise_key used by program_items / logged_sets / personal_records. video_url stays empty until real video URLs are added.';
comment on column exercises.key is 'Stable snake_case identifier, e.g. barbell_squat. Never renamed once used.';
comment on column exercises.video_url is 'Instructional video URL. MUST be a real, verified URL — never an invented/guessed one.';


-- ============================================================================
-- 2. SEED — ۳ حرکت رایج (فقط مثال؛ سید کامل جداگانه می‌آید).
-- ============================================================================
insert into exercises (key, name_fa, name_en, muscle_group, equipment, video_url, instructions_fa, instructions_en)
values
  ('barbell_squat',
   'اسکوات با هالتر', 'Barbell Squat',
   'legs', 'barbell', '',
   'پاها را به عرض شانه باز کنید؛ هالتر روی ذوزنقه قرار گیرد. با کنترل پایین بروید تا ران‌ها موازی زمین شوند، سپس با فشار پاشنه بالا بیایید.',
   'Feet shoulder-width apart, barbell across the upper back. Lower under control until thighs are parallel to the floor, then drive up through the heels.'),
  ('barbell_bench_press',
   'پرس سینه با هالتر', 'Barbell Bench Press',
   'chest', 'barbell', '',
   'روی نیمکت دراز بکشید؛ کتف‌ها را جمع و سفت کنید. هالتر را تا سینه پایین بیاورید و با کنترل پرس کنید.',
   'Lie on the bench with shoulder blades pinched together. Lower the bar to the chest, then press up under control.'),
  ('barbell_deadlift',
   'ددلیفت با هالتر', 'Barbell Deadlift',
   'back', 'barbell', '',
   'پاها زیر هالتر؛ کمر صاف، سینه بالا. با فشار پاشنه و کشش باسن، هالتر را در امتداد پاها بالا بیاورید.',
   'Feet under the bar, flat back, chest up. Drive through the heels and extend the hips, lifting the bar along the legs.')
on conflict (key) do nothing;


-- ============================================================================
-- 3. FKs از جدول‌های 0001/0002 — چون exercises بعد از آن‌ها ساخته می‌شود،
--    این قیود اینجا (با guard idempotent) اضافه می‌شوند.
-- ============================================================================
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_program_items_exercise') then
    alter table program_items add constraint fk_program_items_exercise
      foreign key (exercise_key) references exercises(key) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_logged_sets_exercise') then
    alter table logged_sets add constraint fk_logged_sets_exercise
      foreign key (exercise_key) references exercises(key) on delete restrict;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'fk_personal_records_exercise') then
    alter table personal_records add constraint fk_personal_records_exercise
      foreign key (exercise_key) references exercises(key) on delete cascade;
  end if;
end $$;


-- ============================================================================
-- 4. RLS — مرجع مشترک: خواندن برای همه، نوشتن فقط service_role.
-- ============================================================================
alter table exercises enable row level security;
drop policy if exists fitai_exercises_read on exercises;
create policy fitai_exercises_read on exercises
  for select
  using (true);
-- NOTE: no insert/update/delete policy for authenticated — clients are
-- read-only; writes happen via SQL (service_role, which bypasses RLS).


-- ============================================================================
-- 5. GRANTs — صریح برای این جدول (Supabase Data API rule, in force Oct 30, 2026)
-- ============================================================================
grant select on exercises to anon, authenticated;
-- No insert/update/delete for anon/authenticated on the shared library —
-- it is seeded and maintained via SQL/service_role.
grant all on exercises to service_role;
