/**
 * اپ هوشمند بدنسازی — workout session log.
 *
 * Thin adapter over the canonical session store in ./store.ts so the
 * session overlay keeps its rich record API while all analytics
 * (Progress tab, coach engine, store helpers) read ONE source of truth.
 *
 * The record shape stays forward-compatible with a future
 * `workout_sessions` Supabase table.
 */

import {
  getSessions,
  saveFinishedSession,
  type WorkoutSession as StoreSession,
} from './store';

export interface LoggedSetEntry {
  reps: number;
  weightKg: number;
  done: boolean;
  /** 1–10, optional — quick post-set effort rating. */
  rpe?: number;
}

export interface SessionExerciseEntry {
  exerciseKey: string;
  sets: LoggedSetEntry[];
}

/** Forward-compatible with the future `workout_sessions` table. */
export interface WorkoutSessionRecord {
  id: string;
  /** ISO timestamp of when the session finished. */
  date: string;
  planDayKey: string;
  planDayName: string;
  durationSec: number;
  exercises: SessionExerciseEntry[];
  totalVolumeKg: number;
  setsCompleted: number;
  setsPlanned: number;
  prsHit: number;
  /** Reserved for the future Supabase sync layer. */
  synced: boolean;
}

export interface LastPerformance {
  weightKg: number;
  reps: number;
  rpe?: number;
  date: string;
}

function toRecord(s: StoreSession): WorkoutSessionRecord {
  const byKey = new Map<string, LoggedSetEntry[]>();
  for (const set of s.sets) {
    const arr = byKey.get(set.exerciseKey) ?? [];
    arr.push({
      reps: set.reps,
      weightKg: set.weightKg,
      done: set.done !== false,
      rpe: set.rpe,
    });
    byKey.set(set.exerciseKey, arr);
  }
  const exercises: SessionExerciseEntry[] = [...byKey.entries()].map(
    ([exerciseKey, sets]) => ({ exerciseKey, sets }),
  );
  const doneSets = s.sets.filter((x) => x.done !== false);
  return {
    id: s.id,
    date: s.finishedAt ?? s.startedAt,
    planDayKey: s.planDayKey ?? '',
    planDayName: s.planDayName ?? '',
    durationSec: s.durationSec ?? 0,
    exercises,
    totalVolumeKg: recordVolumeKg({ exercises }),
    setsCompleted: doneSets.length,
    setsPlanned: s.sets.length,
    prsHit: s.prsHit ?? 0,
    synced: false,
  };
}

export function getWorkoutSessions(): WorkoutSessionRecord[] {
  return getSessions().map(toRecord);
}

/** Append a finished session record. Returns the stored record. */
export function saveWorkoutSession(
  record: Omit<WorkoutSessionRecord, 'id' | 'synced'>,
): WorkoutSessionRecord {
  const stored = saveFinishedSession({
    programId: null,
    planDayKey: record.planDayKey,
    planDayName: record.planDayName,
    durationSec: record.durationSec,
    prsHit: record.prsHit,
    finishedAt: record.date,
    exercises: record.exercises,
  });
  return toRecord(stored);
}

/** Heaviest done set of the most recent session containing this exercise. */
export function getLastPerformance(exerciseKey: string): LastPerformance | null {
  const sessions = getSessions();
  for (let i = sessions.length - 1; i >= 0; i--) {
    const done = sessions[i].sets.filter(
      (s) => s.exerciseKey === exerciseKey && s.done !== false,
    );
    if (done.length === 0) continue;
    const best = done.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
    return {
      weightKg: best.weightKg,
      reps: best.reps,
      rpe: best.rpe,
      date: sessions[i].finishedAt ?? sessions[i].startedAt,
    };
  }
  return null;
}

/** Total lifted volume (kg) of one record. */
export function recordVolumeKg(record: Pick<WorkoutSessionRecord, 'exercises'>): number {
  let v = 0;
  for (const ex of record.exercises) {
    for (const s of ex.sets) {
      if (s.done) v += s.reps * s.weightKg;
    }
  }
  return Math.round(v * 10) / 10;
}
