/**
 * اپ هوشمند بدنسازی — full-screen active workout logging session.
 *
 * Usage (wired by the coordinator, e.g. from HomeTab's start button):
 *
 *   const [activeDay, setActiveDay] = useState<PlanDay | null>(null);
 *   {activeDay && (
 *     <WorkoutSession
 *       planDay={activeDay}
 *       onFinish={(session) => setActiveDay(null)} // session already saved
 *       onCancel={() => setActiveDay(null)}
 *     />
 *   )}
 *
 * PlanDay shape: { key, nameFa, nameEn, exercises: [{ exerciseKey, sets, reps, restSeconds }] }
 * exercise details (bilingual names) resolve via getExercise() from lib/exercises.
 * The finished record is saved via lib/sessionLog (forward-compatible with a
 * future `workout_sessions` table) and handed to onFinish.
 */
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { getExercise } from '../lib/exercises';
import ExerciseArt from '../components/ExerciseArt';
import ExerciseDetail from '../components/ExerciseDetail';
import { artVariantOf } from '../lib/exerciseArt';
import { muscleArtOf } from '../lib/muscleArt';
import { useLang } from '../lib/i18n';
import {
  parseRepRange,
  personalBestWeight,
} from '../lib/program';
import { getExerciseHistory } from '../lib/exerciseHistory';
import { EFFORT_WORDS, saveSessionEffort, type EffortWord } from '../lib/effort';
import {
  getLastPerformance,
  recordVolumeKg,
  saveWorkoutSession,
  type LoggedSetEntry,
  type SessionExerciseEntry,
  type WorkoutSessionRecord,
} from '../lib/sessionLog';
import './WorkoutSession.css';

/* ============================================================
 * i18n — session-scoped keys (do NOT edit i18n.tsx for these)
 * ============================================================ */

export const SESSION_KEYS = {
  fa: {
    sessionTitle: 'تمرین',
    pause: 'توقف',
    resume: 'ادامه',
    cancel: 'انصراف',
    cancelConfirmTitle: 'تمرین رو تموم کنیم؟',
    cancelConfirmBody: 'ست‌های ثبت‌شده ذخیره نمی‌شن. مطمئنی؟',
    cancelYes: 'بله، انصراف',
    cancelNo: 'نه، ادامه بده',
    exerciseOf: 'حرکت {i} از {n}',
    suggestionTitle: 'پیشنهاد مربی هوشمند',
    why: 'چرا؟',
    lastTime: 'دفعه قبل',
    kg: 'کیلو',
    reps: 'تکرار',
    set: 'ست',
    rpeLabel: 'سختی ست (RPE)',
    rpeHint: 'اختیاری — برای پیشنهاد بهتر دفعه بعد',
    markDone: 'ثبت ست',
    setDone: 'ثبت شد',
    addSet: '＋ افزودن ست',
    removeSet: 'حذف ست',
    restTitle: 'استراحت',
    restSkip: 'رد کردن استراحت',
    restDone: 'استراحت تموم شد، برو سراغ ست بعد 💪',
    restAdjustPlus: '+۱۵ ثانیه',
    restAdjustMinus: '−۱۵ ثانیه',
    restPause: 'مکث استراحت',
    restResume: 'ادامه استراحت',
    restReady: 'آماده باش!',
    nextSetLabel: 'ست بعد',
    centreLogSet: 'ثبت ست {i} از {n}',
    centreStartNext: 'شروع ست بعد — {time} مانده',
    centreNextExercise: 'رفتن به حرکت بعد',
    centreFinish: 'پایان تمرین',
    editSet: 'ویرایش',
    editDone: 'تمام',
    setTapHint: 'برای ثبت بزن',
    setLoggedHint: 'ثبت شد — برای لغو بزن',
    prevExercise: 'حرکت قبلی',
    nextExercise: 'حرکت بعدی',
    finishWorkout: 'پایان تمرین',
    finishConfirm: 'تمرین تموم بشه و ذخیره بشه؟',
    summaryTitle: 'تمرین تموم شد! 🎉',
    summaryDuration: 'مدت تمرین',
    summaryVolume: 'حجم کل',
    summarySets: 'ست‌های انجام‌شده',
    summaryPRs: 'رکورد جدید',
    prBadge: 'رکورد!',
    saveAndClose: 'ذخیره و بستن',
    min: 'دقیقه',
    sec: 'ثانیه',
    noWeight: 'بادی‌ویت',
    newBest: 'بهترین رکوردت تا امروز',
  },
  en: {
    sessionTitle: 'Workout',
    pause: 'Pause',
    resume: 'Resume',
    cancel: 'Cancel',
    cancelConfirmTitle: 'End this workout?',
    cancelConfirmBody: 'Logged sets will not be saved. Are you sure?',
    cancelYes: 'Yes, cancel',
    cancelNo: 'No, keep going',
    exerciseOf: 'Exercise {i} of {n}',
    suggestionTitle: 'Smart coach suggestion',
    why: 'Why?',
    lastTime: 'Last time',
    kg: 'kg',
    reps: 'reps',
    set: 'Set',
    rpeLabel: 'Set difficulty (RPE)',
    rpeHint: 'Optional — improves next suggestions',
    markDone: 'Log set',
    setDone: 'Logged',
    addSet: '+ Add set',
    removeSet: 'Remove set',
    restTitle: 'Rest',
    restSkip: 'Skip rest',
    restDone: 'Rest over — hit the next set 💪',
    restAdjustPlus: '+15 sec',
    restAdjustMinus: '−15 sec',
    restPause: 'Pause rest',
    restResume: 'Resume rest',
    restReady: 'Get ready!',
    nextSetLabel: 'Next set',
    centreLogSet: 'Log set {i} of {n}',
    centreStartNext: 'Start next set — {time} left',
    centreNextExercise: 'Go to next exercise',
    centreFinish: 'Finish workout',
    editSet: 'Edit',
    editDone: 'Done',
    setTapHint: 'Tap to log',
    setLoggedHint: 'Logged — tap to undo',
    prevExercise: 'Previous',
    nextExercise: 'Next',
    finishWorkout: 'Finish workout',
    finishConfirm: 'Finish and save this workout?',
    summaryTitle: 'Workout complete! 🎉',
    summaryDuration: 'Duration',
    summaryVolume: 'Total volume',
    summarySets: 'Sets completed',
    summaryPRs: 'New records',
    prBadge: 'PR!',
    saveAndClose: 'Save & close',
    min: 'min',
    sec: 'sec',
    noWeight: 'Bodyweight',
    newBest: 'Your best so far',
  },
} as const;

