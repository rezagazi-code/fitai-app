/**
 * اپ هوشمند بدنسازی — per-exercise history for the detail view.
 *
 * Reads ONE source of truth (the session store): the trainee's past
 * sessions for one exercise, its personal record, its volume trend,
 * and a "suggested next load" for the next month's program. The
 * suggestion is DISPLAY ONLY — it never mutates any program.
 */

import { getPersonalRecords, getSessions } from './store';

export interface HistorySet {
  reps: number;
  weightKg: number;
}

export interface HistorySession {
  /** ISO date of the session (finish time when present). */
  date: string;
  sets: HistorySet[];
  volumeKg: number;
}

export interface SuggestedLoad {
  kind: 'up' | 'repeat';
  /** Suggested load in kg (null for bodyweight progression). */
  loadKg: number | null;
  /** Suggested rep target for bodyweight progression (null otherwise). */
  reps: number | null;
}

export interface ExerciseHistory {
  /** Most recent finished session containing this exercise. */
  last: HistorySession | null;
  /** Heaviest done load ever (with its reps + date). */
  pr: { weightKg: number; reps: number; date: string } | null;
  /** Most recent first, max 5 sessions. */
  trend: HistorySession[];
  /** Suggested next load, or null when there is no history to base it on. */
  suggested: SuggestedLoad | null;
}

/** Smallest sensible load increment: one 1.25 kg plate per side. */
const LOAD_STEP_KG = 2.5;
/** Bodyweight step when load cannot rise (no external weight logged). */
const REP_STEP = 2;

/** Parse a target reps string ("12-15", "8", "10+") into [low, high]. */
export function parseRepsRange(reps: string): [number, number] {
  const nums = reps.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length === 0) return [0, 0];
  if (nums.length === 1) return [nums[0], nums[0]];
  return [nums[0], nums[1]];
}

export function getExerciseHistory(
  exerciseKey: string,
  targetReps?: string,
): ExerciseHistory {
  const sessions = getSessions()
    .filter((s) => s.finishedAt)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const trend: HistorySession[] = [];
  for (const s of sessions) {
    const done = s.sets
      .filter((x) => x.exerciseKey === exerciseKey && x.done !== false)
      .sort((a, b) => a.setIndex - b.setIndex);
    if (done.length === 0) continue;
    trend.push({
      date: s.finishedAt ?? s.startedAt,
      sets: done.map((x) => ({ reps: x.reps, weightKg: x.weightKg })),
      volumeKg: Math.round(done.reduce((v, x) => v + x.reps * x.weightKg, 0)),
    });
    if (trend.length >= 5) break;
  }

  const prRow = getPersonalRecords().find((p) => p.exerciseKey === exerciseKey) ?? null;
  const pr = prRow
    ? { weightKg: prRow.bestWeightKg, reps: prRow.bestReps, date: prRow.achievedOn }
    : null;

  let suggested: SuggestedLoad | null = null;
  const last = trend[0] ?? null;
  if (last && targetReps) {
    const [, hi] = parseRepsRange(targetReps);
    const top = Math.max(...last.sets.map((x) => x.weightKg));
    const allHit = hi > 0 && last.sets.every((x) => x.reps >= hi);
    if (top > 0) {
      suggested = allHit
        ? { kind: 'up', loadKg: top + LOAD_STEP_KG, reps: null }
        : { kind: 'repeat', loadKg: top, reps: null };
    } else {
      // Bodyweight-only: progress by reps, not load.
      suggested = allHit
        ? { kind: 'up', loadKg: null, reps: hi + REP_STEP }
        : { kind: 'repeat', loadKg: null, reps: hi };
    }
  } else if (last) {
    // No target range (library view): repeat the last top load.
    const top = Math.max(...last.sets.map((x) => x.weightKg));
    suggested = top > 0
      ? { kind: 'repeat', loadKg: top, reps: null }
      : { kind: 'repeat', loadKg: null, reps: null };
  }

  return { last, pr, trend, suggested };
}
