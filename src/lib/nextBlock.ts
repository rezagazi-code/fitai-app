/**
 * اپ هوشمند بدنسازی — progressed next-block program.
 *
 * The bug this fixes: generateProgram() is deterministic from the
 * profile only, so a manual rebuild with an unchanged profile
 * reproduced essentially the same program, and nothing at a 4-week
 * block boundary ever offered a new one — the block label just
 * incremented (block 2, 3, …) with the same days.
 *
 * This module is the ONLY place that builds a next-block program:
 *   1. Start from the same base generateProgram() (same profile, so
 *      the split, equipment and injury/banned exclusions stay honest).
 *   2. Progress each exercise from its real logged history:
 *      - last session hit the top of its rep range → +2.5 kg (the same
 *        plate step the session suggestion already uses), or +2 reps
 *        for bodyweight work.
 *      - last session did NOT hit the top → repeat its top load/reps,
 *        recorded as an explicit target so the new program visibly
 *        carries what the athlete actually lifts.
 *      - last 3 finished sessions identical → plateau: swap to another
 *        exercise of the same muscle (never banned/injured, never
 *        already in the program, equipment-compatible when possible).
 *   3. Rest seconds are NEVER invented here: they come straight from
 *      the base scheme (goal, level, compound vs isolation, role).
 *
 * The offer is never applied silently: the UI shows it, the athlete
 * accepts (new program saved + activated, old records untouched) or
 * keeps the old program (dismissed for that block only).
 *
 * Local-only: reads/writes localStorage through the store, no network.
 */

import {
  EXERCISES,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from './exercises';
import {
  generateProgram,
  programExcludedKeys,
  type GoalKey,
  type LevelKey,
  type PlanExercise,
  type UserProfile as EngineProfile,
} from './program';
import { getExerciseHistory } from './exerciseHistory';
import { getSchedule } from './schedule';
import {
  getAthleteProfile,
  saveProgram,
  setActiveProgram,
  type WorkoutProgram,
  type WorkoutSession,
} from './store';

export interface ProgressedExercise extends PlanExercise {
  /** Explicit target load for the new block (undefined = no logged load). */
  targetWeightKg?: number;
}

export interface ProgressedDay {
  key: string;
  nameFa: string;
  nameEn: string;
  exercises: ProgressedExercise[];
}

export type ChangeReason = 'progress' | 'plateau-swap' | 'repeat';

export interface NextBlockChange {
  /** Exercise key in the NEW program (for a swap, the replacement). */
  exerciseKey: string;
  /** For a swap, the replaced exercise key; otherwise the same key. */
  oldExerciseKey: string;
  nameFa: string;
  nameEn: string;
  oldLabelFa: string;
  newLabelFa: string;
  reason: ChangeReason;
}

export interface NextBlockOffer {
  /** Block number that just ended (1-based). */
  finishedBlock: number;
  /** Base plan (same profile) the progression was applied to. */
  baseGoal: string;
  days: ProgressedDay[];
  changes: NextBlockChange[];
  progressedCount: number;
  swappedCount: number;
  restAvgSec: number;
  restMinSec: number;
  restMaxSec: number;
}

/* ---------------- offer state (localStorage, fail-open) ---------------- */

const STATE_KEY = 'fitai.nextBlock';

interface NextBlockState {
  programId: string;
  acceptedBlock: number;
  dismissedBlock: number;
}

function readState(): NextBlockState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as NextBlockState;
      if (typeof parsed.programId === 'string') return parsed;
    }
  } catch {
    /* fall through to default */
  }
  return { programId: '', acceptedBlock: 0, dismissedBlock: 0 };
}

function writeState(state: NextBlockState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable — fail open, offer may reappear */
  }
}

/**
 * Which finished block (if any) has an offer due right now?
 * Due during week 4 of a block (deload week — the offer arrives before
 * the block ends) and afterwards, until it is accepted or dismissed
 * for that block. Null when no block has ended yet.
 */
export function getDueBlock(
  program: WorkoutProgram,
  now: Date = new Date(),
  sessions: WorkoutSession[] = [],
): number | null {
  const sched = getSchedule(program, now, sessions);
  const candidate =
    sched.weekInBlock === 4 ? sched.blockNumber : sched.blockNumber - 1;
  if (candidate < 1) return null;
  const state = readState();
  if (state.programId === program.id) {
    if (state.acceptedBlock >= candidate) return null;
    if (state.dismissedBlock === candidate) return null;
  }
  return candidate;
}