type SessionLang = keyof typeof SESSION_KEYS;

/* ============================================================
 * Types
 * ============================================================ */

export interface PlanDayExercise {
  exerciseKey: string;
  sets: number;
  reps: string; // e.g. "8-10"
  restSeconds: number;
  /** Progressed target load from a next-block program (if any). */
  targetWeightKg?: number;
}

export interface PlanDay {
  key: string;
  nameFa: string;
  nameEn: string;
  exercises: PlanDayExercise[];
}

export interface WorkoutSessionProps {
  planDay: PlanDay;
  /** Called with the SAVED session record (already persisted). */
  onFinish: (session: WorkoutSessionRecord) => void;
  onCancel: () => void;
}

interface SetDraft {
  reps: number;
  weightKg: number;
  done: boolean;
  rpe?: number;
}

type Phase = 'workout' | 'summary';

/* ============================================================
 * Small helpers
 * ============================================================ */

/** Convert latin digits to Persian digits for fa display. */
export function toFaDigits(value: number | string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹';
  return String(value)
    .replace(/[0-9]/g, (d) => fa[Number(d)])
    .replace(/\./g, '٫');
}

function fmt(value: number | string, lang: SessionLang): string {
  return lang === 'fa' ? toFaDigits(value) : String(value);
}

function formatClock(totalSec: number, lang: SessionLang): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const str = `${m}:${s.toString().padStart(2, '0')}`;
  return lang === 'fa' ? toFaDigits(str).replace(':', '‌:‌') : str;
}

