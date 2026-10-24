/**
 * اپ هوشمند بدنسازی — progression engine (minimal v1).
 *
 * `nextProgression` powers the live "suggestion + reason" line inside the
 * workout session: it looks at the athlete's logged history and returns a
 * weight/reps suggestion for the next set together with a one-line reason
 * in Persian/English. Simple double-progression:
 *   - all sets hit the top of the rep range  → add weight (+2.5 kg)
 *   - average RPE high (≥ 8.5)               → hold weight, explain why
 *   - average RPE low (≤ 6)                  → small bump (+2.5 kg)
 *   - otherwise                              → repeat last performance
 *
 * The coordinator may replace/extend this with a richer AI model later;
 * the exported signature is the contract the session UI depends on.
 */

import { getWorkoutSessions, type WorkoutSessionRecord } from './sessionLog';

export interface ProgressionSuggestion {
  weightKg: number;
  reps: number;
  reasonFa: string;
  reasonEn: string;
  /** Where the suggestion came from. */
  source: 'progression' | 'last-session' | 'plan';
}

/** Parse a plan rep range like "8-10" or "12". */
export function parseRepRange(reps: string): { low: number; high: number } {
  const m = reps.trim().match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (!m) return { low: 8, high: 10 };
  const low = parseInt(m[1], 10);
  const high = m[2] ? parseInt(m[2], 10) : low;
  return { low, high };
}

