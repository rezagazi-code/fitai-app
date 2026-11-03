/**
 * Musclepro — four-word effort score + max-effort day (second-priority).
 *
 * After a session the user answers with ONE word, not a 1–10 slider:
 *   آسان / خوب بود / سخت بود / خیلی سخت
 * Each word maps to an approximate RPE band for display only — the word
 * itself is what is stored, so no fake precision is implied. Effort is
 * stored per finished session in localStorage (fitai.sessionEffort),
 * keyed by session id, and never feeds a medical judgement.
 *
 * Max-effort day: a periodic record-test day, not a daily habit. It
 * lists the user's current top personal-record exercises and explains
 * in plain words that it is a test of training records with safe,
 * controlled loads — never a medical test and never a reason to train
 * through pain. The day itself is built by the caller from PR data
 * (see maxEffortExercises in this module); it does not invent loads.
 */

import { getPersonalRecords } from './store';

export type EffortWord = 'easy' | 'good' | 'hard' | 'very-hard';

export const EFFORT_WORDS: Array<{ key: EffortWord; fa: string; en: string; rpeHint: string }> = [
  { key: 'easy', fa: 'آسان', en: 'Easy', rpeHint: 'RPE ~۳' },
  { key: 'good', fa: 'خوب بود', en: 'Good', rpeHint: 'RPE ~۶' },
  { key: 'hard', fa: 'سخت بود', en: 'Hard', rpeHint: 'RPE ~۸' },
  { key: 'very-hard', fa: 'خیلی سخت', en: 'Very hard', rpeHint: 'RPE ~۱۰' },
];

const EFFORT_KEY = 'fitai.sessionEffort';

type EffortMap = Record<string, EffortWord>;

function readEffort(): EffortMap {
  try {
    const raw = localStorage.getItem(EFFORT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as EffortMap) : {};
  } catch {
    return {};
  }
}

export function saveSessionEffort(sessionId: string, word: EffortWord): void {
  try {
    const map = readEffort();
    map[sessionId] = word;
    localStorage.setItem(EFFORT_KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — fail open */
  }
}

export function getSessionEffort(sessionId: string): EffortWord | null {
  return readEffort()[sessionId] ?? null;
}

/** Top PR exercises for a max-effort (record-test) day, best first. */
export function maxEffortExercises(limit = 4): string[] {
  return getPersonalRecords()
    .slice(0, limit)
    .map((pr) => pr.exerciseKey);
}

/**
 * How often a max-effort day is due: once per 4-week block, i.e. when
 * the user has finished at least 8 sessions since the last max-effort
 * day marker — a deliberately conservative, non-medical cadence.
 * The marker is stored separately so the cadence is honest, not a
 * countdown timer.
 */
const MAX_EFFORT_KEY = 'fitai.lastMaxEffortDay';

export function markMaxEffortDayDone(date = new Date()): void {
  try {
    localStorage.setItem(MAX_EFFORT_KEY, date.toISOString());
  } catch {
    /* ignore */
  }
}

export function maxEffortDue(): boolean {
  try {
    const raw = localStorage.getItem(MAX_EFFORT_KEY);
    if (!raw) return true; // never done one → due once PRs exist
    const last = new Date(raw).getTime();
    if (Number.isNaN(last)) return true;
    return Date.now() - last > 28 * 86400_000;
  } catch {
    return false;
  }
}
