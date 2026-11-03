/**
 * اپ هوشمند بدنسازی — general health / fat-burn score.
 *
 * This is a GENERAL fitness estimate, never a medical diagnosis and
 * never personal supplement or vitamin advice. It is computed only
 * from what the athlete actually recorded: training consistency,
 * recent work vs the previous period, and (when present) waist vs
 * height. Every component is shown with its own value, so the number
 * is never a black box.
 *
 * No-data rule: if the athlete has no finished sessions, no
 * measurements and no body data at all, there is NO score — the UI
 * must show "not enough data", never an invented number.
 *
 * Local-only, pure reads from the store.
 */

import {
  getActiveProgram,
  getAthleteProfile,
  getMeasurements,
  getSessions,
  type WorkoutSession,
} from './store';

export type ScoreComponentKey = 'consistency' | 'work' | 'body';

export interface ScoreComponent {
  key: ScoreComponentKey;
  value: number; // 0–100
  detailFa: string;
  detailEn: string;
}

export interface HealthScore {
  /** Null when there is not enough recorded data to estimate anything. */
  score: number | null;
  components: ScoreComponent[];
  /** Waist ÷ height, when both are recorded; otherwise null. */
  waistToHeight: number | null;
  /** Last minus first recorded weight (kg), when ≥2 weights exist. */
  weightTrendKg: number | null;
  sessionsLast28: number;
  plannedLast28: number;
}

const DAY_MS = 86400_000;

function finishedSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.filter(
    (s) => s.finishedAt && s.sets.some((x) => x.done !== false),
  );
}

function doneSets(s: WorkoutSession): number {
  return s.sets.filter((x) => x.done !== false).length;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function computeHealthScore(now: Date = new Date()): HealthScore {
  const sessions = finishedSessions(getSessions());
  const measurements = getMeasurements();
  const program = getActiveProgram();
  const profile = getAthleteProfile();

  const daysPerWeek = program?.daysPerWeek ?? profile?.daysPerWeek ?? 0;
  const plannedLast28 = daysPerWeek > 0 ? daysPerWeek * 4 : 0;

  const t28 = now.getTime() - 28 * DAY_MS;
  const t56 = now.getTime() - 56 * DAY_MS;
  const recent = sessions.filter((s) => new Date(s.startedAt).getTime() > t28);
  const prior = sessions.filter(
    (s) => {
      const t = new Date(s.startedAt).getTime();
      return t > t56 && t <= t28;
    },
  );

  // Body inputs: latest recorded waist (store measurements win, profile
  // measurements are the fallback) and profile height.
  const waistFromStore = [...measurements]
    .reverse()
    .find((m) => m.waistCm != null)?.waistCm;
  const waistCm = waistFromStore ?? profile?.measurements?.waistCm ?? null;
  const heightCm = profile?.heightCm ?? null;
  const waistToHeight =
    waistCm != null && heightCm != null && heightCm > 0
      ? Math.round((waistCm / heightCm) * 100) / 100
      : null;

  const weightRows = measurements
    .filter((m) => m.weightKg != null)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const weightTrendKg =
    weightRows.length >= 2
      ? Math.round((weightRows[weightRows.length - 1].weightKg! - weightRows[0].weightKg!) * 10) / 10
      : null;

  const hasAnyData =
    sessions.length > 0 || measurements.length > 0 || waistToHeight != null;

  const components: ScoreComponent[] = [];

  if (plannedLast28 > 0) {
    const consistency = Math.min(
      100,
      Math.round((recent.length / plannedLast28) * 100),
    );
    components.push({
      key: 'consistency',
      value: consistency,
      detailFa: `${recent.length} جلسه در ۲۸ روز اخیر از ${plannedLast28} جلسه برنامه‌ریزی‌شده`,
      detailEn: `${recent.length} sessions in the last 28 days of ${plannedLast28} planned`,
    });
  }

  const recentSets = recent.reduce((n, s) => n + doneSets(s), 0);
  const priorSets = prior.reduce((n, s) => n + doneSets(s), 0);
  if (recentSets > 0 || priorSets > 0) {
    let work: number;
    if (priorSets === 0) {
      work = 70; // started (again) in the last 28 days: real work, no baseline yet
    } else {
      work = Math.round(50 + 50 * Math.max(-1, Math.min(1, (recentSets - priorSets) / priorSets)));
    }
    components.push({
      key: 'work',
      value: work,
      detailFa: `${recentSets} ست در ۲۸ روز اخیر در برابر ${priorSets} ست در ۲۸ روز قبل`,
      detailEn: `${recentSets} sets in the last 28 days vs ${priorSets} in the 28 days before`,
    });
  }

  if (waistToHeight != null) {
    const body =
      waistToHeight < 0.5 ? 90 : waistToHeight < 0.55 ? 70 : waistToHeight < 0.6 ? 50 : 30;
    components.push({
      key: 'body',
      value: body,
      detailFa: `نسبت دور کمر به قد: ${waistToHeight}`,
      detailEn: `Waist-to-height ratio: ${waistToHeight}`,
    });
  }

  if (!hasAnyData || components.length === 0) {
    return {
      score: null,
      components,
      waistToHeight,
      weightTrendKg,
      sessionsLast28: recent.length,
      plannedLast28,
    };
  }

  // Weighted average over AVAILABLE components only (renormalized):
  // consistency 40%, work 30%, body 30%.
  const componentWeights: Record<ScoreComponentKey, number> = {
    consistency: 0.4,
    work: 0.3,
    body: 0.3,
  };
  const totalWeight = components.reduce((n, c) => n + componentWeights[c.key], 0);
  const score = Math.round(
    components.reduce((n, c) => n + c.value * componentWeights[c.key], 0) / totalWeight,
  );

  return {
    score,
    components,
    waistToHeight,
    weightTrendKg,
    sessionsLast28: recent.length,
    plannedLast28,
  };
}
