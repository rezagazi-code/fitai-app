/**
 * اپ هوشمند بدنسازی — coach-supervised loop over share codes.
 *
 * No server, no accounts, no cost (Reza's decision, 2026-11-06):
 * the trainee's request, the coach's approved program and the monthly
 * report all travel as ONE compact text code the two sides paste
 * between the app and WhatsApp. The transport is a single boundary
 * (encodeCoachCode / decodeCoachCode): when a server exists, the
 * payload objects below travel over the server unchanged — only the
 * boundary changes, never the flow.
 *
 * The program engine is deterministic (generateProgram has no random
 * input — the only Math.random in program.ts is the plan-id fallback),
 * so the REQUEST code carries only the wizard answers + the exact
 * engine input. The coach regenerates the identical draft from them.
 * The RESPONSE code carries the full approved program (possibly
 * edited by the coach): what the coach approved is exactly what
 * lands on the trainee's page — the trainee never re-generates it.
 *
 * Safety: this file carries NO medical judgment. Health flags ride
 * along so the coach sees them; the PAR-Q gate itself lives in the
 * wizard unchanged (flagged trainees get the lowest tier + the
 * clinician note, never a diagnosis, never a drug/supplement line).
 */
import { generateProgram, type UserProfile as EngineProfile, type WorkoutPlan } from './program';
import type { UserProfile as WizardProfile } from '../onboarding/OnboardingWizard';
import {
  deleteAllProgramsExcept,
  getMeasurements,
  getPersonalRecords,
  getSessions,
  saveProgram,
  setActiveProgram,
  type BodyMeasurement,
  type WorkoutProgram,
} from './store';

/* ------------------------------------------------------------------ */
/* Payloads (versioned; v is checked on decode)                        */
/* ------------------------------------------------------------------ */

export interface TraineeIdentity {
  firstName: string;
  lastName: string;
  phone?: string;
}

export function fullName(id: TraineeIdentity): string {
  return `${id.firstName} ${id.lastName}`.trim();
}

/** The trainee's request: answers + the exact engine input. */
export interface CoachRequestPayload {
  v: 1;
  kind: 'request';
  id: string;
  createdAt: string; // ISO
  trainee: TraineeIdentity;
  /** Wizard answers (human summary for the coach). */
  answers: WizardProfile;
  /** Exact generateProgram() input — the coach regenerates the draft. */
  engine: EngineProfile;
}

/** The coach's decision. `program` is the APPROVED engine plan
 * (possibly edited); the trainee maps it 1:1 into the store. */
export interface CoachResponsePayload {
  v: 1;
  kind: 'response';
  requestId: string;
  status: 'approved' | 'rejected';
  reason?: string;
  program?: WorkoutPlan;
  /** Program display name (goal label), set by the coach side. */
  programName?: string;
  decidedAt: string; // ISO
}

/** Monthly progress + needs report from the trainee. */
export interface MonthlyReportPayload {
  v: 1;
  kind: 'monthly';
  id: string;
  createdAt: string; // ISO
  trainee: TraineeIdentity;
  month: string; // YYYY-MM
  sessionsCompleted: number;
  setsDone: number;
  totalVolumeKg: number;
  prs: { exerciseKey: string; bestWeightKg: number; bestReps: number }[];
  latestMeasurement?: BodyMeasurement;
  /** Free-text needs («احتیاجات») — what the trainee says they need. */
  needs: string;
}

export type CoachPayload = CoachRequestPayload | CoachResponsePayload | MonthlyReportPayload;

/* ------------------------------------------------------------------ */
/* Codec — one transport boundary                                      */
/* ------------------------------------------------------------------ */

const CODE_PREFIX = 'MP1.';

