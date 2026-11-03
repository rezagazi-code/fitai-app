/**
 * اپ هوشمند بدنسازی — banned-movement filter (first-priority, local-first).
 *
 * A user can exclude any exercise from program generation (e.g. a
 * movement that hurts, or one they simply never want). Banned keys are
 * stored in localStorage only — no account, no server, no network.
 * The program engine (lib/program.ts) unions this list with its
 * injury exclusions, so a banned movement never appears in a newly
 * generated program. Existing saved programs are untouched: the ban
 * applies on the next program build / swap, and the UI says so.
 * Safe outside a browser (tests, SSR): every access is guarded.
 */

const KEY = 'fitai.bannedExercises';

function readRaw(): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function writeRaw(keys: string[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify([...new Set(keys)]));
  } catch {
    /* storage unavailable — fail open */
  }
}

/** Banned exercise keys, in the order they were banned. */
export function getBannedExerciseKeys(): string[] {
  return readRaw();
}

export function isBannedExercise(key: string): boolean {
  return readRaw().includes(key);
}

/** Returns the new banned state (true = now banned). */
export function toggleBannedExercise(key: string): boolean {
  const keys = readRaw();
  const idx = keys.indexOf(key);
  if (idx >= 0) keys.splice(idx, 1);
  else keys.push(key);
  writeRaw(keys);
  return idx < 0;
}

export function setBannedExercise(key: string, banned: boolean): void {
  const keys = readRaw();
  const has = keys.includes(key);
  if (banned && !has) keys.push(key);
  else if (!banned && has) keys.splice(keys.indexOf(key), 1);
  else return;
  writeRaw(keys);
}
