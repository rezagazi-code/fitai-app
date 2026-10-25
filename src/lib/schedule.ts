/**
 * اپ هوشمند بدنسازی — weekly/monthly program schedule.
 *
 * Replaces the old daily rotation (`weekday % days.length`: a workout
 * every calendar day, no rest days, no sense of the week or the block).
 * The new shape, from the 2026-10-24 training-science report:
 *   - WEEK (microcycle, Sat–Fri): each program day lands on a FIXED
 *     weekday; the other days are rest days, part of the plan.
 *   - BLOCK (mesocycle, 4 weeks): weeks 1–3 overload, week 4 deload
 *     (sets cut ~45%, same exercises, same intensity).
 *   - TODAY: train or rest, session name, sessions done/remaining this
 *     week, block position, and the next session on rest days.
 *
 * Pure date math + localStorage reads; no writes, so it can never
 * corrupt a program. A missed session is NOT auto-moved: the user may
 * start the next session early from the rest card (make-up session).
 */

import { getSessions, type WorkoutProgram, type WorkoutSession } from './store';

/** Persian week: Saturday = 0 … Friday = 6. */
export const FA_WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
export const EN_WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** JS getDay (0 = Sunday) → Persian-week index (0 = Saturday). */
export function faWeekdayIndex(d: Date): number {
  return (d.getDay() + 1) % 7;
}

/**
 * Fixed training weekdays for a program, spread so the same muscle
 * groups get ≥ 48 h between hard sessions (upper/lower splits alternate;
 * full-body days are non-consecutive).
 */
export function trainingWeekdays(daysPerWeek: number): number[] {
  const d = Math.max(2, Math.min(6, Math.round(daysPerWeek)));
  switch (d) {
    case 2:
      return [0, 3]; // Sat, Tue
    case 3:
      return [0, 2, 4]; // Sat, Mon, Wed
    case 4:
      return [0, 1, 3, 4]; // Sat, Sun, Tue, Wed
    case 5:
      return [0, 1, 3, 4, 5]; // Sat, Sun, Tue, Wed, Thu
    case 6:
    default:
      return [0, 1, 2, 3, 4, 5]; // Sat–Thu, Fri rest
  }
}

/** Deload week: cut volume ~45%, keep the exercises and the intensity. */
export function deloadSets(sets: number): number {
  return Math.max(1, Math.round(sets * 0.55));
}

const DAY_MS = 86400_000;

function atMidnight(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function saturdayOf(d: Date): Date {
  const m = atMidnight(d);
  m.setTime(m.getTime() - faWeekdayIndex(m) * DAY_MS);
  return m;
}

/** Local YYYY-MM-DD (not UTC slice: a late-night Tehran session is local). */
function localDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Dates (local) on which a finished session logged at least one done set. */
function doneDateKeys(sessions: WorkoutSession[]): Set<string> {
  const out = new Set<string>();
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    if (!s.sets.some((x) => x.done !== false)) continue;
    out.add(localDateKey(new Date(s.startedAt)));
  }
  return out;
}

export interface ScheduleDay {
  date: Date;
  /** Persian-week index 0 = Saturday … 6 = Friday. */
  faWeekday: number;
  kind: 'train' | 'rest';
  /** Index into program.days when kind is 'train', else null. */
  dayIndex: number | null;
  dayNameFa: string | null;
  dayNameEn: string | null;
  done: boolean;
  isToday: boolean;
}

export interface NextTrain {
  dayNameFa: string;
  dayNameEn: string;
  weekdayFa: string;
  weekdayEn: string;
  /** Local date of that session, for deload lookup. */
  date: Date;
}

export interface TodaySchedule {
  kind: 'train' | 'rest';
  dayIndex: number | null;
  dayNameFa: string | null;
  dayNameEn: string | null;
  isDeload: boolean;
  /** 1-based mesocycle number since the program started. */
  blockNumber: number;
  /** 1–4: weeks 1–3 overload, week 4 deload. */
  weekInBlock: number;
  /** Saturday–Friday of the current week. */
  weekDays: ScheduleDay[];
  sessionsDoneThisWeek: number;
  sessionsPlannedThisWeek: number;
  /** Next training session after today (this week, else next week). */
  nextTrain: NextTrain | null;
}

