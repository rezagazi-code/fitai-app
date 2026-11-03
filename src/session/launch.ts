/**
 * اپ هوشمند بدنسازی — session launcher helpers.
 * Converts the stored WorkoutProgram into the PlanDay shape the
 * WorkoutSession overlay consumes. Single place for "which day is today".
 *
 * Since the weekly/monthly structure, "today" comes from the fixed
 * Sat–Fri schedule (src/lib/schedule.ts): training days are fixed
 * weekdays, other days are rest days, and week 4 of each 4-week block
 * is a deload week (sets cut ~45%).
 */
import type { WorkoutProgram } from '../lib/store';
import { deloadSets, getSchedule } from '../lib/schedule';
import { adjustDayForRecovery } from '../lib/recovery';
import type { PlanDay } from './WorkoutSession';

/**
 * Today's program-day index, or -1 on a rest day (or when the program
 * has no days). Callers that need the session use todayPlanDay() /
 * nextPlanDay() instead; this index is kept for the Log tab's legacy
 * shape and returns -1 (never a rotating weekday) on rest days.
 */
export function todayPlanDayIndex(program: WorkoutProgram): number {
  if (program.days.length === 0) return -1;
  const sched = getSchedule(program);
  return sched.kind === 'train' && sched.dayIndex != null ? sched.dayIndex : -1;
}

export function programDayToPlanDay(
  program: WorkoutProgram,
  index: number,
): PlanDay | null {
  const day = program.days[index];
  if (!day || day.length === 0) return null;
  const names = program.dayNames?.[index];
  return {
    key: program.dayKeys?.[index] ?? `day-${index + 1}`,
    nameFa: names?.fa || program.name,
    nameEn: names?.en || program.name,
    exercises: day.map((e) => ({
      exerciseKey: e.exerciseKey,
      sets: e.sets,
      reps: e.reps,
      restSeconds: e.restSeconds,
      ...(e.targetWeightKg != null ? { targetWeightKg: e.targetWeightKg } : {}),
    })),
  };
}

/** Apply the deload cut to a PlanDay's set counts (week 4 of a block). */
function applyDeload(day: PlanDay): PlanDay {
  return {
    ...day,
    exercises: day.exercises.map((e) => ({ ...e, sets: deloadSets(e.sets) })),
  };
}

/**
 * Daily recovery adjustment: tired muscles lose one set (min 1).
 * Applied AFTER deload, in the single launch path, so the session the
 * user actually trains always matches what Home announced. The
 * adjustment is recomputed from finished sessions each launch, so
 * cancelling and reopening never stacks the cut.
 */
function applyRecovery(day: PlanDay): PlanDay {
  const { exercises } = adjustDayForRecovery(
    day.exercises.map((e) => ({ exerciseKey: e.exerciseKey, sets: e.sets })),
  );
  const byKey = new Map(exercises.map((e) => [e.exerciseKey, e.sets]));
  return {
    ...day,
    exercises: day.exercises.map((e) => ({
      ...e,
      sets: byKey.get(e.exerciseKey) ?? e.sets,
    })),
  };
}

/** Today's PlanDay for the active program, or null on rest days. */
export function todayPlanDay(program: WorkoutProgram | null): PlanDay | null {
  if (!program) return null;
  const sched = getSchedule(program);
  if (sched.kind !== 'train' || sched.dayIndex == null) return null;
  const day = programDayToPlanDay(program, sched.dayIndex);
  if (!day) return null;
  return applyRecovery(sched.isDeload ? applyDeload(day) : day);
}

/**
 * The next training session after today (make-up / early start from the
 * rest card), with the deload cut applied when that session's week is a
 * deload week. Null when the program has no training days.
 */
export function nextPlanDay(program: WorkoutProgram | null): PlanDay | null {
  if (!program) return null;
  const sched = getSchedule(program);
  if (!sched.nextTrain) return null;
  const nextSched = getSchedule(program, sched.nextTrain.date);
  if (nextSched.kind !== 'train' || nextSched.dayIndex == null) return null;
  const day = programDayToPlanDay(program, nextSched.dayIndex);
  if (!day) return null;
  return applyRecovery(nextSched.isDeload ? applyDeload(day) : day);
}
