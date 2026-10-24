/* ============================================================
 * اپ هوشمند بدنسازی — local data store (Supabase-ready later)
 * All persistence is localStorage for now; the interface mirrors
 * the Supabase schema in supabase/migrations/ so a future sync
 * layer can swap in without touching callers.
 * ============================================================ */

export interface ProgramExercise {
  exerciseKey: string;
  sets: number;
  reps: string; // e.g. "8-10" — kept as string for ranges
  restSeconds: number;
}

export interface WorkoutProgram {
  id: string;
  name: string;
  goal: string; // 'fat-loss' | 'muscle' | 'strength' | 'fitness'
  level?: string;
  daysPerWeek: number;
  days: ProgramExercise[][]; // days[dayIndex] = exercises
  dayKeys?: string[];
  dayNames?: { fa: string; en: string }[];
  createdAt: string; // ISO
}

export interface LoggedSet {
  exerciseKey: string;
  setIndex: number;
  reps: number;
  weightKg: number;
  rpe?: number; // 1-10
  /** false = skipped set — excluded from volume/PR math */
  done?: boolean;
}

export interface WorkoutSession {
  id: string;
  programId: string | null;
  planDayKey?: string;
  planDayName?: string;
  startedAt: string; // ISO
  finishedAt: string | null; // ISO
  durationSec?: number;
  prsHit?: number;
  sets: LoggedSet[];
}

export interface BodyMeasurement {
  date: string; // YYYY-MM-DD
  weightKg?: number;
  bodyFatPct?: number;
  chestCm?: number;
  waistCm?: number;
  armCm?: number;
}

export interface PersonalRecord {
  exerciseKey: string;
  bestWeightKg: number;
  bestReps: number;
  achievedOn: string; // ISO
}

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / unavailable — fail open */
  }
}

const K = {
  programs: 'fitai.programs',
  activeProgram: 'fitai.activeProgramId',
  sessions: 'fitai.sessions',
  measurements: 'fitai.measurements',
  onboarded: 'fitai.onboarded',
};

/* ---------------- programs ---------------- */

export function getPrograms(): WorkoutProgram[] {
  return read<WorkoutProgram[]>(K.programs, []);
}

export function saveProgram(p: Omit<WorkoutProgram, 'id' | 'createdAt'>): WorkoutProgram {
  const full: WorkoutProgram = { ...p, id: uid(), createdAt: new Date().toISOString() };
  const all = getPrograms();
  all.push(full);
  write(K.programs, all);
  return full;
}

export function getActiveProgram(): WorkoutProgram | null {
  const id = read<string | null>(K.activeProgram, null);
  if (!id) return null;
  return getPrograms().find((p) => p.id === id) ?? null;
}

export function setActiveProgram(id: string): void {
  write(K.activeProgram, id);
}

/* ---------------- sessions ---------------- */

export function getSessions(): WorkoutSession[] {
  return read<WorkoutSession[]>(K.sessions, []);
}

export function startSession(programId: string | null): WorkoutSession {
  const s: WorkoutSession = {
    id: uid(),
    programId,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    sets: [],
  };
  const all = getSessions();
  all.push(s);
  write(K.sessions, all);
  return s;
}

export function logSet(sessionId: string, set: Omit<LoggedSet, 'setIndex'>): WorkoutSession | null {
  const all = getSessions();
  const s = all.find((x) => x.id === sessionId);
  if (!s) return null;
  const idx = s.sets.filter((x) => x.exerciseKey === set.exerciseKey).length;
  s.sets.push({ ...set, setIndex: idx });
  write(K.sessions, all);
  return s;
}

export function finishSession(sessionId: string): WorkoutSession | null {
  const all = getSessions();
  const s = all.find((x) => x.id === sessionId);
  if (!s) return null;
  s.finishedAt = new Date().toISOString();
  write(K.sessions, all);
  return s;
}

export interface FinishedSessionInput {
  programId?: string | null;
  planDayKey: string;
  planDayName: string;
  durationSec: number;
  prsHit: number;
  /** ISO timestamp of session finish. */
  finishedAt: string;
  exercises: {
    exerciseKey: string;
    sets: { reps: number; weightKg: number; done: boolean; rpe?: number }[];
  }[];
}

/**
 * Canonical write path for a completed workout session (used by the
 * session overlay via sessionLog.ts). Flattens per-exercise sets into
 * the store's LoggedSet shape so all analytics read one source.
 */
export function saveFinishedSession(input: FinishedSessionInput): WorkoutSession {
  const sets: LoggedSet[] = [];
  for (const ex of input.exercises) {
    ex.sets.forEach((s, i) => {
      sets.push({
        exerciseKey: ex.exerciseKey,
        setIndex: i,
        reps: s.reps,
        weightKg: s.weightKg,
        rpe: s.rpe,
        done: s.done,
      });
    });
  }
  const finishedMs = new Date(input.finishedAt).getTime();
  const session: WorkoutSession = {
    id: uid(),
    programId: input.programId ?? null,
    planDayKey: input.planDayKey,
    planDayName: input.planDayName,
    startedAt: new Date(finishedMs - input.durationSec * 1000).toISOString(),
    finishedAt: input.finishedAt,
    durationSec: input.durationSec,
    prsHit: input.prsHit,
    sets,
  };
  const all = getSessions();
  all.push(session);
  write(K.sessions, all);
  return session;
}

/* ---------------- measurements ---------------- */

export function getMeasurements(): BodyMeasurement[] {
  return read<BodyMeasurement[]>(K.measurements, []);
}

export function saveMeasurement(m: BodyMeasurement): void {
  const all = getMeasurements().filter((x) => x.date !== m.date);
  all.push(m);
  all.sort((a, b) => (a.date < b.date ? -1 : 1));
  write(K.measurements, all);
}

/* ---------------- derived: PRs & volume ---------------- */

export function getPersonalRecords(): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  for (const s of getSessions()) {
    for (const set of s.sets) {
      if (set.done === false) continue;
      const cur = best.get(set.exerciseKey);
      if (!cur || set.weightKg > cur.bestWeightKg) {
        best.set(set.exerciseKey, {
          exerciseKey: set.exerciseKey,
          bestWeightKg: set.weightKg,
          bestReps: set.reps,
          achievedOn: s.startedAt,
        });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.bestWeightKg - a.bestWeightKg);
}

/** Total lifted volume (kg) per day for the last `days` days. */
export function getVolumeByDay(days = 30): { date: string; volumeKg: number }[] {
  const out = new Map<string, number>();
  const cutoff = Date.now() - days * 86400_000;
  for (const s of getSessions()) {
    const t = new Date(s.startedAt).getTime();
    if (t < cutoff) continue;
    const day = s.startedAt.slice(0, 10);
    let v = out.get(day) ?? 0;
    for (const set of s.sets) {
      if (set.done === false) continue;
      v += set.reps * set.weightKg;
    }
    out.set(day, v);
  }
  return [...out.entries()]
    .map(([date, volumeKg]) => ({ date, volumeKg: Math.round(volumeKg) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/* ---------------- onboarding flag ---------------- */

export function isOnboarded(): boolean {
  return read<boolean>(K.onboarded, false);
}

export function setOnboarded(): void {
  write(K.onboarded, true);
}