/** Subtle haptic: Capacitor Haptics when native, navigator.vibrate on web. */
function buzz(pattern: number | number[] = 40): void {
  try {
    const w = window as unknown as {
      Capacitor?: { Plugins?: { Haptics?: { vibrate?: () => void } } };
    };
    const haptics = w.Capacitor?.Plugins?.Haptics;
    if (typeof haptics?.vibrate === 'function') {
      void haptics.vibrate();
      return;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* web fallback is silent */
  }
}

function isBodyweightOnly(exerciseKey: string): boolean {
  const ex = getExercise(exerciseKey);
  return !!ex && ex.equipment.length === 1 && ex.equipment[0] === 'bodyweight';
}

function initialSets(pe: PlanDayExercise): SetDraft[] {
  // A progressed next-block program carries its own explicit target:
  // that target IS the program the athlete was handed, so it wins
  // over the history suggestion (which would usually agree with it).
  // Otherwise, single source of truth with the detail view: the
  // session pre-fills from the SAME suggested next load the detail
  // view shows (getExerciseHistory), so what the athlete saw is what
  // they lift. The stored program itself is never mutated — only this
  // session's editable draft rows are pre-filled.
  const { high } = parseRepRange(pe.reps);
  if (pe.targetWeightKg != null) {
    return Array.from({ length: pe.sets }, () => ({
      reps: high,
      weightKg: pe.targetWeightKg as number,
      done: false,
    }));
  }
  const history = getExerciseHistory(pe.exerciseKey, pe.reps);
  const suggested = history.suggested;
  const last = suggested ? null : getLastPerformance(pe.exerciseKey);
  const rows: SetDraft[] = [];
  for (let i = 0; i < pe.sets; i++) {
    if (suggested && suggested.loadKg != null) {
      // Weighted: suggested load, plan target reps.
      rows.push({ reps: high, weightKg: suggested.loadKg, done: false });
    } else if (suggested && suggested.reps != null) {
      // Bodyweight: suggested rep target, no load.
      rows.push({ reps: suggested.reps, weightKg: 0, done: false });
    } else if (last) {
      rows.push({ reps: last.reps, weightKg: last.weightKg, done: false });
    } else {
      rows.push({ reps: high, weightKg: 0, done: false });
    }
  }
  return rows;
}

/** Session suggestion line, in the same shape the UI already renders. */
interface SessionSuggestion {
  weightKg: number;
  reps: number;
  reasonFa: string;
  reasonEn: string;
}

function sessionSuggestion(pe: PlanDayExercise): SessionSuggestion | null {
  const { high } = parseRepRange(pe.reps);
  const { suggested } = getExerciseHistory(pe.exerciseKey, pe.reps);
  if (!suggested) return null;
  if (suggested.loadKg != null) {
    return suggested.kind === 'up'
      ? {
          weightKg: suggested.loadKg,
          reps: high,
          reasonFa: `چون دفعه قبل همه تکرارها را کامل زدی، امروز ${suggested.loadKg} کیلو پیشنهاد می‌شود.`,
          reasonEn: `You hit every rep last time, so today calls for ${suggested.loadKg} kg.`,
        }
      : {
          weightKg: suggested.loadKg,
          reps: high,
          reasonFa: `تکرار وزنه‌ی دفعه قبل (${suggested.loadKg} کیلو)؛ هدف امروز: همه ست‌ها با فرم تمیز.`,
          reasonEn: `Repeat last time's load (${suggested.loadKg} kg); today's goal: every set with clean form.`,
        };
  }
  // Bodyweight progression is expressed in reps.
  const reps = suggested.reps ?? high;
  return suggested.kind === 'up'
    ? {
        weightKg: 0,
        reps,
        reasonFa: `چون دفعه قبل همه تکرارها را کامل زدی، امروز ${reps} تکرار پیشنهاد می‌شود.`,
        reasonEn: `You hit every rep last time, so today calls for ${reps} reps.`,
      }
    : {
        weightKg: 0,
        reps,
        reasonFa: `تکرار تکرارهای دفعه قبل (${reps} تکرار)؛ هدف امروز: فرم تمیز تا تکرار آخر.`,
        reasonEn: `Repeat last time's reps (${reps}); today's goal: clean form to the last rep.`,
      };
}

/* ============================================================
 * Component
 * ============================================================ */

export default function WorkoutSession({
  planDay,
  onFinish,
  onCancel,
}: WorkoutSessionProps): ReactElement {
  const { lang } = useLang();
  const L = SESSION_KEYS[lang as SessionLang] ?? SESSION_KEYS.fa;
  const t = (s: string, vars?: Record<string, string | number>): string => {
    let out = s;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) out = out.replace(`{${k}}`, String(v));
    }
    return out;
  };

  const n = planDay.exercises.length;

  // Per-exercise set drafts, prefilled from the detail-view suggestion →
  // last session → plan.
  const [setsByExercise, setSetsByExercise] = useState<SetDraft[][]>(() =>
    planDay.exercises.map(initialSets),
  );
  const [exIdx, setExIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('workout');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  /* Rest timer, driven by the SYSTEM CLOCK, never by a screen-bound
   * counter: endAt is an absolute timestamp, so dimming, locking, or
   * leaving the app cannot drift it. On return the remaining time is
   * recomputed from Date.now(). Pause freezes the remaining seconds. */
  interface RestState {
    endAt: number;
    total: number;
    paused: boolean;
    pausedRemaining: number;
    warned: boolean;
  }
  const [rest, setRest] = useState<RestState | null>(null);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restFlash, setRestFlash] = useState(false);
  // Tap the exercise header → detail (art, targets, records).
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    record: WorkoutSessionRecord;
    prKeys: string[];
  } | null>(null);
  // Four-word effort score, picked on the summary screen (one word, not
  // a 1–10 slider). Saved after the session itself, keyed by its id.
  const [effort, setEffort] = useState<EffortWord | null>(null);

  // Suggestion per exercise (computed once at session start) — the same
  // suggestion the detail view shows, so prefill and advice never disagree.
  const suggestions = useMemo<(SessionSuggestion | null)[]>(
    () => planDay.exercises.map((pe) => sessionSuggestion(pe)),
    [planDay],
  );

  // PR baseline snapshot — taken BEFORE this session's sets exist.
  const prBaseline = useRef<Record<string, number>>({});
  useEffect(() => {
    const map: Record<string, number> = {};
    for (const pe of planDay.exercises) map[pe.exerciseKey] = personalBestWeight(pe.exerciseKey);
    prBaseline.current = map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- elapsed timer ---- */
  const startRef = useRef<number>(Date.now());
  const pausedAccumRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (pauseStartRef.current !== null) return;
      setElapsedSec(Math.floor((Date.now() - startRef.current - pausedAccumRef.current) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const togglePause = () => {
    if (paused) {
      if (pauseStartRef.current !== null) {
        pausedAccumRef.current += Date.now() - pauseStartRef.current;
        pauseStartRef.current = null;
      }
      setPaused(false);
    } else {
      pauseStartRef.current = Date.now();
      setPaused(true);
    }
  };

  /* ---- rest timer (system-clock driven) ---- */
  const finishRest = () => {
    buzz([60, 80, 60]);
    setRestFlash(true);
    setRest(null);
    setRestRemaining(0);
    window.setTimeout(() => setRestFlash(false), 4000);
  };

  useEffect(() => {
    if (!rest || rest.paused) return;
    const tick = () => {
      const rem = Math.ceil((rest.endAt - Date.now()) / 1000);
      if (rem <= 0) {
        finishRest();
        return;
      }
      setRestRemaining(rem);
      if (rem <= 10 && !rest.warned) {
        buzz([40, 40]);
        setRest((r) => (r ? { ...r, warned: true } : r));
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
    // finishRest/buzz are stable module-level helpers; rest is the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rest]);

  const startRest = (seconds: number) => {
    if (seconds <= 0) return;
    setRest({
      endAt: Date.now() + seconds * 1000,
      total: seconds,
      paused: false,
      pausedRemaining: seconds,
      warned: seconds <= 10,
    });
    setRestRemaining(seconds);
  };

  const adjustRest = (deltaSec: number) => {
    if (!rest) return;
    if (rest.paused) {
      const next = rest.pausedRemaining + deltaSec;
      if (next <= 0) {
        finishRest();
        return;
      }
      setRest({ ...rest, pausedRemaining: next });
      return;
    }
    const nextEnd = rest.endAt + deltaSec * 1000;
    const rem = Math.ceil((nextEnd - Date.now()) / 1000);
    if (rem <= 0) {
      finishRest();
      return;
    }
    setRest({ ...rest, endAt: nextEnd });
    setRestRemaining(rem);
  };

  const toggleRestPause = () => {
    if (!rest) return;
    if (rest.paused) {
      setRest({
        ...rest,
        paused: false,
        endAt: Date.now() + rest.pausedRemaining * 1000,
      });
      setRestRemaining(rest.pausedRemaining);
    } else {
      const rem = Math.ceil((rest.endAt - Date.now()) / 1000);
      setRest({ ...rest, paused: true, pausedRemaining: Math.max(0, rem) });
    }
  };

  const skipRest = () => {
    setRest(null);
    setRestRemaining(0);
  };

  /* ---- swipe navigation ---- */
  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 60) return;
    // RTL: swiping left goes to the NEXT exercise visually forward.
    const rtl = document.documentElement.dir === 'rtl';
    const forward = rtl ? dx < 0 : dx > 0;
    if (forward) goNext();
    else goPrev();
  };

  const [editingSet, setEditingSet] = useState<number | null>(null);
  const goNext = () => {
    setEditingSet(null);
    setExIdx((i) => Math.min(n - 1, i + 1));
  };
  const goPrev = () => {
    setEditingSet(null);
    setExIdx((i) => Math.max(0, i - 1));
  };

  /* ---- set mutations ---- */
  const updateSet = (si: number, patch: Partial<SetDraft>) => {
    setSetsByExercise((prev) =>
      prev.map((rows, ei) =>
        ei !== exIdx ? rows : rows.map((row, i) => (i === si ? { ...row, ...patch } : row)),
      ),
    );
  };

  const toggleSetDone = (si: number) => {
    const row = setsByExercise[exIdx][si];
    if (row.done) {
      updateSet(si, { done: false });
      return;
    }
    updateSet(si, { done: true });
    buzz(30);
    // Rest is between sets, not after the last set of an exercise:
    // otherwise the rest overlay blocks moving to the next exercise
    // (and, on the final exercise, blocks finishing the workout).
    if (si < setsByExercise[exIdx].length - 1) {
      startRest(planDay.exercises[exIdx].restSeconds);
    }
  };

  const addSet = () => {
    const rows = setsByExercise[exIdx];
    const template = rows[rows.length - 1] ?? { reps: 8, weightKg: 0, done: false };
    setSetsByExercise((prev) =>
      prev.map((r, ei) =>
        ei === exIdx ? [...r, { reps: template.reps, weightKg: template.weightKg, done: false }] : r,
      ),
    );
  };

  const removeSet = () => {
    setSetsByExercise((prev) =>
      prev.map((r, ei) => (ei === exIdx && r.length > 1 ? r.slice(0, -1) : r)),
    );
  };

  /* ---- finish ---- */
  const buildRecord = (): { record: Omit<WorkoutSessionRecord, 'id' | 'synced'>; prKeys: string[] } => {
    const exercises: SessionExerciseEntry[] = planDay.exercises.map((pe, ei) => ({
      exerciseKey: pe.exerciseKey,
      sets: setsByExercise[ei].map(
        (s): LoggedSetEntry => ({
          reps: s.reps,
          weightKg: s.weightKg,
          done: s.done,
          ...(typeof s.rpe === 'number' ? { rpe: s.rpe } : {}),
        }),
      ),
    }));
    const prKeys: string[] = [];
    for (const ex of exercises) {
      const done = ex.sets.filter((s) => s.done);
      if (done.length === 0) continue;
      const maxW = Math.max(...done.map((s) => s.weightKg));
      const prev = prBaseline.current[ex.exerciseKey] ?? 0;
      if (prev > 0 && maxW > prev) prKeys.push(ex.exerciseKey);
    }
    const setsCompleted = exercises.reduce((c, e) => c + e.sets.filter((s) => s.done).length, 0);
    const setsPlanned = exercises.reduce((c, e) => c + e.sets.length, 0);
    return {
      record: {
        date: new Date().toISOString(),
        planDayKey: planDay.key,
        planDayName: lang === 'fa' ? planDay.nameFa : planDay.nameEn,
        durationSec: elapsedSec,
        exercises,
        totalVolumeKg: recordVolumeKg({ exercises }),
        setsCompleted,
        setsPlanned,
        prsHit: prKeys.length,
      },
      prKeys,
    };
  };

  const handleFinish = () => {
    const { record, prKeys } = buildRecord();
    setSummary({ record: { ...record, id: 'preview', synced: false }, prKeys });
    setPhase('summary');
    if (prKeys.length > 0) buzz([50, 60, 50, 60, 120]);
  };

  const handleSave = () => {
    if (!summary) return;
    const { id: _drop, synced: _drop2, ...rest } = summary.record;
    void _drop;
    void _drop2;
    const saved = saveWorkoutSession(rest);
    if (effort) saveSessionEffort(saved.id, effort);
    onFinish(saved);
  };

  /* ================= render: summary ================= */
  if (phase === 'summary' && summary) {
    const r = summary.record;
    const prNames = summary.prKeys.map((k) => {
      const ex = getExercise(k);
      return ex ? (lang === 'fa' ? ex.nameFa : ex.nameEn) : k;
    });
    return (
      <div className="ws-overlay" role="dialog" aria-modal="true" aria-label={L.summaryTitle}>
        <div className="ws-summary-card">
          <div className="ws-summary-ring" aria-hidden="true">
            <span className="ws-summary-check">✓</span>
          </div>
          <h2 className="ws-summary-title">{L.summaryTitle}</h2>
          <p className="ws-summary-day">{lang === 'fa' ? planDay.nameFa : planDay.nameEn}</p>

          <div className="ws-summary-grid">
            <div className="ws-summary-stat">
              <div className="ws-summary-value">{formatClock(r.durationSec, lang)}</div>
              <div className="ws-summary-label">{L.summaryDuration}</div>
            </div>
            <div className="ws-summary-stat">
              <div className="ws-summary-value">
                {fmt(r.totalVolumeKg, lang)} <span className="ws-unit">{L.kg}</span>
              </div>
              <div className="ws-summary-label">{L.summaryVolume}</div>
            </div>
            <div className="ws-summary-stat">
              <div className="ws-summary-value">
                {fmt(r.setsCompleted, lang)}
                <span className="ws-muted">/{fmt(r.setsPlanned, lang)}</span>
              </div>
              <div className="ws-summary-label">{L.summarySets}</div>
            </div>
            <div className="ws-summary-stat">
              <div className="ws-summary-value ws-pr-value">{fmt(r.prsHit, lang)}</div>
              <div className="ws-summary-label">{L.summaryPRs}</div>
            </div>
          </div>

          {prNames.length > 0 && (
            <div className="ws-pr-list">
              {prNames.map((name, i) => (
                <div
                  key={name}
                  className="ws-pr-item"
                  style={{ animationDelay: `${Math.min(i, 6) * 90}ms` }}
                >
                  <span className="ws-pr-badge">{L.prBadge}</span>
                  <span>{name}</span>
                  <span className="ws-pr-note">{L.newBest}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <p className="card-meta" style={{ margin: '0 0 8px', textAlign: 'center' }}>
              {lang === 'fa' ? 'این جلسه چطور بود؟ یک کلمه بگو' : 'How was this session? One word'}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }} data-effort-picker>
              {EFFORT_WORDS.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  className={`chip${effort === w.key ? ' chip--active' : ''}`}
                  aria-pressed={effort === w.key}
                  onClick={() => setEffort(w.key)}
                >
                  {lang === 'fa' ? w.fa : w.en} · {w.rpeHint}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="btn-primary ws-save" onClick={handleSave}>
            {L.saveAndClose}
          </button>
        </div>
      </div>
    );
  }

  /* ================= render: workout ================= */
  const pe = planDay.exercises[exIdx];
  const ex = getExercise(pe.exerciseKey);
  // Both names, always: Persian prominent, English beneath (no lang swap).
  const exName = ex ? ex.nameFa : pe.exerciseKey;
  const exAltName = ex ? ex.nameEn : '';
  const detailExercise = detailKey ? getExercise(detailKey) ?? null : null;
  const rows = setsByExercise[exIdx];
  const suggestion = suggestions[exIdx];
  const last = getLastPerformance(pe.exerciseKey);
  const bwOnly = isBodyweightOnly(pe.exerciseKey);
  const doneCount = rows.filter((r) => r.done).length;
  // Display remaining: paused freezes it, otherwise the clock value.
  const displayRemaining = rest ? (rest.paused ? rest.pausedRemaining : restRemaining) : 0;
  const restPct = rest ? Math.max(0, (displayRemaining / rest.total) * 100) : 0;

  /* ---- session-line centre button: one wide labelled pill whose
   * text IS its state. It never competes with an icon-only button:
   * there is no floating action button in the session at all. */
  const overallDone = setsByExercise.reduce((c, r) => c + r.filter((s) => s.done).length, 0);
  const overallPlanned = setsByExercise.reduce((c, r) => c + r.length, 0);
  const overallPct = overallPlanned > 0 ? (overallDone / overallPlanned) * 100 : 0;
  // Next undone set, scanning from the current exercise forward.
  let nextUndone: { exerciseIdx: number; setIdx: number } | null = null;
  for (let ei = exIdx; ei < planDay.exercises.length && !nextUndone; ei++) {
    const si = setsByExercise[ei].findIndex((s) => !s.done);
    if (si >= 0) nextUndone = { exerciseIdx: ei, setIdx: si };
  }
  const nextInfo = (() => {
    if (!nextUndone) return null;
    const nxPe = planDay.exercises[nextUndone.exerciseIdx];
    const nxEx = getExercise(nxPe.exerciseKey);
    const nxRow = setsByExercise[nextUndone.exerciseIdx][nextUndone.setIdx];
    const nxBw = isBodyweightOnly(nxPe.exerciseKey);
    return {
      name: nxEx ? nxEx.nameFa : nxPe.exerciseKey,
      detail: nxBw
        ? `${fmt(nxRow.reps, lang)} ${L.reps}`
        : `${fmt(nxRow.weightKg, lang)} ${L.kg} × ${fmt(nxRow.reps, lang)} ${L.reps}`,
    };
  })();
  const centreLabel = rest
    ? t(L.centreStartNext, { time: formatClock(displayRemaining, lang) })
    : !nextUndone
      ? L.centreFinish
      : nextUndone.exerciseIdx !== exIdx
        ? L.centreNextExercise
        : t(L.centreLogSet, { i: fmt(nextUndone.setIdx + 1, lang), n: fmt(rows.length, lang) });
  const centreSub = rest
    ? (nextInfo ? `${L.nextSetLabel}: ${nextInfo.name} — ${nextInfo.detail}` : null)
    : !nextUndone
      ? null
      : nextUndone.exerciseIdx !== exIdx
        ? (nextInfo?.name ?? null)
        : exName;
  const centreAction = () => {
    if (rest) {
      skipRest();
      return;
    }
    if (!nextUndone) {
      setConfirmFinish(true);
      return;
    }
    if (nextUndone.exerciseIdx !== exIdx) {
      setEditingSet(null);
      setExIdx(nextUndone.exerciseIdx);
      return;
    }
    toggleSetDone(nextUndone.setIdx);
  };

  return (
    <div className="ws-overlay" role="dialog" aria-modal="true" aria-label={L.sessionTitle}>
      {/* header */}
      <header className="ws-header">
        {/* Labelled exit (not an icon alone): the previous ✕-only button
            was easy to miss, so users felt trapped in the overlay even
            though save-and-close and cancel both existed. */}
        <button type="button" className="ws-icon-btn ws-cancel-btn" onClick={() => setConfirmCancel(true)} aria-label={L.cancel}>
          <span aria-hidden="true">✕</span> {L.cancel}
        </button>
        <div className="ws-header-center">
          <div className="ws-day-name">{lang === 'fa' ? planDay.nameFa : planDay.nameEn}</div>
          <div className="ws-clock">{formatClock(elapsedSec, lang)}</div>
        </div>
        <button type="button" className="ws-icon-btn" onClick={togglePause} aria-label={paused ? L.resume : L.pause}>
          {paused ? '▶' : '⏸'}
        </button>
      </header>

      {/* progress */}
      <div className="ws-progress-wrap">
        <div className="ws-progress-label">
          {t(L.exerciseOf, { i: fmt(exIdx + 1, lang), n: fmt(n, lang) })}
        </div>
        <div className="ws-progress-track">
          <div className="ws-progress-fill" style={{ width: `${((exIdx + 1) / n) * 100}%` }} />
        </div>
      </div>

      {paused && (
        <div className="ws-paused-banner">
          {L.pause} — {L.resume}
        </div>
      )}

      {/* exercise body (swipeable) */}
      <main
        className="ws-body"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        key={exIdx}
      >
        <button
          type="button"
          className="ws-exercise-head ws-exercise-headbtn"
          onClick={() => ex && setDetailKey(ex.key)}
          aria-label={exName}
        >
          {ex ? (
            <ExerciseArt variant={artVariantOf(ex)} alt={exName} raster={muscleArtOf(ex.key)} className="ws-exercise-art" />
          ) : null}
          <div className="ws-exercise-titles">
            <h2 className="ws-exercise-name">{exName}</h2>
            {exAltName ? (
              <div className="ws-exercise-en" dir="ltr">
                {exAltName}
              </div>
            ) : null}
            <div className="ws-exercise-meta">
              <span className="set-count">{fmt(rows.length, lang)} {L.set}</span> · {doneCount}/{fmt(rows.length, lang)} {L.setDone}
            </div>
          </div>
        </button>

        {suggestion && (
          <div className="ws-suggestion">
            <div className="ws-suggestion-top">
              <span className="ws-suggestion-spark" aria-hidden="true">✦</span>
              <span className="ws-suggestion-title">{L.suggestionTitle}</span>
              <span className="ws-suggestion-value">
                {fmt(suggestion.weightKg, lang)} {L.kg} × {fmt(suggestion.reps, lang)}
              </span>
            </div>
            <div className="ws-suggestion-reason">
              <span className="ws-why">{L.why}</span>{' '}
              {lang === 'fa' ? suggestion.reasonFa : suggestion.reasonEn}
            </div>
          </div>
        )}

        {last && (
          <div className="ws-last">
            {L.lastTime}: {fmt(last.weightKg, lang)} {L.kg} × {fmt(last.reps, lang)}
          </div>
        )}

        {/* set rows — ONE-TAP: the row itself is the button. Weight/reps
            are prefilled from the last session / suggestion, so the
            athlete only confirms. Editing stays available per row, but
            it is never required to log a set. */}
        <div className="ws-sets">
          {rows.map((row, si) => (
            <div key={si} className={`ws-set ${row.done ? 'is-done' : ''}`}>
              <button
                type="button"
                className="ws-set-rowbtn"
                data-set-row={si}
                aria-pressed={row.done}
                onClick={() => toggleSetDone(si)}
              >
                <span className="ws-set-rowbtn__main">
                  <span className="ws-set-index">
                    {L.set} {fmt(si + 1, lang)}
                  </span>
                  <span className="ws-set-values">
                    {bwOnly
                      ? `${fmt(row.reps, lang)} ${L.reps}`
                      : `${fmt(row.weightKg, lang)} ${L.kg} × ${fmt(row.reps, lang)} ${L.reps}`}
                  </span>
                  <span className="ws-set-hint">{row.done ? L.setLoggedHint : L.setTapHint}</span>
                </span>
                <span className={`ws-check ${row.done ? 'is-on' : ''}`} aria-hidden="true">
                  {row.done ? '✓' : ''}
                </span>
              </button>
              <div className="ws-set-editrow">
                <button
                  type="button"
                  className="ws-text-btn"
                  aria-expanded={editingSet === si}
                  onClick={() => setEditingSet(editingSet === si ? null : si)}
                >
                  {editingSet === si ? L.editDone : L.editSet}
                </button>
                {editingSet === si && !row.done && (
                  <span className="ws-set-editfields">
                    <label className="ws-field">
                      <span>{L.reps}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={row.reps}
                        onChange={(e) =>
                          updateSet(si, { reps: Math.max(0, parseInt(e.target.value, 10) || 0) })
                        }
                      />
                    </label>
                    {!bwOnly && (
                      <label className="ws-field">
                        <span>{L.kg}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={2.5}
                          value={row.weightKg}
                          onChange={(e) =>
                            updateSet(si, { weightKg: Math.max(0, parseFloat(e.target.value) || 0) })
                          }
                        />
                      </label>
                    )}
                    {bwOnly && <span className="ws-bw-tag">{L.noWeight}</span>}
                  </span>
                )}
              </div>
              <div className="ws-rpe">
                <span className="ws-rpe-label">{L.rpeLabel}</span>
                <div className="ws-rpe-chips" role="group" aria-label={L.rpeLabel}>
                  {[6, 7, 8, 9, 10].map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`ws-rpe-chip ${row.rpe === v ? 'is-on' : ''}`}
                      onClick={() => updateSet(si, { rpe: row.rpe === v ? undefined : v })}
                      aria-pressed={row.rpe === v}
                    >
                      {fmt(v, lang)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="ws-set-actions">
          <button type="button" className="ws-text-btn" onClick={addSet}>
            {L.addSet}
          </button>
          {rows.length > 1 && (
            <button type="button" className="ws-text-btn ws-danger-text" onClick={removeSet}>
              {L.removeSet}
            </button>
          )}
        </div>

        {/* nav */}
        <div className="ws-nav">
          <button type="button" className="ws-nav-btn" onClick={goPrev} disabled={exIdx === 0}>
            {L.prevExercise}
          </button>
          <div className="ws-dots" aria-hidden="true">
            {planDay.exercises.map((_, i) => (
              <span key={i} className={`ws-dot ${i === exIdx ? 'is-on' : ''}`} />
            ))}
          </div>
          {exIdx < n - 1 ? (
            <button type="button" className="ws-nav-btn ws-nav-next" onClick={goNext}>
              {L.nextExercise}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary ws-nav-finish"
              onClick={() => setConfirmFinish(true)}
            >
              {L.finishWorkout}
            </button>
          )}
        </div>
      </main>

      {/* bottom bar — pinned, never scrolling away, never covering
          the session: the sticky rest timer sits ABOVE the centre
          button, so both are visible without scrolling. */}
      <div className="ws-bottom">
        {rest && (
          <div className="ws-restbar" role="timer" aria-live="polite" data-rest-bar>
            <div className="ws-restbar__top">
              <span className="ws-restbar__title">
                {L.restTitle}
                {rest.paused ? ` · ${L.restPause}` : ''}
              </span>
              <span className={`ws-restbar__time${displayRemaining <= 10 ? ' is-low' : ''}`}>
                {formatClock(displayRemaining, lang)}
              </span>
            </div>
            <div className="ws-restbar__track" aria-hidden="true">
              <div className="ws-restbar__fill" style={{ width: `${restPct}%` }} />
            </div>
            {displayRemaining <= 10 ? (
              <div className="ws-restbar__ready">
                {L.restReady}
                {nextInfo ? ` — ${L.nextSetLabel}: ${nextInfo.name} · ${nextInfo.detail}` : ''}
              </div>
            ) : nextInfo ? (
              <div className="ws-restbar__next">
                {L.nextSetLabel}: {nextInfo.name} · {nextInfo.detail}
              </div>
            ) : null}
            <div className="ws-restbar__controls">
              <button type="button" className="ws-restbar__btn" onClick={() => adjustRest(-15)}>
                {L.restAdjustMinus}
              </button>
              <button type="button" className="ws-restbar__btn" onClick={toggleRestPause}>
                {rest.paused ? L.restResume : L.restPause}
              </button>
              <button type="button" className="ws-restbar__btn" onClick={() => adjustRest(15)}>
                {L.restAdjustPlus}
              </button>
              <button type="button" className="ws-restbar__btn ws-restbar__btn--skip" onClick={skipRest}>
                {L.restSkip}
              </button>
            </div>
          </div>
        )}
        {restFlash && !rest && <div className="ws-rest-flash-inline">{L.restDone}</div>}
        <button
          type="button"
          className="ws-centre"
          data-centre-action
          onClick={centreAction}
          aria-label={centreLabel}
        >
          <span className="ws-centre__label">{centreLabel}</span>
          {centreSub && <span className="ws-centre__sub">{centreSub}</span>}
          <span className="ws-centre__line" style={{ width: `${overallPct}%` }} aria-hidden="true" />
        </button>
      </div>

      {/* confirm cancel */}
      {confirmCancel && (
        <div className="ws-confirm">
          <div className="ws-confirm-card">
            <h3>{L.cancelConfirmTitle}</h3>
            <p>{L.cancelConfirmBody}</p>
            <div className="ws-confirm-actions">
              <button type="button" className="ws-danger-btn" onClick={onCancel}>
                {L.cancelYes}
              </button>
              <button type="button" className="ws-nav-btn" onClick={() => setConfirmCancel(false)}>
                {L.cancelNo}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* confirm finish */}
      {confirmFinish && (
        <div className="ws-confirm">
          <div className="ws-confirm-card">
            <h3>{L.finishWorkout}</h3>
            <p>{L.finishConfirm}</p>
            <div className="ws-confirm-actions">
              <button type="button" className="btn-primary" onClick={handleFinish}>
                {L.finishWorkout}
              </button>
              <button type="button" className="ws-nav-btn" onClick={() => setConfirmFinish(false)}>
                {L.cancelNo}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* exercise detail overlay (tap header) */}
      {detailExercise && (
        <div className="ex-detail-overlay">
          <ExerciseDetail
            exercise={detailExercise}
            target={detailExercise.key === pe.exerciseKey
              ? { sets: pe.sets, reps: pe.reps, restSeconds: pe.restSeconds }
              : null}
            onBack={() => setDetailKey(null)}
            onSelect={(nx) => setDetailKey(nx.key)}
          />
        </div>
      )}
    </div>
  );
}