function b64urlEncode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const bin = atob(b64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Encode a payload into one shareable code. */
export function encodeCoachCode(payload: CoachPayload): string {
  return CODE_PREFIX + b64urlEncode(JSON.stringify(payload));
}

/**
 * Find a code inside pasted text (the whole WhatsApp message can be
 * pasted — the MP1. token is extracted, surrounding prose ignored).
 */
export function extractCode(text: string): string | null {
  const m = text.match(/MP1\.[A-Za-z0-9_-]+/);
  return m ? m[0] : null;
}

export type DecodeError = 'empty' | 'not-a-code' | 'bad-code' | 'bad-shape';

export function decodeCoachCode(
  raw: string,
): { ok: true; payload: CoachPayload } | { ok: false; error: DecodeError } {
  const code = extractCode(raw.trim());
  if (!code) return { ok: false, error: raw.trim() === '' ? 'empty' : 'not-a-code' };
  let obj: unknown;
  try {
    obj = JSON.parse(b64urlDecode(code.slice(CODE_PREFIX.length)));
  } catch {
    return { ok: false, error: 'bad-code' };
  }
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'bad-shape' };
  const p = obj as Record<string, unknown>;
  if (p.v !== 1 || typeof p.kind !== 'string') return { ok: false, error: 'bad-shape' };
  if (p.kind === 'request') {
    const r = p as unknown as CoachRequestPayload;
    if (!r.id || !r.trainee?.firstName || !r.trainee?.lastName || !r.engine || !r.answers) {
      return { ok: false, error: 'bad-shape' };
    }
    return { ok: true, payload: r };
  }
  if (p.kind === 'response') {
    const r = p as unknown as CoachResponsePayload;
    if (!r.requestId || (r.status !== 'approved' && r.status !== 'rejected')) {
      return { ok: false, error: 'bad-shape' };
    }
    if (r.status === 'approved' && (!r.program || !Array.isArray(r.program.days))) {
      return { ok: false, error: 'bad-shape' };
    }
    return { ok: true, payload: r };
  }
  if (p.kind === 'monthly') {
    const r = p as unknown as MonthlyReportPayload;
    if (!r.id || !r.trainee?.firstName || !r.trainee?.lastName || !r.month) {
      return { ok: false, error: 'bad-shape' };
    }
    return { ok: true, payload: r };
  }
  return { ok: false, error: 'bad-shape' };
}

/** Regenerate the draft the trainee saw, from the request's engine input. */
export function draftFromRequest(req: CoachRequestPayload): WorkoutPlan {
  return generateProgram(req.engine);
}

/* ------------------------------------------------------------------ */
/* WhatsApp share                                                       */
/* ------------------------------------------------------------------ */

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/* ------------------------------------------------------------------ */
/* Local storage — trainee side + coach side (same device can be both, */
/* exactly like Reza's dual-role test: coach and trainee are two local */
/* roles, no server in between)                                        */
/* ------------------------------------------------------------------ */

const K = {
  pendingRequest: 'fitai.coach.pendingRequest',
  inbox: 'fitai.coach.inbox',
  monthlyInbox: 'fitai.coach.monthlyInbox',
  sentMonthly: 'fitai.coach.sentMonthly',
};

/** Coach mode (2026-11-06): Reza is the admin/coach on this phone.
 * ON = the Programs tab shows the coach view (trainee requests +
 * monthly reports) instead of the trainee request card. Default OFF
 * (trainee view). Persisted locally, same device, no server. */
const COACH_MODE_KEY = 'fitai.coachMode';

