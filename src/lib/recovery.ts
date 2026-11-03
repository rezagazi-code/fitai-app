/**
 * Musclepro — per-muscle recovery state (second-priority dossier item).
 *
 * Original, local-first logic. For each muscle group we look at the
 * last finished session that trained it (via the exercise → primary
 * muscle map) and how much work it did:
 *   - no history, or last heavy session 4+ days ago  → ready
 *   - last heavy session 2–3 days ago               → semi-ready
 *   - last heavy session 0–1 days ago               → tired
 * A manual override ("I'm ready") beats the calculation for 24 hours.
 * States are deliberately coarse (ready / semi-ready / tired) — never
 * a fake-precise percentage like 73%.
 *
 * Daily adjustment: a day's plan is adjusted, not silently rewritten.
 * Exercises for tired muscles lose one set (minimum 1) and the day
 * carries an explanation line, so the user always sees WHY the day
 * changed. Semi-ready muscles keep their sets. Ready muscles are
 * untouched. This is general training guidance, not a medical
 * assessment: soreness, illness, or pain always outrank the label —
 * the override and the banned filter are the escape hatches.
 */

import { EXERCISES, type MuscleGroup } from './exercises';
import { getSessions } from './store';

export type RecoveryState = 'ready' | 'semi' | 'tired';

export interface MuscleRecovery {
  muscle: MuscleGroup;
  state: RecoveryState;
  daysSinceHeavy: number | null;
  lastHeavyDate: string | null;
  overridden: boolean;
}

const OVERRIDE_KEY = 'fitai.recoveryOverride';

interface OverrideMap {
  [muscle: string]: string; // ISO timestamp of the override
}

function readOverrides(): OverrideMap {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as OverrideMap) : {};
  } catch {
    return {};
  }
}

export function setRecoveryReady(muscle: MuscleGroup): void {
  try {
    const map = readOverrides();
    map[muscle] = new Date().toISOString();
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — fail open */
  }
}

export function clearRecoveryOverride(muscle: MuscleGroup): void {
  try {
    const map = readOverrides();
    delete map[muscle];
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable */
  }
}

const DAY_MS = 86400_000;

function muscleOfExercise(key: string): MuscleGroup | null {
  const ex = EXERCISES.find((e) => e.key === key);
  return ex ? ex.muscle : null;
}

/** Last finished session date (local date string) that trained a muscle. */
function lastHeavyDateFor(muscle: MuscleGroup, nowMs: number): string | null {
  let best: number | null = null;
  for (const s of getSessions()) {
    if (!s.finishedAt) continue;
    const doneSets = s.sets.filter((x) => x.done !== false);
    if (doneSets.length === 0) continue;
    const trainsMuscle = doneSets.some((x) => muscleOfExercise(x.exerciseKey) === muscle);
    if (!trainsMuscle) continue;
    const t = new Date(s.startedAt).getTime();
    if (Number.isNaN(t)) continue;
    if (t > nowMs) continue;
    if (best === null || t > best) best = t;
  }
  if (best === null) return null;
  const d = new Date(best);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function recoveryForMuscle(muscle: MuscleGroup, now = new Date()): MuscleRecovery {
  const overrides = readOverrides();
  const overrideAt = overrides[muscle] ? new Date(overrides[muscle]).getTime() : NaN;
  if (!Number.isNaN(overrideAt) && now.getTime() - overrideAt < DAY_MS) {
    const last = lastHeavyDateFor(muscle, now.getTime());
    return { muscle, state: 'ready', daysSinceHeavy: null, lastHeavyDate: last, overridden: true };
  }
  const last = lastHeavyDateFor(muscle, now.getTime());
  if (!last) {
    return { muscle, state: 'ready', daysSinceHeavy: null, lastHeavyDate: null, overridden: false };
  }
  const lastMs = new Date(`${last}T00:00:00`).getTime();
  const todayMs = new Date(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T00:00:00`).getTime();
  const days = Math.max(0, Math.round((todayMs - lastMs) / DAY_MS));
  const state: RecoveryState = days <= 1 ? 'tired' : days <= 3 ? 'semi' : 'ready';
  return { muscle, state, daysSinceHeavy: days, lastHeavyDate: last, overridden: false };
}

export function recoveryMap(now = new Date()): Record<MuscleGroup, MuscleRecovery> {
  const muscles: MuscleGroup[] = [
    'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core', 'calves', 'forearms', 'fullbody',
  ];
  const out = {} as Record<MuscleGroup, MuscleRecovery>;
  for (const m of muscles) out[m] = recoveryForMuscle(m, now);
  return out;
}

export interface DayAdjustment {
  /** Exercise keys whose sets were reduced by one. */
  reducedKeys: string[];
  /** Muscles that were tired for this day. */
  tiredMuscles: MuscleGroup[];
  /** Human-readable explanation (fa). */
  noteFa: string;
  /** Human-readable explanation (en). */
  noteEn: string;
}

export interface AdjustableExercise {
  exerciseKey: string;
  sets: number;
}

/**
 * Adjust one day's exercises for recovery. Returns the adjusted list
 * plus an explanation. Pure function apart from reading sessions (via
 * recoveryMap) — callers decide whether to apply it.
 */
export function adjustDayForRecovery(
  exercises: AdjustableExercise[],
  now = new Date(),
): { exercises: AdjustableExercise[]; adjustment: DayAdjustment | null } {
  const rec = recoveryMap(now);
  const tired = new Set<MuscleGroup>();
  const reducedKeys: string[] = [];
  const adjusted = exercises.map((e) => {
    const muscle = muscleOfExercise(e.exerciseKey);
    if (muscle && rec[muscle].state === 'tired' && e.sets > 1) {
      tired.add(muscle);
      reducedKeys.push(e.exerciseKey);
      return { ...e, sets: e.sets - 1 };
    }
    return e;
  });
  if (tired.size === 0) return { exercises: adjusted, adjustment: null };
  return {
    exercises: adjusted,
    adjustment: {
      reducedKeys,
      tiredMuscles: [...tired],
      noteFa: 'تنظیم روزانه بر اساس ریکاوری: این عضلات هنوز خسته‌اند، پس یک ست از حرکت‌هایشان کم شد تا با فرم خوب تمرین کنی.',
      noteEn: 'Daily recovery adjustment: these muscles are still tired, so one set was removed from their exercises to keep your form good.',
    },
  };
}
