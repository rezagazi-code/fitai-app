/**
 * Musclepro — fasting timer (later dossier item, separate entity).
 *
 * This is deliberately a SEPARATE timer from the rest timer: different
 * name, different colour (amber), different storage, different screen
 * section. It only counts elapsed time toward a target the user sets
 * (default 16 hours) and shows progress — it gives no health advice,
 * no eating window prescription, and no medical claim. Starting or
 * stopping it never affects workouts, programs, or the rest timer.
 */

export interface FastingState {
  startedAt: string | null; // ISO
  targetHours: number;
  finishedAt: string | null; // ISO, when the user stopped it
}

const KEY = 'fitai.fasting';

export function getFastingState(): FastingState {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      const s = parsed as FastingState;
      return {
        startedAt: s.startedAt ?? null,
        targetHours: typeof s.targetHours === 'number' && s.targetHours > 0 ? s.targetHours : 16,
        finishedAt: s.finishedAt ?? null,
      };
    }
  } catch {
    /* ignore */
  }
  return { startedAt: null, targetHours: 16, finishedAt: null };
}

function save(state: FastingState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function startFasting(targetHours: number): FastingState {
  const state: FastingState = {
    startedAt: new Date().toISOString(),
    targetHours: targetHours > 0 ? targetHours : 16,
    finishedAt: null,
  };
  save(state);
  return state;
}

export function stopFasting(): FastingState {
  const state = getFastingState();
  state.finishedAt = new Date().toISOString();
  save(state);
  return state;
}

export function resetFasting(): FastingState {
  const state: FastingState = { startedAt: null, targetHours: 16, finishedAt: null };
  save(state);
  return state;
}

/** Elapsed seconds since start, or 0 when not running. */
export function fastingElapsedSec(state: FastingState, now = new Date()): number {
  if (!state.startedAt) return 0;
  const end = state.finishedAt ? new Date(state.finishedAt).getTime() : now.getTime();
  return Math.max(0, Math.floor((end - new Date(state.startedAt).getTime()) / 1000));
}
