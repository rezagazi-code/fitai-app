/**
 * Musclepro — continuity thread + month letter (second-priority).
 *
 * The thread is deliberately NOT a flame streak: one missed day never
 * breaks it. A week counts as "kept" when the user trained at least
 * once that week; the thread is the run of kept weeks ending this
 * week, and the weekly goal (3 sessions) is shown as progress, not
 * as a pass/fail that shames a missed day. A missed week pauses the
 * thread's growth — it does not erase it in the display: the letter
 * below reports the longest thread too, so progress is never lost
 * to a single bad week.
 *
 * The month letter is a written summary generated ONLY from stored
 * data (sessions, volume, PRs, food totals, health score). No number
 * is invented: empty months say so plainly.
 */

import { getFoodLog } from './food';
import { computeHealthScore } from './healthScore';
import { getPersonalRecords, getSessions } from './store';

function weekKey(d: Date): string {
  // Monday-based week key, local dates.
  const day = (d.getDay() + 6) % 7; // Mon=0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

function weeksBack(n: number, now = new Date()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
    out.push(weekKey(d));
  }
  return out;
}

export interface Continuity {
  /** Consecutive kept weeks ending this week. */
  threadWeeks: number;
  /** Longest kept run in the last 26 weeks. */
  longestThread: number;
  /** Sessions this week (Mon–Sun). */
  thisWeekSessions: number;
  /** Weekly goal. */
  weeklyGoal: number;
  /** Last 8 weeks, oldest → newest, true = kept (≥1 session). */
  lastWeeks: boolean[];
}

export function getContinuity(now = new Date()): Continuity {
  const sessions = getSessions().filter((s) => s.finishedAt);
  const byWeek = new Map<string, number>();
  for (const s of sessions) {
    const k = weekKey(new Date(s.startedAt));
    byWeek.set(k, (byWeek.get(k) ?? 0) + 1);
  }
  const last26 = weeksBack(26, now);
  const kept26 = last26.map((k) => (byWeek.get(k) ?? 0) > 0);
  let thread = 0;
  for (let i = kept26.length - 1; i >= 0; i--) {
    if (kept26[i]) thread++;
    else break;
  }
  // If this week is empty so far, the thread ending last week still
  // counts — a week in progress is not a break.
  if (thread === 0) {
    for (let i = kept26.length - 2; i >= 0; i--) {
      if (kept26[i]) thread++;
      else break;
    }
  }
  let longest = 0;
  let run = 0;
  for (const kept of kept26) {
    run = kept ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const thisWeek = weekKey(now);
  return {
    threadWeeks: thread,
    longestThread: longest,
    thisWeekSessions: byWeek.get(thisWeek) ?? 0,
    weeklyGoal: 3,
    lastWeeks: kept26.slice(-8),
  };
}

export interface MonthLetterData {
  yearMonth: string; // YYYY-MM
  sessions: number;
  sets: number;
  volumeKg: number;
  prs: number;
  foodKcal: number;
  foodDays: number;
  healthScore: number | null;
}

export function getMonthLetter(now = new Date()): MonthLetterData {
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const sessions = getSessions().filter((s) => s.finishedAt && s.startedAt.slice(0, 7) === ym);
  let sets = 0;
  let volumeKg = 0;
  for (const s of sessions) {
    for (const set of s.sets) {
      if (set.done === false) continue;
      sets++;
      volumeKg += set.reps * set.weightKg;
    }
  }
  const prs = getPersonalRecords().filter((pr) => pr.achievedOn.slice(0, 7) === ym).length;
  const food = getFoodLog().filter((e) => e.date.slice(0, 7) === ym);
  const foodKcal = food.reduce((n, e) => n + e.kcal, 0);
  const foodDays = new Set(food.map((e) => e.date)).size;
  const score = computeHealthScore();
  return {
    yearMonth: ym,
    sessions: sessions.length,
    sets,
    volumeKg: Math.round(volumeKg),
    prs,
    foodKcal,
    foodDays,
    healthScore: score ? score.score : null,
  };
}