export function getCoachMode(): boolean {
  try {
    return localStorage.getItem(COACH_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setCoachMode(on: boolean): void {
  try {
    localStorage.setItem(COACH_MODE_KEY, on ? '1' : '0');
  } catch {
    /* storage unavailable — mode applies for this session only */
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
    /* storage unavailable — fail open */
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function getPendingRequest(): CoachRequestPayload | null {
  return read<CoachRequestPayload | null>(K.pendingRequest, null);
}

export function savePendingRequest(req: CoachRequestPayload): void {
  write(K.pendingRequest, req);
}

export function clearPendingRequest(): void {
  remove(K.pendingRequest);
}

export interface InboxEntry {
  request: CoachRequestPayload;
  importedAt: string; // ISO
  status: 'pending' | 'approved' | 'rejected';
  decidedAt?: string;
  responseCode?: string;
}

export function getInbox(): InboxEntry[] {
  return read<InboxEntry[]>(K.inbox, []);
}

export function saveInboxEntry(entry: InboxEntry): void {
  const all = getInbox();
  const i = all.findIndex((e) => e.request.id === entry.request.id);
  if (i >= 0) all[i] = entry;
  else all.unshift(entry);
  write(K.inbox, all);
}

export interface MonthlyInboxEntry {
  report: MonthlyReportPayload;
  importedAt: string; // ISO
}

export function getMonthlyInbox(): MonthlyInboxEntry[] {
  return read<MonthlyInboxEntry[]>(K.monthlyInbox, []);
}

export function saveMonthlyInboxEntry(entry: MonthlyInboxEntry): void {
  const all = getMonthlyInbox();
  if (all.some((e) => e.report.id === entry.report.id)) return;
  all.unshift(entry);
  write(K.monthlyInbox, all);
}

export function getSentMonthly(): MonthlyReportPayload | null {
  return read<MonthlyReportPayload | null>(K.sentMonthly, null);
}

export function saveSentMonthly(r: MonthlyReportPayload): void {
  write(K.sentMonthly, r);
}

/** Login-gate identity (first + last name + phone, required at login). */
export function getLoginIdentity(): TraineeIdentity | null {
  try {
    const raw = localStorage.getItem('fitai.loginProfile');
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<TraineeIdentity>;
    if (!p.firstName || !p.lastName) return null;
    return { firstName: p.firstName, lastName: p.lastName, phone: p.phone ?? '' };
  } catch {
    return null;
  }
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `cr-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

export function buildRequest(
  trainee: TraineeIdentity,
  answers: WizardProfile,
  engine: EngineProfile,
): CoachRequestPayload {
  return {
    v: 1,
    kind: 'request',
    id: newId(),
    createdAt: new Date().toISOString(),
    trainee: { ...trainee },
    answers,
    engine,
  };
}

/* ------------------------------------------------------------------ */
/* Engine plan <-> store program (mirrors the wizard's finish mapping) */
/* ------------------------------------------------------------------ */

const ENGINE_GOAL_BACK: Record<string, string> = {
  fatloss: 'fat-loss',
  muscle: 'muscle',
  strength: 'strength',
  general: 'fitness',
};

export function enginePlanToStoreProgram(
  plan: WorkoutPlan,
  name: string,
): Omit<WorkoutProgram, 'id' | 'createdAt'> {
  return {
    name,
    goal: ENGINE_GOAL_BACK[plan.goal] ?? 'fitness',
    level: plan.level,
    daysPerWeek: plan.daysPerWeek,
    dayKeys: plan.days.map((d, i) => d.key ?? `day-${i + 1}`),
    dayNames: plan.days.map((d) => ({ fa: d.nameFa ?? '', en: d.nameEn })),
    days: plan.days.map((d) =>
      d.exercises.map((e) => ({
        exerciseKey: e.exerciseKey,
        sets: e.sets,
        reps: e.reps,
        restSeconds: e.restSeconds,
      })),
    ),
    phase: plan.phase,
    priorities: plan.priorities,
    healthFlagged: plan.healthFlagged,
  };
}

/**
 * Apply an approved response: the approved program becomes the ACTIVE
 * program, exactly as the coach edited it (no re-generation). The old
 * program row is deleted; sessions, measurements and PRs stay (the
 * existing delete-old rule).
 */
export function applyApprovedResponse(resp: CoachResponsePayload): WorkoutProgram | null {
  if (resp.status !== 'approved' || !resp.program) return null;
  const stored = saveProgram(
    enginePlanToStoreProgram(resp.program, resp.programName ?? 'برنامه‌ی مربی'),
  );
  setActiveProgram(stored.id);
  deleteAllProgramsExcept(stored.id);
  clearPendingRequest();
  return stored;
}

/* ------------------------------------------------------------------ */
/* Monthly report compiler (trainee side)                               */
/* ------------------------------------------------------------------ */

export function compileMonthlyReport(trainee: TraineeIdentity, needs: string): MonthlyReportPayload {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const cutoff = Date.now() - 30 * 86400_000;
  let sessionsCompleted = 0;
  let setsDone = 0;
  let totalVolumeKg = 0;
  for (const s of getSessions()) {
    if (!s.finishedAt) continue;
    if (new Date(s.startedAt).getTime() < cutoff) continue;
    sessionsCompleted += 1;
    for (const set of s.sets) {
      if (set.done === false) continue;
      setsDone += 1;
      totalVolumeKg += set.reps * set.weightKg;
    }
  }
  const measurements = getMeasurements();
  return {
    v: 1,
    kind: 'monthly',
    id: newId(),
    createdAt: now.toISOString(),
    trainee: { ...trainee },
    month,
    sessionsCompleted,
    setsDone,
    totalVolumeKg: Math.round(totalVolumeKg),
    prs: getPersonalRecords()
      .slice(0, 5)
      .map((r) => ({ exerciseKey: r.exerciseKey, bestWeightKg: r.bestWeightKg, bestReps: r.bestReps })),
    latestMeasurement: measurements.length > 0 ? measurements[measurements.length - 1] : undefined,
    needs: needs.trim(),
  };
}