function dayName(program: WorkoutProgram, idx: number): { fa: string; en: string } {
  const n = program.dayNames?.[idx];
  return { fa: n?.fa || program.name, en: n?.en || program.name };
}

/**
 * Full schedule for `now` under `program`. Defensive: a program with no
 * days yields an all-rest week rather than crashing callers.
 */
export function getSchedule(
  program: WorkoutProgram,
  now: Date = new Date(),
  sessions: WorkoutSession[] = getSessions(),
): TodaySchedule {
  const trainDays = trainingWeekdays(program.daysPerWeek);
  const dayCount = program.days.length;
  const weekStart = saturdayOf(now);
  const todayIdx = faWeekdayIndex(now);
  const done = doneDateKeys(sessions);

  // Mesocycle position: the week containing program creation is week 1.
  const created = new Date(program.createdAt);
  const weeksSince = Number.isFinite(created.getTime())
    ? Math.max(0, Math.floor((weekStart.getTime() - saturdayOf(created).getTime()) / (7 * DAY_MS)))
    : 0;
  const weekInBlock = (weeksSince % 4) + 1;
  const blockNumber = Math.floor(weeksSince / 4) + 1;
  const isDeload = weekInBlock === 4;

  const weekDays: ScheduleDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart.getTime() + i * DAY_MS);
    const pos = trainDays.indexOf(i);
    const train = pos >= 0 && pos < dayCount;
    const names = train ? dayName(program, pos) : null;
    weekDays.push({
      date,
      faWeekday: i,
      kind: train ? 'train' : 'rest',
      dayIndex: train ? pos : null,
      dayNameFa: names?.fa ?? null,
      dayNameEn: names?.en ?? null,
      done: done.has(localDateKey(date)),
      isToday: i === todayIdx,
    });
  }

  const today = weekDays[todayIdx];
  const planned = weekDays.filter((d) => d.kind === 'train').length;
  const doneCount = weekDays.filter((d) => d.kind === 'train' && d.done).length;

  // Next training session: later this week, else the first of next week.
  let nextTrain: NextTrain | null = null;
  for (let i = todayIdx + 1; i < 7; i++) {
    const d = weekDays[i];
    if (d.kind === 'train' && d.dayNameFa && d.dayNameEn) {
      nextTrain = { dayNameFa: d.dayNameFa, dayNameEn: d.dayNameEn, weekdayFa: FA_WEEKDAYS[i], weekdayEn: EN_WEEKDAYS[i], date: d.date };
      break;
    }
  }
  if (!nextTrain) {
    const first = trainDays[0];
    if (first !== undefined && first < dayCount) {
      const names = dayName(program, first);
      const date = new Date(weekStart.getTime() + 7 * DAY_MS + first * DAY_MS);
      nextTrain = { dayNameFa: names.fa, dayNameEn: names.en, weekdayFa: FA_WEEKDAYS[first], weekdayEn: EN_WEEKDAYS[first], date };
    }
  }

  return {
    kind: today.kind,
    dayIndex: today.dayIndex,
    dayNameFa: today.dayNameFa,
    dayNameEn: today.dayNameEn,
    isDeload,
    blockNumber,
    weekInBlock,
    weekDays,
    sessionsDoneThisWeek: doneCount,
    sessionsPlannedThisWeek: planned,
    nextTrain,
  };
}

/** Last finished session's done sets for one exercise, or null. */
export function lastPerformance(
  exerciseKey: string,
  sessions: WorkoutSession[] = getSessions(),
): { weightKg: number; reps: number[] } | null {
  const ordered = [...sessions]
    .filter((s) => s.finishedAt)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  for (const s of ordered) {
    const done = s.sets.filter((x) => x.exerciseKey === exerciseKey && x.done !== false);
    if (done.length === 0) continue;
    const top = Math.max(...done.map((x) => x.weightKg));
    return { weightKg: top, reps: done.filter((x) => x.weightKg === top).map((x) => x.reps) };
  }
  return null;
}
