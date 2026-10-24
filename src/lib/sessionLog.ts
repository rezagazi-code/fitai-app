/**
 * اپ هوشمند بدنسازی — workout session log.
 *
 * Persists finished workout sessions to localStorage for now. The record
 * shape is forward-compatible with a future `workout_sessions` Supabase
 * table: { id, date, planDayKey, planDayName, durationSec, exercises:
 * [{ exerciseKey, sets: [{ reps, weightKg, done, rpe? }] }], totalVolumeKg }.
 * When the sync layer arrives it can POST these records as-is (plus an
 * owner id) without touching callers.
 */

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

const KEY = 'fitai.workoutSessions';

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `ws-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

function read<T>(fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(value: WorkoutSessionRecord[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — fail open */
  }
}

export function getWorkoutSessions(): WorkoutSessionRecord[] {
  return read<WorkoutSessionRecord[]>([]);
}

/** Append a finished session record. Returns the stored record. */
export function saveWorkoutSession(
  record: Omit<WorkoutSessionRecord, 'id' | 'synced'>,
): WorkoutSessionRecord {
  const full: WorkoutSessionRecord = { ...record, id: uid(), synced: false };
  const all = getWorkoutSessions();
  all.push(full);
  write(all);
  return full;
}

/** Heaviest done set of the most recent session containing this exercise. */
export function getLastPerformance(exerciseKey: string): LastPerformance | null {
  const sessions = getWorkoutSessions();
  for (let i = sessions.length - 1; i >= 0; i--) {
    const ex = sessions[i].exercises.find((e) => e.exerciseKey === exerciseKey);
    if (!ex) continue;
    const done = ex.sets.filter((s) => s.done);
    if (done.length === 0) continue;
    const best = done.reduce((a, b) => (b.weightKg > a.weightKg ? b : a));
    return { weightKg: best.weightKg, reps: best.reps, rpe: best.rpe, date: sessions[i].date };
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
