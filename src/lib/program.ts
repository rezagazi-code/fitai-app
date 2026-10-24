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