export function dismissNextBlockOffer(program: WorkoutProgram, block: number): void {
  const prev = readState();
  writeState({
    programId: program.id,
    acceptedBlock: prev.programId === program.id ? prev.acceptedBlock : 0,
    dismissedBlock: block,
  });
}

/* ---------------- history helpers ---------------- */

function doneSetsFor(
  exerciseKey: string,
  sessions: WorkoutSession[],
): { weightKg: number; reps: number }[][] {
  const finished = [...sessions]
    .filter((s) => s.finishedAt)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  const out: { weightKg: number; reps: number }[][] = [];
  for (const s of finished) {
    const done = s.sets
      .filter((x) => x.exerciseKey === exerciseKey && x.done !== false)
      .sort((a, b) => a.setIndex - b.setIndex)
      .map((x) => ({ weightKg: x.weightKg, reps: x.reps }));
    if (done.length > 0) out.push(done);
  }
  return out;
}

/** True when the last 3 finished sessions for an exercise are identical. */
function isPlateaued(exerciseKey: string, sessions: WorkoutSession[]): boolean {
  const recent = doneSetsFor(exerciseKey, sessions).slice(0, 3);
  if (recent.length < 3) return false;
  const [a, b, c] = recent;
  const same = (x: { weightKg: number; reps: number }[], y: { weightKg: number; reps: number }[]) =>
    x.length === y.length &&
    x.every((s, i) => s.weightKg === y[i].weightKg && s.reps === y[i].reps);
  return same(a, b) && same(a, c);
}

function topLoad(sets: { weightKg: number; reps: number }[]): number {
  return Math.max(0, ...sets.map((s) => s.weightKg));
}

function exerciseByKey(key: string): Exercise | undefined {
  return EXERCISES.find((e) => e.key === key);
}

/* ---------------- offer construction ---------------- */

function engineProfileFrom(
  program: WorkoutProgram,
): EngineProfile | null {
  const profile = getAthleteProfile();
  const goalMap: Record<string, GoalKey> = {
    'fat-loss': 'fatloss',
    fitness: 'general',
    muscle: 'muscle',
    strength: 'strength',
  };
  const rawGoal = profile?.goal ?? program.goal;
  const goal = goalMap[rawGoal] ?? 'general';
  const level = (profile?.level ?? program.level ?? 'beginner') as LevelKey;
  const equipment = (profile?.equipment ?? ['bodyweight', 'dumbbell']) as Equipment[];
  const injuries = (profile?.injuries ?? []).filter((i) => i !== 'none');
  return {
    goal,
    level,
    daysPerWeek: program.daysPerWeek,
    equipment,
    injuries,
    measurements: profile?.measurements,
    priorities: (program.priorities ?? profile?.priorities ?? []) as MuscleGroup[],
    phase: program.phase ?? profile?.phase,
  };
}

