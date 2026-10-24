/**
 * اپ هوشمند بدنسازی — session launcher helpers.
 * Converts the stored WorkoutProgram into the PlanDay shape the
 * WorkoutSession overlay consumes. Single place for "which day is today".
 */
import type { WorkoutProgram } from '../lib/store';
import type { PlanDay } from './WorkoutSession';

/** Rotate through program days by weekday (stable, deterministic). */
export function todayPlanDayIndex(program: WorkoutProgram): number {
  if (program.days.length === 0) return 0;
  return new Date().getDay() % program.days.length;
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
    })),
  };
}

/** Today's PlanDay for the active program, or null when none exists. */
export function todayPlanDay(program: WorkoutProgram | null): PlanDay | null {
  if (!program) return null;
  return programDayToPlanDay(program, todayPlanDayIndex(program));
}