/** Round to the nearest 2.5 kg plate step (Iranian gym standard). */
export function roundToPlateStep(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

interface LastDone {
  weightKg: number;
  reps: number;
  rpe?: number;
  date: string;
}

/** Most recent finished session's done sets for an exercise (newest first). */
function recentDoneSets(
  exerciseKey: string,
  sessions: WorkoutSessionRecord[],
  limit = 1,
): LastDone[] {
  const out: LastDone[] = [];
  for (const s of sessions) {
    const ex = s.exercises.find((e) => e.exerciseKey === exerciseKey);
    if (!ex) continue;
    const done = ex.sets.filter((st) => st.done);
    if (done.length === 0) continue;
    for (const st of done) {
      out.push({ weightKg: st.weightKg, reps: st.reps, rpe: st.rpe, date: s.date });
    }
    if (--limit <= 0) break;
  }
  return out;
}

/**
 * Suggest weight/reps for the next set of an exercise.
 * Returns null when there is no logged history — the caller then falls
 * back to the plan's own sets/reps.
 */
export function nextProgression(
  exerciseKey: string,
  planReps: string,
): ProgressionSuggestion | null {
  const sessions = getWorkoutSessions();
  const last = recentDoneSets(exerciseKey, sessions, 1);
  if (last.length === 0) return null;

  const { high } = parseRepRange(planReps);
  const topWeight = Math.max(...last.map((s) => s.weightKg));
  const atTop = last.filter((s) => s.weightKg === topWeight);
  const avgReps = atTop.reduce((n, s) => n + s.reps, 0) / atTop.length;
  const rpes = last.map((s) => s.rpe).filter((r): r is number => typeof r === 'number');
  const avgRpe = rpes.length > 0 ? rpes.reduce((n, r) => n + r, 0) / rpes.length : null;
  const repsText = `${Math.round(avgReps)}×${topWeight}`;

  // Case 1: crushed the top of the range → add weight.
  if (avgReps >= high) {
    const next = roundToPlateStep(topWeight + 2.5);
    return {
      weightKg: next,
      reps: Math.round(avgReps),
      source: 'progression',
      reasonFa: `چون دفعه قبل همه ست‌ها رو کامل زدی (${repsText})، امروز ${next} کیلو پیشنهاد می‌شه.`,
      reasonEn: `You hit every set last time (${Math.round(avgReps)}×${topWeight} kg), so today calls for ${next} kg.`,
    };
  }

  // Case 2: it felt brutal → hold the weight, say so honestly.
  if (avgRpe !== null && avgRpe >= 8.5) {
    return {
      weightKg: topWeight,
      reps: Math.round(avgReps),
      source: 'last-session',
      reasonFa: `چون دفعه قبل سختی ست‌ها بالا بود (RPE حدود ${avgRpe.toFixed(1)})، وزنه ثابت می‌مونه تا فرم خراب نشه.`,
      reasonEn: `Last time felt hard (RPE ~${avgRpe.toFixed(1)}), so the weight stays put to protect your form.`,
    };
  }

  // Case 3: it felt easy → small bump.
  if (avgRpe !== null && avgRpe <= 6) {
    const next = roundToPlateStep(topWeight + 2.5);
    return {
      weightKg: next,
      reps: Math.round(avgReps),
      source: 'progression',
      reasonFa: `چون دفعه قبل برات راحت بود (RPE حدود ${avgRpe.toFixed(1)})، یه پله وزنه اضافه می‌کنیم: ${next} کیلو.`,
      reasonEn: `It felt easy last time (RPE ~${avgRpe.toFixed(1)}), so we add one plate step: ${next} kg.`,
    };
  }

  // Case 4: steady — repeat last performance.
  return {
    weightKg: topWeight,
    reps: Math.round(avgReps),
    source: 'last-session',
    reasonFa: `تکرار عملکرد دفعه قبل (${repsText})؛ هدف امروز: همه ست‌ها با فرم تمیز.`,
    reasonEn: `Repeat last time's work (${Math.round(avgReps)}×${topWeight} kg); today's goal: every set with clean form.`,
  };
}

/** Best-ever done weight for an exercise across all logged sessions. */
export function personalBestWeight(exerciseKey: string): number {
  let best = 0;
  for (const s of getWorkoutSessions()) {
    const ex = s.exercises.find((e) => e.exerciseKey === exerciseKey);
    if (!ex) continue;
    for (const st of ex.sets) {
      if (st.done && st.weightKg > best) best = st.weightKg;
    }
  }
  return best;
}

/* ============================================================
 * PART 2 — Program generation engine (pure, unit-testable)
 * ============================================================
 * NOTE: the existing `nextProgression(exerciseKey, planReps)` above is
 * the live contract of the session UI (WorkoutSession.tsx). The
 * plan-level tip analyzer below is therefore named
 * `analyzeProgressionTips` instead of overloading that name.
 * ============================================================ */

import {
  EXERCISES,
  EQUIPMENT_LABELS,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from './exercises';
// WorkoutSessionRecord type is already imported at the top of this file
// (from './sessionLog') and is reused below.

/* ---------------- Types ---------------- */

export type GoalKey = 'fatloss' | 'muscle' | 'strength' | 'general';
export type LevelKey = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentKey = Equipment;

export interface UserProfile {
  goal: GoalKey;
  level: LevelKey;
  /** 2..6 (clamped) */
  daysPerWeek: number;
  equipment: EquipmentKey[];
  /** Free-form; normalized internally (en + fa aliases), e.g. 'shoulder', 'زانو' */
  injuries: string[];
}

export interface PlanExercise {
  exerciseKey: string;
  sets: number;
  /** e.g. "8-12", "10", "45s" for timed holds */
  reps: string;
  restSeconds: number;
  noteFa?: string;
  noteEn?: string;
}

export interface PlanDay {
  key: string;
  nameFa: string;
  nameEn: string;
  exercises: PlanExercise[];
}

export interface WorkoutPlan {
  id: string;
  createdAt: string; // ISO
  goal: GoalKey;
  level: LevelKey;
  daysPerWeek: number;
  days: PlanDay[];
}

/** One training session's log for a single exercise. */
export interface SessionLog {
  exerciseKey: string;
  /** ISO date */
  date: string;
  sets: { reps: number; weightKg: number }[];
}

export interface ProgressionTip {
  /** key into PROGRAM_KEYS[lang] */
  tipKey: 'increase-weight' | 'plateau' | 'new-pr';
  params: Record<string, string | number>;
}

/* ---------------- Exercise index ---------------- */

const EXERCISE_MAP = new Map<string, Exercise>(
  EXERCISES.map((e) => [e.key, e]),
);

const EXERCISES_BY_MUSCLE = new Map<MuscleGroup, Exercise[]>();
for (const e of EXERCISES) {
  const arr = EXERCISES_BY_MUSCLE.get(e.muscle);
  if (arr) arr.push(e);
  else EXERCISES_BY_MUSCLE.set(e.muscle, [e]);
}

/** Throw a clear dev-time error listing any unknown exercise key. */
export function assertValidExerciseKeys(keys: string[]): void {
  const missing = keys.filter((k) => !EXERCISE_MAP.has(k));
  if (missing.length > 0) {
    throw new Error(
      `[program] Unknown exercise key(s) referenced: ${missing.join(', ')}. ` +
        'All exerciseKey values must exist in src/lib/exercises.ts.',
    );
  }
}

/* ---------------- Deterministic RNG ---------------- */

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- Injuries: conservative exclusions ---------------- */

type InjuryKind = 'shoulder' | 'knee' | 'back' | 'wrist' | 'elbow' | 'neck';

const INJURY_ALIASES: Record<InjuryKind, string[]> = {
  shoulder: ['shoulder', 'shoulders', 'شانه', 'کتف'],
  knee: ['knee', 'knees', 'زانو'],
  back: ['back', 'lower-back', 'lowerback', 'low-back', 'کمر', 'پشت'],
  wrist: ['wrist', 'wrists', 'مچ', 'مچ دست'],
  elbow: ['elbow', 'elbows', 'آرنج'],
  neck: ['neck', 'گردن'],
};

function normalizeInjuries(injuries: string[]): InjuryKind[] {
  const out: InjuryKind[] = [];
  for (const raw of injuries) {
    const s = raw.trim().toLowerCase();
    if (!s) continue;
    let matched: InjuryKind | null = null;
    for (const kind of Object.keys(INJURY_ALIASES) as InjuryKind[]) {
      if (INJURY_ALIASES[kind].some((a) => s === a || s.includes(a))) {
        matched = kind;
        break;
      }
    }
    if (matched && !out.includes(matched)) out.push(matched);
  }
  return out;
}

/**
 * Conservative exclusion matchers per injury. Each matcher returns true
 * when the exercise must be excluded for that injury.
 */
const INJURY_MATCHERS: Record<InjuryKind, (e: Exercise) => boolean> = {
  // No pressing of any kind, no dips, no push-ups, no direct shoulder work.
  shoulder: (e) =>
    /press|dip|overhead|push-up/.test(e.key) || e.muscle === 'shoulders',
  // No knee-flexion under load: squats, lunges, hinges, leg machines.
  knee: (e) =>
    /squat|lunge|step-up|sissy|pistol|leg-press|leg-extension|leg-curl|hack|wall-sit|deadlift/.test(
      e.key,
    ),
  // No spinal loading / hinging: deadlifts, bent-over rows, hyperextensions.
  back: (e) =>
    /deadlift|good-morning|hyperextension|superman|barbell-row|t-bar-row|clean-and-press|turkish-get-up/.test(
      e.key,
    ),
  // No heavy barbell pressing, no loaded wrist flexion/extension.
  wrist: (e) =>
    (/press/.test(e.key) && e.equipment.includes('barbell')) ||
    [
      'wrist-curl',
      'reverse-wrist-curl',
      'wrist-roller',
      'plate-pinch',
      'farmers-walk',
      'clean-and-press',
      'dumbbell-snatch',
    ].includes(e.key),
  // No skullcrushers / pushdowns / dips.
  elbow: (e) =>
    /skullcrusher|pushdown|dip|overhead-(dumbbell|barbell)-extension|seated-barbell-extension/.test(
      e.key,
    ),
  // No behind-neck work, no shrugs, no upright rows.
  neck: (e) => /behind-neck-press|shrug|upright-row/.test(e.key),
};

/** All exercise keys excluded for the given raw injury strings. */
export function injuryExcludedKeys(injuries: string[]): Set<string> {
  const kinds = normalizeInjuries(injuries);
  const out = new Set<string>();
  for (const kind of kinds) {
    const match = INJURY_MATCHERS[kind];
    for (const e of EXERCISES) {
      if (match(e)) out.add(e.key);
    }
  }
  return out;
}

/* ---------------- Level gating ---------------- */

const LEVEL_EXCLUDED_KEYS: Record<LevelKey, string[]> = {
  beginner: [
    'pistol-squat',
    'clean-and-press',
    'dumbbell-snatch',
    'turkish-get-up',
    'man-maker',
    'weighted-dip',
    'behind-neck-press',
    'deadlift',
    'sumo-deadlift',
    'barbell-squat',
    'front-squat',
    'hack-squat',
    'overhead-press',
    'arnold-press',
  ],
  intermediate: [
    'pistol-squat',
    'clean-and-press',
    'dumbbell-snatch',
    'turkish-get-up',
    'man-maker',
    'behind-neck-press',
  ],
  advanced: [],
};

/* ---------------- Candidate pool ---------------- */

function isEquipmentCompatible(e: Exercise, owned: EquipmentKey[]): boolean {
  return e.equipment.every((tag) => owned.includes(tag));
}

interface PoolOptions {
  relaxEquipment?: boolean;
}

/** Exercises for a muscle, filtered by equipment / level / injuries. */
function candidatePool(
  muscle: MuscleGroup,
  profile: UserProfile,
  excluded: Set<string>,
  opts: PoolOptions = {},
): Exercise[] {
  const levelBlocked = new Set(LEVEL_EXCLUDED_KEYS[profile.level]);
  const owned = opts.relaxEquipment ? undefined : profile.equipment;
  return (EXERCISES_BY_MUSCLE.get(muscle) ?? []).filter((e) => {
    if (excluded.has(e.key)) return false;
    if (levelBlocked.has(e.key)) return false;
    if (owned && !isEquipmentCompatible(e, owned)) return false;
    return true;
  });
}

/* ---------------- Sets / reps / rest schemes ---------------- */

const TIMED_KEY_RE = /plank|wall-sit|dead-hang|dead-bug|superman|bird-dog/;

function isTimed(e: Exercise): boolean {
  return TIMED_KEY_RE.test(e.key);
}

function isCompound(e: Exercise): boolean {
  return e.secondary.length >= 2;
}

interface Scheme {
  sets: number;
  reps: string;
  restSeconds: number;
}

function schemeFor(goal: GoalKey, e: Exercise): Scheme {
  const compound = isCompound(e);
  if (isTimed(e)) {
    const hold =
      goal === 'strength' ? '30s' : goal === 'muscle' ? '45s' : goal === 'fatloss' ? '45s' : '30s';
    return { sets: 3, reps: hold, restSeconds: goal === 'fatloss' ? 45 : 60 };
  }
  switch (goal) {
    case 'strength':
      return {
        sets: compound ? 5 : 4,
        reps: '4-6',
        restSeconds: compound ? 180 : 150,
      };
    case 'muscle':
      return {
        sets: compound ? 4 : 3,
        reps: '8-12',
        restSeconds: compound ? 120 : 90,
      };
    case 'fatloss':
      return {
        sets: 3,
        reps: '12-15',
        // circuit-style, shorter rest
        restSeconds: compound ? 60 : 45,
      };
    case 'general':
    default:
      return {
        sets: 3,
        reps: '10',
        restSeconds: compound ? 120 : 90,
      };
  }
}

/* ---------------- Split templates ---------------- */

interface DayTemplate {
  key: string;
  nameFa: string;
  nameEn: string;
  /** [muscle, exerciseCount] */
  blocks: [MuscleGroup, number][];
}

const T_FULL_A: DayTemplate = {
  key: 'full-a',
  nameFa: 'تمام‌بدن A',
  nameEn: 'Full body A',
  blocks: [
    ['legs', 2],
    ['chest', 1],
    ['back', 1],
    ['shoulders', 1],
    ['biceps', 1],
    ['triceps', 1],
    ['core', 1],
  ],
};

const T_FULL_B: DayTemplate = {
  key: 'full-b',
  nameFa: 'تمام‌بدن B',
  nameEn: 'Full body B',
  blocks: [
    ['glutes', 1],
    ['legs', 1],
    ['chest', 1],
    ['back', 1],
    ['shoulders', 1],
    ['core', 1],
    ['calves', 1],
    ['forearms', 1],
  ],
};

const T_UPPER_A: DayTemplate = {
  key: 'upper-a',
  nameFa: 'بالاتنه A',
  nameEn: 'Upper A',
  blocks: [
    ['chest', 2],
    ['back', 2],
    ['shoulders', 1],
    ['biceps', 1],
    ['triceps', 1],
    ['core', 1],
  ],
};

const T_UPPER_B: DayTemplate = {
  key: 'upper-b',
  nameFa: 'بالاتنه B',
  nameEn: 'Upper B',
  blocks: [
    ['chest', 1],
    ['back', 2],
    ['shoulders', 2],
    ['biceps', 1],
    ['triceps', 1],
    ['forearms', 1],
  ],
};

const T_LOWER_A: DayTemplate = {
  key: 'lower-a',
  nameFa: 'پایین‌تنه A',
  nameEn: 'Lower A',
  blocks: [
    ['legs', 3],
    ['glutes', 2],
    ['calves', 1],
    ['core', 1],
  ],
};

const T_LOWER_B: DayTemplate = {
  key: 'lower-b',
  nameFa: 'پایین‌تنه B',
  nameEn: 'Lower B',
  blocks: [
    ['legs', 2],
    ['glutes', 2],
    ['calves', 1],
    ['core', 1],
    ['fullbody', 1],
  ],
};

const T_PUSH: DayTemplate = {
  key: 'push',
  nameFa: 'پوش',
  nameEn: 'Push',
  blocks: [
    ['chest', 2],
    ['shoulders', 2],
    ['triceps', 2],
    ['core', 1],
  ],
};

const T_PULL: DayTemplate = {
  key: 'pull',
  nameFa: 'پول',
  nameEn: 'Pull',
  blocks: [
    ['back', 3],
    ['biceps', 2],
    ['forearms', 1],
    ['core', 1],
  ],
};

const T_LEGS: DayTemplate = {
  key: 'legs',
  nameFa: 'پا',
  nameEn: 'Legs',
  blocks: [
    ['legs', 3],
    ['glutes', 2],
    ['calves', 1],
    ['core', 1],
  ],
};

const T_FULL_C: DayTemplate = {
  key: 'full-c',
  nameFa: 'تمام‌بدن',
  nameEn: 'Full body',
  blocks: [
    ['legs', 2],
    ['glutes', 1],
    ['chest', 1],
    ['back', 1],
    ['shoulders', 1],
    ['core', 1],
  ],
};

function splitFor(daysPerWeek: number): DayTemplate[] {
  const d = Math.max(2, Math.min(6, Math.round(daysPerWeek)));
  switch (d) {
    case 2:
      return [T_FULL_A, T_FULL_B];
    case 3:
      // A/B rotation across 3 days: A, B, A
      return [
        T_FULL_A,
        T_FULL_B,
        {
          ...T_FULL_A,
          key: 'full-a-2',
          nameFa: 'تمام‌بدن A (تکرار)',
          nameEn: 'Full body A (repeat)',
        },
      ];
    case 4:
      return [T_UPPER_A, T_LOWER_A, T_UPPER_B, T_LOWER_B];
    case 5:
      return [T_PUSH, T_PULL, T_LEGS, T_UPPER_B, T_LOWER_A];
    case 6:
    default:
      return [T_PUSH, T_PULL, T_LEGS, T_UPPER_A, T_LOWER_B, T_FULL_C];
  }
}

/* ---------------- generateProgram ---------------- */

function makePlanId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `plan-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

function missingEquipmentNote(
  e: Exercise,
  owned: EquipmentKey[],
): { noteFa?: string; noteEn?: string } {
  const missing = e.equipment.filter((t) => !owned.includes(t));
  if (missing.length === 0) return {};
  const fa = missing.map((t) => EQUIPMENT_LABELS[t].fa).join('، ');
  const en = missing.map((t) => EQUIPMENT_LABELS[t].en).join(', ');
  return {
    noteFa: `نیاز به وسیله: ${fa}`,
    noteEn: `Requires equipment: ${en}`,
  };
}

/**
 * Pick `count` exercises for one muscle block of one day.
 * - never duplicates a key inside the same day
 * - biases toward exercises used least across the week (variety)
 * - deterministic via seeded RNG
 */
function pickForBlock(
  muscle: MuscleGroup,
  count: number,
  profile: UserProfile,
  excluded: Set<string>,
  dayKeys: Set<string>,
  weeklyUse: Map<string, number>,
  seedBase: string,
): { picked: Exercise[]; relaxed: boolean } {
  let pool = candidatePool(muscle, profile, excluded);
  let relaxed = false;
  if (pool.length === 0) {
    // Fallback: ignore equipment (flagged with a note on the exercise).
    pool = candidatePool(muscle, profile, excluded, { relaxEquipment: true });
    relaxed = true;
  }
  if (pool.length === 0) return { picked: [], relaxed };

  const rnd = mulberry32(hashString(`${seedBase}|${muscle}`));
  // Fisher–Yates shuffle, then stable preference for least-used-weekly.
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  shuffled.sort(
    (a, b) => (weeklyUse.get(a.key) ?? 0) - (weeklyUse.get(b.key) ?? 0),
  );

  const picked: Exercise[] = [];
  for (const e of shuffled) {
    if (picked.length >= count) break;
    if (dayKeys.has(e.key)) continue;
    picked.push(e);
    dayKeys.add(e.key);
    weeklyUse.set(e.key, (weeklyUse.get(e.key) ?? 0) + 1);
  }
  return { picked, relaxed };
}

export function generateProgram(profile: UserProfile): WorkoutPlan {
  const daysPerWeek = Math.max(2, Math.min(6, Math.round(profile.daysPerWeek)));
  const excluded = injuryExcludedKeys(profile.injuries);
  const templates = splitFor(daysPerWeek);
  const weeklyUse = new Map<string, number>();

  const seedBase = JSON.stringify({
    g: profile.goal,
    l: profile.level,
    d: daysPerWeek,
    e: [...profile.equipment].sort(),
    i: normalizeInjuries(profile.injuries),
  });

  const days: PlanDay[] = templates.map((t) => {
    const dayKeys = new Set<string>();
    const exercises: PlanExercise[] = [];
    const allKeys: string[] = [];

    for (const [muscle, count] of t.blocks) {
      const { picked, relaxed } = pickForBlock(
        muscle,
        count,
        profile,
        excluded,
        dayKeys,
        weeklyUse,
        `${seedBase}|${t.key}`,
      );
      for (const e of picked) {
        const s = schemeFor(profile.goal, e);
        exercises.push({
          exerciseKey: e.key,
          sets: s.sets,
          reps: s.reps,
          restSeconds: s.restSeconds,
          ...(relaxed ? missingEquipmentNote(e, profile.equipment) : {}),
        });
        allKeys.push(e.key);
      }
    }

    assertValidExerciseKeys(allKeys);
    return { key: t.key, nameFa: t.nameFa, nameEn: t.nameEn, exercises };
  });

  return {
    id: makePlanId(),
    createdAt: new Date().toISOString(),
    goal: profile.goal,
    level: profile.level,
    daysPerWeek,
    days,
  };
}

/* ---------------- Progression tips ---------------- */

/** Top of the rep range: "8-12" -> 12, "10" -> 10, "45s" -> null (timed). */
function repRangeTop(reps: string): number | null {
  const m = reps.match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
  if (!m) return null;
  if (/s$/.test(reps.trim())) return null; // timed hold
  return parseInt(m[2] ?? m[1], 10);
}

/** Epley estimated 1RM. */
function epley1rm(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

function bestSetEpley(sets: { reps: number; weightKg: number }[]): number {
  return Math.max(0, ...sets.map((s) => epley1rm(s.weightKg, s.reps)));
}

function sessionsIdentical(a: SessionLog, b: SessionLog): boolean {
  if (a.sets.length !== b.sets.length) return false;
  return a.sets.every(
    (s, i) => s.reps === b.sets[i].reps && s.weightKg === b.sets[i].weightKg,
  );
}

/**
 * Analyze recent logs against the plan's rep schemes.
 * Pure: no side effects.
 *
 * - all sets hit the top of the rep range 2 sessions in a row → +2.5kg
 * - identical weight+reps 3 sessions in a row → variation / deload tip
 * - latest session beats every earlier session's epley 1RM → new-PR tip
 */
export function analyzeProgressionTips(
  plan: WorkoutPlan,
  recentLogs: SessionLog[],
): ProgressionTip[] {
  const tips: ProgressionTip[] = [];
  const schemeByKey = new Map<string, string>();
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      if (!schemeByKey.has(ex.exerciseKey)) schemeByKey.set(ex.exerciseKey, ex.reps);
    }
  }

  const byExercise = new Map<string, SessionLog[]>();
  for (const log of recentLogs) {
    const arr = byExercise.get(log.exerciseKey);
    if (arr) arr.push(log);
    else byExercise.set(log.exerciseKey, [log]);
  }

  for (const [key, logs] of byExercise) {
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) continue;
    const top = repRangeTop(schemeByKey.get(key) ?? '');
    const last = sorted[sorted.length - 1];
    const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null;

    // (a) all sets hit the top of the rep range, 2 sessions in a row
    if (top !== null && prev) {
      const hitTop = (s: SessionLog) =>
        s.sets.length > 0 && s.sets.every((set) => set.reps >= top);
      if (hitTop(last) && hitTop(prev)) {
        tips.push({
          tipKey: 'increase-weight',
          params: { exerciseKey: key, weightKg: 2.5 },
        });
      }
    }

    // (c) new PR: latest session's best epley 1RM beats every earlier session
    if (sorted.length >= 2) {
      const lastBest = bestSetEpley(last.sets);
      const prevBest = Math.max(
        ...sorted.slice(0, -1).map((s) => bestSetEpley(s.sets)),
      );
      if (lastBest > prevBest && lastBest > 0) {
        const bestSet = last.sets.reduce((a, b) =>
          epley1rm(b.weightKg, b.reps) > epley1rm(a.weightKg, a.reps) ? b : a,
        );
        tips.push({
          tipKey: 'new-pr',
          params: {
            exerciseKey: key,
            weightKg: bestSet.weightKg,
            reps: bestSet.reps,
          },
        });
      }
    }

    // (b) identical weight+reps for 3 sessions in a row → variation / deload
    if (sorted.length >= 3) {
      const [s1, s2, s3] = sorted.slice(-3);
      if (sessionsIdentical(s1, s2) && sessionsIdentical(s2, s3)) {
        tips.push({ tipKey: 'plateau', params: { exerciseKey: key } });
      }
    }
  }

  return tips;
}

/** Adapt live sessionLog.ts WorkoutSessionRecord rows into SessionLog[]. */
export function sessionRecordsToLogs(
  sessions: WorkoutSessionRecord[],
): SessionLog[] {
  const byKey = new Map<string, Map<string, { reps: number; weightKg: number }[]>>();
  for (const s of sessions) {
    const date = s.date.slice(0, 10);
    for (const ex of s.exercises) {
      let m = byKey.get(ex.exerciseKey);
      if (!m) {
        m = new Map();
        byKey.set(ex.exerciseKey, m);
      }
      const arr = m.get(date) ?? [];
      for (const set of ex.sets) {
        if (set.done) arr.push({ reps: set.reps, weightKg: set.weightKg });
      }
      m.set(date, arr);
    }
  }
  const out: SessionLog[] = [];
  for (const [exerciseKey, dates] of byKey) {
    for (const [date, sets] of dates) {
      if (sets.length > 0) out.push({ exerciseKey, date, sets });
    }
  }
  return out;
}

/* ---------------- swapExercise ---------------- */

/**
 * Pick a same-muscle alternative for the "swap" button:
 * same primary muscle, equipment-compatible with the profile,
 * not already in the day, honoring injuries + level.
 * Keeps the original sets/reps/rest scheme.
 */
export function swapExercise(
  planDay: PlanDay,
  exerciseKey: string,
  profile: UserProfile,
): PlanExercise {
  const original = planDay.exercises.find((e) => e.exerciseKey === exerciseKey);
  if (!original) {
    throw new Error(
      `[program] swapExercise: exerciseKey "${exerciseKey}" not found in day "${planDay.key}".`,
    );
  }
  const meta = EXERCISE_MAP.get(exerciseKey);
  if (!meta) {
    throw new Error(`[program] swapExercise: unknown exerciseKey "${exerciseKey}".`);
  }

  const excluded = injuryExcludedKeys(profile.injuries);
  const levelBlocked = new Set(LEVEL_EXCLUDED_KEYS[profile.level]);
  const inDay = new Set(planDay.exercises.map((e) => e.exerciseKey));
  const primaryEquip = meta.equipment[0];

  const scored = (EXERCISES_BY_MUSCLE.get(meta.muscle) ?? [])
    .filter(
      (e) =>
        e.key !== exerciseKey &&
        !inDay.has(e.key) &&
        !excluded.has(e.key) &&
        !levelBlocked.has(e.key) &&
        isEquipmentCompatible(e, profile.equipment),
    )
    .map((e) => ({
      e,
      score:
        (e.equipment[0] === primaryEquip ? 0 : 1) +
        (e.secondary.length === meta.secondary.length ? 0 : 0.5),
    }))
    .sort((a, b) => a.score - b.score || a.e.key.localeCompare(b.e.key));

  if (scored.length === 0) {
    throw new Error(
      `[program] swapExercise: no same-muscle alternative for "${exerciseKey}" ` +
        'with the current equipment/injuries/level.',
    );
  }

  const alt = scored[0].e;
  return {
    exerciseKey: alt.key,
    sets: original.sets,
    reps: original.reps,
    restSeconds: original.restSeconds,
  };
}

/* ---------------- PROGRAM_KEYS ---------------- */

export const PROGRAM_KEYS: {
  fa: Record<string, string>;
  en: Record<string, string>;
} = {
  fa: {
    'increase-weight':
      'دو جلسه پشت سر هم به سقف تکرار رسیدی — وقتشه ۲٫۵ کیلوگرم به وزنه اضافه کنی.',
    plateau:
      'سه جلسه است که وزنه و تکرار ثابت مانده؛ یک حرکت جایگزین یا یک هفته سبک (دیلود) را امتحان کن.',
    'new-pr': 'رکورد جدید! ادامه بده، داری پیشرفت می‌کنی.',
  },
  en: {
    'increase-weight':
      'You hit the top of the rep range two sessions in a row — time to add 2.5 kg.',
    plateau:
      'Weight and reps have been identical for three sessions; try a variation or a deload week.',
    'new-pr': 'New personal record! Keep going, you are progressing.',
  },
};

/* ---------------- Self-test ---------------- */

interface TestProfile {
  name: string;
  profile: UserProfile;
}

const SELF_TEST_PROFILES: TestProfile[] = [
  {
    name: 'beginner / fatloss / 3d / dumbbells',
    profile: {
      goal: 'fatloss',
      level: 'beginner',
      daysPerWeek: 3,
      equipment: ['bodyweight', 'dumbbell'],
      injuries: [],
    },
  },
  {
    name: 'intermediate / muscle / 5d / full gym',
    profile: {
      goal: 'muscle',
      level: 'intermediate',
      daysPerWeek: 5,
      equipment: [
        'bodyweight',
        'dumbbell',
        'barbell',
        'cable',
        'machine',
        'bench',
        'band',
        'kettlebell',
      ],
      injuries: [],
    },
  },
  {
    name: 'advanced / strength / 4d / knee injury',
    profile: {
      goal: 'strength',
      level: 'advanced',
      daysPerWeek: 4,
      equipment: [
        'bodyweight',
        'dumbbell',
        'barbell',
        'cable',
        'machine',
        'bench',
        'band',
        'kettlebell',
      ],
      injuries: ['knee'],
    },
  },
  {
    name: 'beginner / general / 2d / bodyweight only',
    profile: {
      goal: 'general',
      level: 'beginner',
      daysPerWeek: 2,
      equipment: ['bodyweight'],
      injuries: [],
    },
  },
  {
    name: 'advanced / muscle / 6d / shoulder injury',
    profile: {
      goal: 'muscle',
      level: 'advanced',
      daysPerWeek: 6,
      equipment: [
        'bodyweight',
        'dumbbell',
        'barbell',
        'cable',
        'machine',
        'bench',
        'band',
        'kettlebell',
      ],
      injuries: ['shoulder'],
    },
  },
];

/** Major muscles that must appear weekly (legs/glutes relaxed for knee/back injuries). */
const ALWAYS_COVER: MuscleGroup[] = ['chest', 'back', 'shoulders', 'core'];

export function runProgramSelfTest(): string[] {
  const errors: string[] = [];
  const fail = (msg: string) => errors.push(msg);

  // 0. Static data sanity: level-exclusion keys must exist.
  for (const level of Object.keys(LEVEL_EXCLUDED_KEYS) as LevelKey[]) {
    for (const k of LEVEL_EXCLUDED_KEYS[level]) {
      if (!EXERCISE_MAP.has(k)) {
        fail(`LEVEL_EXCLUDED_KEYS[${level}] references unknown key "${k}"`);
      }
    }
  }

  // 0b. Every injury kind must exclude at least one real exercise.
  for (const kind of Object.keys(INJURY_MATCHERS) as InjuryKind[]) {
    const n = EXERCISES.filter((e) => INJURY_MATCHERS[kind](e)).length;
    if (n === 0) fail(`INJURY_MATCHERS[${kind}] excludes nothing — rule is dead`);
  }

  // 0c. PROGRAM_KEYS fa/en parity.
  const faKeys = Object.keys(PROGRAM_KEYS.fa).sort().join(',');
  const enKeys = Object.keys(PROGRAM_KEYS.en).sort().join(',');
  if (faKeys !== enKeys) {
    fail(`PROGRAM_KEYS fa/en key mismatch: fa=[${faKeys}] en=[${enKeys}]`);
  }

  for (const { name, profile } of SELF_TEST_PROFILES) {
    let plan: WorkoutPlan;
    try {
      plan = generateProgram(profile);
    } catch (err) {
      fail(`[${name}] generateProgram threw: ${(err as Error).message}`);
      continue;
    }

    if (plan.days.length !== plan.daysPerWeek) {
      fail(
        `[${name}] days.length=${plan.days.length} != daysPerWeek=${plan.daysPerWeek}`,
      );
    }

    const excluded = injuryExcludedKeys(profile.injuries);
    const levelBlocked = new Set(LEVEL_EXCLUDED_KEYS[profile.level]);
    const weeklyMuscles = new Set<MuscleGroup>();

    for (const day of plan.days) {
      if (day.exercises.length < 4) {
        fail(
          `[${name}] day "${day.key}" has only ${day.exercises.length} exercises (< 4)`,
        );
      }
      if (!day.nameFa || !day.nameEn) {
        fail(`[${name}] day "${day.key}" missing bilingual name`);
      }
      const seen = new Set<string>();
      for (const ex of day.exercises) {
        if (!EXERCISE_MAP.has(ex.exerciseKey)) {
          fail(`[${name}] day "${day.key}": unknown exerciseKey "${ex.exerciseKey}"`);
          continue;
        }
        if (seen.has(ex.exerciseKey)) {
          fail(`[${name}] day "${day.key}": duplicate exerciseKey "${ex.exerciseKey}"`);
        }
        seen.add(ex.exerciseKey);
        if (excluded.has(ex.exerciseKey)) {
          fail(
            `[${name}] day "${day.key}": "${ex.exerciseKey}" conflicts with injuries [${profile.injuries.join(',')}]`,
          );
        }
        if (levelBlocked.has(ex.exerciseKey)) {
          fail(
            `[${name}] day "${day.key}": "${ex.exerciseKey}" is level-gated for "${profile.level}"`,
          );
        }
        if (!(ex.sets >= 1 && ex.sets <= 6)) {
          fail(`[${name}] "${ex.exerciseKey}": suspicious sets=${ex.sets}`);
        }
        if (!(ex.restSeconds >= 30 && ex.restSeconds <= 240)) {
          fail(`[${name}] "${ex.exerciseKey}": suspicious restSeconds=${ex.restSeconds}`);
        }
        weeklyMuscles.add(EXERCISE_MAP.get(ex.exerciseKey)!.muscle);
      }
    }

    const kinds = normalizeInjuries(profile.injuries);
    for (const m of ALWAYS_COVER) {
      // A shoulder injury conservatively removes ALL direct shoulder work —
      // missing shoulder coverage is correct there, not a bug.
      if (m === 'shoulders' && kinds.includes('shoulder')) continue;
      if (!weeklyMuscles.has(m)) {
        fail(`[${name}] weekly coverage missing major muscle "${m}"`);
      }
    }
    if (!kinds.includes('knee') && !kinds.includes('back')) {
      for (const m of ['legs', 'glutes'] as MuscleGroup[]) {
        if (!weeklyMuscles.has(m)) {
          fail(`[${name}] weekly coverage missing "${m}" (no leg injury reported)`);
        }
      }
    }

    // swapExercise smoke test on the first day.
    const day0 = plan.days[0];
    if (day0.exercises.length > 0) {
      const target = day0.exercises[0].exerciseKey;
      try {
        const swapped = swapExercise(day0, target, profile);
        if (swapped.exerciseKey === target) {
          fail(`[${name}] swapExercise returned the same key for "${target}"`);
        }
        if (!EXERCISE_MAP.has(swapped.exerciseKey)) {
          fail(`[${name}] swapExercise returned unknown key "${swapped.exerciseKey}"`);
        }
        if (day0.exercises.some((e) => e.exerciseKey === swapped.exerciseKey)) {
          fail(`[${name}] swapExercise returned a key already in the day`);
        }
        const origMeta = EXERCISE_MAP.get(target)!;
        const altMeta = EXERCISE_MAP.get(swapped.exerciseKey)!;
        if (altMeta.muscle !== origMeta.muscle) {
          fail(
            `[${name}] swapExercise changed muscle ${origMeta.muscle} -> ${altMeta.muscle}`,
          );
        }
        if (excluded.has(swapped.exerciseKey)) {
          fail(
            `[${name}] swapExercise picked injury-conflicting "${swapped.exerciseKey}"`,
          );
        }
      } catch (err) {
        fail(`[${name}] swapExercise threw: ${(err as Error).message}`);
      }
    }

    // analyzeProgressionTips smoke test: logs that should trigger increase-weight.
    const firstKey = day0.exercises[0]?.exerciseKey;
    const firstReps = day0.exercises[0]?.reps ?? '';
    const top = repRangeTop(firstReps);
    if (firstKey && top !== null) {
      const logs: SessionLog[] = [
        {
          exerciseKey: firstKey,
          date: '2026-10-20',
          sets: [
            { reps: top, weightKg: 20 },
            { reps: top, weightKg: 20 },
          ],
        },
        {
          exerciseKey: firstKey,
          date: '2026-10-22',
          sets: [
            { reps: top, weightKg: 20 },
            { reps: top, weightKg: 20 },
          ],
        },
      ];
      const tips = analyzeProgressionTips(plan, logs);
      if (
        !tips.some(
          (t) => t.tipKey === 'increase-weight' && t.params.exerciseKey === firstKey,
        )
      ) {
        fail(
          `[${name}] analyzeProgressionTips missed expected increase-weight tip for "${firstKey}"`,
        );
      }
      for (const t of tips) {
        if (!(t.tipKey in PROGRAM_KEYS.fa)) {
          fail(
            `[${name}] analyzeProgressionTips returned tipKey "${t.tipKey}" missing from PROGRAM_KEYS`,
          );
        }
      }
    }
  }

  return errors;
}