export function buildNextBlockOffer(
  program: WorkoutProgram,
  finishedBlock: number,
  sessions: WorkoutSession[],
): NextBlockOffer | null {
  const engineProfile = engineProfileFrom(program);
  if (!engineProfile) return null;
  const base = generateProgram(engineProfile);
  const excluded = programExcludedKeys(engineProfile);
  const usedKeys = new Set<string>();
  for (const d of base.days) for (const e of d.exercises) usedKeys.add(e.exerciseKey);

  const changes: NextBlockChange[] = [];
  let progressedCount = 0;
  let swappedCount = 0;

  const days: ProgressedDay[] = base.days.map((day) => ({
    key: day.key,
    nameFa: day.nameFa,
    nameEn: day.nameEn,
    exercises: day.exercises.map((ex): ProgressedExercise => {
      const history = getExerciseHistory(ex.exerciseKey, ex.reps);
      const suggested = history.suggested;
      const plateau = isPlateaued(ex.exerciseKey, sessions);

      if (plateau) {
        const muscle = exerciseByKey(ex.exerciseKey)?.muscle;
        const candidate = muscle
          ? EXERCISES.find(
              (e) =>
                e.muscle === muscle &&
                !usedKeys.has(e.key) &&
                !excluded.has(e.key) &&
                (engineProfile.equipment.length === 0 ||
                  e.equipment.every((eq) => engineProfile.equipment.includes(eq))),
            )
          : undefined;
        if (candidate) {
          usedKeys.add(candidate.key);
          const candHistory = getExerciseHistory(candidate.key, ex.reps);
          const candSuggested = candHistory.suggested;
          swappedCount++;
          changes.push({
            exerciseKey: candidate.key,
            oldExerciseKey: ex.exerciseKey,
            nameFa: candidate.nameFa,
            nameEn: candidate.nameEn,
            oldLabelFa: `${exerciseByKey(ex.exerciseKey)?.nameFa ?? ex.exerciseKey} (بدون پیشرفت در ۳ جلسه اخیر)`,
            newLabelFa: `${candidate.nameFa} (جایگزین هم‌عضله)`,
            reason: 'plateau-swap',
          });
          return {
            exerciseKey: candidate.key,
            sets: ex.sets,
            reps: ex.reps,
            restSeconds: ex.restSeconds,
            ...(candSuggested?.loadKg != null ? { targetWeightKg: candSuggested.loadKg } : {}),
          };
        }
        // No swap available: keep the exercise, do not pretend it changed.
      }

      if (suggested) {
        if (suggested.loadKg != null) {
          const lastTop = history.last
            ? topLoad(history.last.sets)
            : suggested.loadKg;
          if (suggested.kind === 'up') {
            progressedCount++;
            changes.push({
              exerciseKey: ex.exerciseKey,
              oldExerciseKey: ex.exerciseKey,
              nameFa: exerciseByKey(ex.exerciseKey)?.nameFa ?? ex.exerciseKey,
              nameEn: exerciseByKey(ex.exerciseKey)?.nameEn ?? ex.exerciseKey,
              oldLabelFa: `${lastTop} کیلو`,
              newLabelFa: `${suggested.loadKg} کیلو`,
              reason: 'progress',
            });
          }
          return { ...ex, targetWeightKg: suggested.loadKg };
        }
        if (suggested.reps != null) {
          const repsText = String(suggested.reps);
          if (suggested.kind === 'up') {
            progressedCount++;
            const [, hi] = ex.reps.match(/\d+/g)?.map(Number) ?? [];
            changes.push({
              exerciseKey: ex.exerciseKey,
              oldExerciseKey: ex.exerciseKey,
              nameFa: exerciseByKey(ex.exerciseKey)?.nameFa ?? ex.exerciseKey,
              nameEn: exerciseByKey(ex.exerciseKey)?.nameEn ?? ex.exerciseKey,
              oldLabelFa: `${hi ?? ex.reps} تکرار`,
              newLabelFa: `${repsText} تکرار`,
              reason: 'progress',
            });
          }
          return { ...ex, reps: repsText };
        }
      }
      return { ...ex };
    }),
  }));

  const rests = days.flatMap((d) => d.exercises.map((e) => e.restSeconds));
  const restAvgSec = rests.length > 0 ? Math.round(rests.reduce((a, b) => a + b, 0) / rests.length) : 0;

  return {
    finishedBlock,
    baseGoal: program.goal,
    days,
    changes,
    progressedCount,
    swappedCount,
    restAvgSec,
    restMinSec: rests.length > 0 ? Math.min(...rests) : 0,
    restMaxSec: rests.length > 0 ? Math.max(...rests) : 0,
  };
}

export function acceptNextBlockOffer(
  program: WorkoutProgram,
  offer: NextBlockOffer,
): WorkoutProgram {
  const stored = saveProgram({
    name: program.name,
    goal: program.goal,
    level: program.level,
    daysPerWeek: program.daysPerWeek,
    dayKeys: offer.days.map((d) => d.key),
    dayNames: offer.days.map((d) => ({ fa: d.nameFa, en: d.nameEn })),
    days: offer.days.map((d) =>
      d.exercises.map((e) => ({
        exerciseKey: e.exerciseKey,
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds,
        ...(e.targetWeightKg != null ? { targetWeightKg: e.targetWeightKg } : {}),
      })),
    ),
    phase: program.phase,
    priorities: program.priorities,
  });
  setActiveProgram(stored.id);
  const prev = readState();
  writeState({
    programId: program.id,
    acceptedBlock: offer.finishedBlock,
    dismissedBlock: prev.programId === program.id ? prev.dismissedBlock : 0,
  });
  return stored;
}
