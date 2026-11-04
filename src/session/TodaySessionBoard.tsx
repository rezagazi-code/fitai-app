/**
 * اپ هوشمند بدنسازی — جلسه‌ی امروز، مستقیم روی خانه.
 *
 * این همان «جلسه به‌عنوان صفحه‌ی اصلی» است: کارت هر حرکت با ردیف‌های
 * ست‌اش همان‌جا دیده می‌شود، بدون دکمه‌ی شروع و بدون رفتن به صفحه‌ی
 * جزئیات برای رسیدن به ست‌ها. ثبت اولین ست، جلسه را شروع می‌کند؛
 * دکمه‌ی «پایان تمرین» پایین صفحه آن را ذخیره می‌کند و خلاصه‌ی کوتاهی
 * نشان می‌دهد. تایمر استراحت چسبان است و ریکاوری روی همان کارت حرکت
 * دیده می‌شود، نه در پاراگرافی پایین صفحه. هر کارت نمایش حرکتی
 * خودش را همان‌جا دارد (انیمیشن رفت‌وبرگشت شروع↔پایان روی همان
 * تصویر آواتار)؛ ویدیو فقط برای ۹ حرکتی که لینک تأییدشده دارند.
 *
 * عمداً کاملاً فارسی است: همه‌ی برچسب‌ها، دکمه‌ها، ردیف‌های ست،
 * تایمر استراحت و باندهای ریکاوری فارسی‌اند. نام انگلیسی حرکت فقط
 * در خط دوم کوچک می‌آید (همان‌طور که داده‌ها از قبل دارند) و هرگز
 * برچسب اصلی نیست. اعداد فارسی‌اند.
 *
 * ست‌ها از همان پیش‌فرض جلسه‌ی پوششی می‌آیند (initialSetsForExercise)
 * تا برد و پوشه هیچ‌وقت روی یک ست با هم اختلاف نداشته باشند.
 */
import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { getExercise, MUSCLE_LABELS } from '../lib/exercises';
import { muscleArtOf } from '../lib/muscleArt';
import AnimatedDemo from '../components/AnimatedDemo';
import { recoveryDisplayMap } from '../lib/recovery';
import { personalBestWeight } from '../lib/program';
import {
  recordVolumeKg,
  saveWorkoutSession,
} from '../lib/sessionLog';
import {
  initialSetsForExercise,
  type PlanDayExercise,
  type SessionSetDraft,
} from './WorkoutSession';
import './TodaySessionBoard.css';

export interface BoardExercise extends PlanDayExercise {
  /** Sets before the recovery cut (deload-applied, pre-recovery). */
  originalSets: number;
}

interface TodaySessionBoardProps {
  planKey: string;
  planNameFa: string;
  exercises: BoardExercise[];
  /** Called after a session is saved, so Home stats re-read the store. */
  onSaved: () => void;
  /** Opens the exercise detail view (instructions + verified video). */
  onOpenDetail?: (exerciseKey: string) => void;
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
function fa(n: number | string): string {
  return String(n)
    .replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)])
    .replace(/\./g, '٫');
}

function formatClock(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return fa(`${m}:${s.toString().padStart(2, '0')}`).replace(':', '‌:‌');
}

function buzz(pattern: number | number[] = 40): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* silent on web */
  }
}

interface RestState {
  endAt: number;
  total: number;
  paused: boolean;
  pausedRemaining: number;
  warned: boolean;
}

interface SummaryData {
  durationSec: number;
  volumeKg: number;
  setsDone: number;
  setsPlanned: number;
  prCount: number;
  prNames: string[];
}

function isBodyweightOnly(key: string): boolean {
  const ex = getExercise(key);
  return !!ex && ex.equipment.length === 1 && ex.equipment[0] === 'bodyweight';
}

export default function TodaySessionBoard({
  planKey,
  planNameFa,
  exercises,
  onSaved,
  onOpenDetail,
}: TodaySessionBoardProps): ReactElement {
  const [drafts, setDrafts] = useState<SessionSetDraft[][]>(() =>
    exercises.map((e) => initialSetsForExercise(e)),
  );
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [rest, setRest] = useState<RestState | null>(null);
  const [restRemaining, setRestRemaining] = useState(0);
  /* One edit switch per card (not one «ویرایش» link under every set
   * row — 24 links on an 8-exercise day buried the primary action).
   * When a card's switch is on, every unlogged row shows its fields. */
  const [editingCard, setEditingCard] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  const rec = useMemo(() => recoveryDisplayMap(), []);
  const startRef = useRef<number | null>(null);

  /* Elapsed clock: runs only once the first set is logged. */
  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - (startRef.current ?? startedAt)) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  /* Rest timer, system-clock driven (same rule as the overlay). */
  useEffect(() => {
    if (!rest || rest.paused) return;
    const tick = () => {
      const rem = Math.ceil((rest.endAt - Date.now()) / 1000);
      if (rem <= 0) {
        buzz([60, 80, 60]);
        setRest(null);
        setRestRemaining(0);
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
        setRest(null);
        setRestRemaining(0);
        return;
      }
      setRest({ ...rest, pausedRemaining: next });
      return;
    }
    const nextEnd = rest.endAt + deltaSec * 1000;
    const rem = Math.ceil((nextEnd - Date.now()) / 1000);
    if (rem <= 0) {
      setRest(null);
      setRestRemaining(0);
      return;
    }
    setRest({ ...rest, endAt: nextEnd });
    setRestRemaining(rem);
  };

  const toggleRestPause = () => {
    if (!rest) return;
    if (rest.paused) {
      setRest({ ...rest, paused: false, endAt: Date.now() + rest.pausedRemaining * 1000 });
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

  /* Next undone set anywhere in the board (for the rest bar + finish). */
  let nextUndone: { ei: number; si: number } | null = null;
  for (let ei = 0; ei < exercises.length && !nextUndone; ei++) {
    const si = drafts[ei].findIndex((s) => !s.done);
    if (si >= 0) nextUndone = { ei, si };
  }
  const nextInfo = (() => {
    if (!nextUndone) return null;
    const pe = exercises[nextUndone.ei];
    const ex = getExercise(pe.exerciseKey);
    const row = drafts[nextUndone.ei][nextUndone.si];
    return {
      name: ex ? ex.nameFa : pe.exerciseKey,
      detail: isBodyweightOnly(pe.exerciseKey)
        ? `${fa(row.reps)} تکرار`
        : `${fa(row.weightKg)} کیلو × ${fa(row.reps)} تکرار`,
    };
  })();

  const totalDone = drafts.reduce((c, r) => c + r.filter((s) => s.done).length, 0);
  const totalPlanned = drafts.reduce((c, r) => c + r.length, 0);
  const displayRemaining = rest ? (rest.paused ? rest.pausedRemaining : restRemaining) : 0;
  const restPct = rest ? Math.max(0, (displayRemaining / rest.total) * 100) : 0;

  const updateSet = (ei: number, si: number, patch: Partial<SessionSetDraft>) => {
    setDrafts((prev) =>
      prev.map((rows, i) =>
        i !== ei ? rows : rows.map((row, j) => (j === si ? { ...row, ...patch } : row)),
      ),
    );
  };

  const toggleSetDone = (ei: number, si: number) => {
    const row = drafts[ei][si];
    if (row.done) {
      updateSet(ei, si, { done: false });
      return;
    }
    if (startedAt === null) {
      startRef.current = Date.now();
      setStartedAt(Date.now());
    }
    updateSet(ei, si, { done: true });
    buzz(30);
    /* Rest after any logged set that is not the last set of the whole
     * session; the bar names the next set, even across exercises. */
    const hasNext =
      drafts[ei].slice(si + 1).some((s) => !s.done) ||
      drafts.slice(ei + 1).some((rows) => rows.some((s) => !s.done));
    if (hasNext) startRest(exercises[ei].restSeconds);
  };

  const resetBoard = () => {
    setDrafts(exercises.map((e) => initialSetsForExercise(e)));
    startRef.current = null;
    setStartedAt(null);
    setElapsedSec(0);
    setRest(null);
    setRestRemaining(0);
    setEditingCard(null);
    setSummary(null);
  };

  const handleFinish = () => {
    const recordExercises = exercises.map((pe, ei) => ({
      exerciseKey: pe.exerciseKey,
      sets: drafts[ei].map((s) => ({
        reps: s.reps,
        weightKg: s.weightKg,
        done: s.done,
      })),
    }));
    const prNames: string[] = [];
    for (const ex of recordExercises) {
      const done = ex.sets.filter((s) => s.done);
      if (done.length === 0) continue;
      const maxW = Math.max(...done.map((s) => s.weightKg));
      const prev = personalBestWeight(ex.exerciseKey);
      if (prev > 0 && maxW > prev) {
        const e = getExercise(ex.exerciseKey);
        prNames.push(e ? e.nameFa : ex.exerciseKey);
      }
    }
    const durationSec = startedAt === null ? 0 : Math.floor((Date.now() - startedAt) / 1000);
    const saved = saveWorkoutSession({
      date: new Date().toISOString(),
      planDayKey: planKey,
      planDayName: planNameFa,
      durationSec,
      exercises: recordExercises,
      totalVolumeKg: recordVolumeKg({ exercises: recordExercises }),
      setsCompleted: totalDone,
      setsPlanned: totalPlanned,
      prsHit: prNames.length,
    });
    void saved;
    setSummary({
      durationSec,
      volumeKg: recordVolumeKg({ exercises: recordExercises }),
      setsDone: totalDone,
      setsPlanned: totalPlanned,
      prCount: prNames.length,
      prNames,
    });
    setRest(null);
    setRestRemaining(0);
    onSaved();
  };

  if (summary) {
    return (
      <div className="tsb-summary" data-board-summary>
        <div className="tsb-summary-ring" aria-hidden="true">
          <span>✓</span>
        </div>
        <h3 className="tsb-summary-title">تمرین تموم شد!</h3>
        <p className="tsb-summary-day">{planNameFa}</p>
        <div className="tsb-summary-grid">
          <div className="tsb-summary-stat">
            <div className="tsb-summary-value">{formatClock(summary.durationSec)}</div>
            <div className="tsb-summary-label">مدت تمرین</div>
          </div>
          <div className="tsb-summary-stat">
            <div className="tsb-summary-value">
              {fa(summary.volumeKg)} <span className="tsb-unit">کیلو</span>
            </div>
            <div className="tsb-summary-label">حجم کل</div>
          </div>
          <div className="tsb-summary-stat">
            <div className="tsb-summary-value">
              {fa(summary.setsDone)}
              <span className="tsb-muted">/{fa(summary.setsPlanned)}</span>
            </div>
            <div className="tsb-summary-label">ست‌های انجام‌شده</div>
          </div>
          <div className="tsb-summary-stat">
            <div className="tsb-summary-value">{fa(summary.prCount)}</div>
            <div className="tsb-summary-label">رکورد جدید</div>
          </div>
        </div>
        {summary.prNames.length > 0 && (
          <p className="tsb-summary-prs">
            رکورد جدید: {summary.prNames.join('، ')}
          </p>
        )}
        <p className="tsb-summary-saved">جلسه ذخیره شد و در پیشرفت دیده می‌شود.</p>
        <button type="button" className="btn-secondary tsb-again" onClick={resetBoard}>
          ثبت جلسه‌ی دیگر
        </button>
      </div>
    );
  }

  return (
    <div className="tsb" data-session-board>
      <div className="tsb-head">
        <div className="tsb-head-main">
          <h3 className="tsb-title">جلسه‌ی امروز</h3>
          <p className="tsb-meta">
            {startedAt === null
              ? 'اولین ست را بزن تا جلسه شروع شود'
              : `در حال تمرین · ${formatClock(elapsedSec)} · ${fa(totalDone)} از ${fa(totalPlanned)} ست`}
          </p>
        </div>
        <button
          type="button"
          className="tsb-cancel"
          data-board-cancel
          onClick={() => setConfirmCancel(true)}
        >
          ✕ انصراف
        </button>
      </div>
      <p className="tsb-band-note">
        درصدهای ریکاوری باند تقریبی‌اند، نه اندازه‌گیری دقیق بدن.
      </p>

      {/* Sticky rest bar: pinned while scrolling through the exercises,
          never hidden below the fold. */}
      {rest && (
        <div className="tsb-restbar" role="timer" aria-live="polite" data-board-rest-bar>
          <div className="tsb-restbar-top">
            <span className="tsb-restbar-title">
              استراحت{rest.paused ? ' · مکث شده' : ''}
            </span>
            <span
              key={displayRemaining}
              className={`tsb-restbar-time${displayRemaining <= 10 ? ' is-low' : ''}`}
            >
              {formatClock(displayRemaining)}
            </span>
          </div>
          <div className="tsb-restbar-track" aria-hidden="true">
            <div className="tsb-restbar-fill" style={{ width: `${restPct}%` }} />
          </div>
          {displayRemaining <= 10 ? (
            <div className="tsb-restbar-ready">
              آماده باش!
              {nextInfo ? ` — ست بعد: ${nextInfo.name} · ${nextInfo.detail}` : ''}
            </div>
          ) : nextInfo ? (
            <div className="tsb-restbar-next">
              ست بعد: {nextInfo.name} · {nextInfo.detail}
            </div>
          ) : null}
          <div className="tsb-restbar-controls">
            <button type="button" className="tsb-restbar-btn" onClick={() => adjustRest(-15)}>
              −۱۵ ثانیه
            </button>
            <button type="button" className="tsb-restbar-btn" onClick={toggleRestPause}>
              {rest.paused ? 'ادامه استراحت' : 'مکث استراحت'}
            </button>
            <button type="button" className="tsb-restbar-btn" onClick={() => adjustRest(15)}>
              +۱۵ ثانیه
            </button>
            <button type="button" className="tsb-restbar-btn tsb-restbar-skip" onClick={skipRest}>
              رد کردن استراحت
            </button>
          </div>
        </div>
      )}

      <div className="tsb-exercises">
        {exercises.map((pe, ei) => {
          const ex = getExercise(pe.exerciseKey);
          const muscle = ex ? ex.muscle : null;
          const r = muscle ? rec[muscle] : null;
          const noData = r !== null && !r.overridden && r.lastHeavyDate === null;
          const stateFa = r ? (r.state === 'ready' ? 'آماده' : r.state === 'semi' ? 'نیمه‌آماده' : 'خسته') : '';
          const reduced = pe.originalSets > pe.sets;
          const rows = drafts[ei];
          const doneCount = rows.filter((s) => s.done).length;
          const bwOnly = isBodyweightOnly(pe.exerciseKey);
          return (
            <article
              key={pe.exerciseKey}
              className="tsb-exercise"
              data-board-exercise={pe.exerciseKey}
            >
              <header className="tsb-exercise-head">
                <div className="tsb-exercise-titles">
                  {onOpenDetail && ex ? (
                    <button
                      type="button"
                      className="tsb-exercise-name tsb-exercise-name-btn"
                      data-board-detail={pe.exerciseKey}
                      onClick={() => onOpenDetail(pe.exerciseKey)}
                    >
                      {ex.nameFa}
                    </button>
                  ) : (
                    <h4 className="tsb-exercise-name">{ex ? ex.nameFa : pe.exerciseKey}</h4>
                  )}
                  {ex && (
                    <div className="tsb-exercise-en" dir="ltr">
                      {ex.nameEn}
                    </div>
                  )}
                  <div className="tsb-exercise-meta">
                    {fa(rows.length)} ست · {fa(doneCount)} ثبت‌شده
                    {pe.targetWeightKg != null && (
                      <> · وزن هدف: {fa(pe.targetWeightKg)} کیلو</>
                    )}
                  </div>
                </div>
                {r && muscle && (
                  <span
                    className={`tsb-rec-chip${noData ? ' is-nodata' : r.state === 'tired' ? ' is-tired' : r.state === 'semi' ? ' is-semi' : ' is-ready'}`}
                    data-board-recovery={muscle}
                    data-board-percent={r.percent === null ? 'none' : String(r.percent)}
                  >
                    {ex ? MUSCLE_LABELS[muscle].fa : ''} ·{' '}
                    {noData ? 'بدون داده' : `${fa(r.percent ?? 0)}٪ · ${stateFa}`}
                  </span>
                )}
              </header>
              {/* ---------- moving demo, ON the card ----------

                  Wired art (147/158) animates start↔end right here —
                  the flagship claim lives on this card, not behind a
                  tap. Video appears ONLY where a verified URL already
                  exists (exactly 9 exercises); unlinked exercises get
                  the animation only, never a fabricated link. Glutes
                  (11/11 unwired — cable-pull-through still missing)
                  get an honest placeholder, never a fake demo. */}
              {ex && muscleArtOf(pe.exerciseKey) ? (
                <div className="tsb-demo-wrap">
                  <AnimatedDemo
                    src={muscleArtOf(pe.exerciseKey) as string}
                    alt={ex.nameFa}
                    onOpenDetail={onOpenDetail ? () => onOpenDetail(pe.exerciseKey) : undefined}
                  />
                  {ex.videoUrl !== '' && (
                    <button
                      type="button"
                      className="tsb-video-btn"
                      data-board-video={pe.exerciseKey}
                      onClick={() => window.open(ex.videoUrl, '_blank', 'noopener')}
                    >
                      ▶ ویدیو
                    </button>
                  )}
                </div>
              ) : ex ? (
                <p className="tsb-demo-note" data-board-demo-missing={pe.exerciseKey}>
                  {muscle === 'glutes'
                    ? 'نمایش این حرکت هنوز آماده نیست — آواتار خانواده‌ی سرینی کامل نشده است. برای نحوه اجرا روی نام حرکت بزن.'
                    : 'نمایش این حرکت هنوز آماده نیست. برای نحوه اجرا روی نام حرکت بزن.'}
                </p>
              ) : null}
              {reduced && muscle && (
                <p className="tsb-reduction" data-board-reduction={pe.exerciseKey}>
                  یک ست کم شد — چون {MUSCLE_LABELS[muscle].fa} خسته است (از {fa(pe.originalSets)} ست
                  به {fa(pe.sets)} ست)
                </p>
              )}
              <div className="tsb-sets">
                {rows.map((row, si) => {
                  const isEditing = editingCard === ei;
                  return (
                    <div key={si} className={`tsb-set${row.done ? ' is-done' : ''}`}>
                      <button
                        type="button"
                        className="tsb-set-row"
                        data-board-set-row
                        data-exercise={pe.exerciseKey}
                        data-set-index={si}
                        aria-pressed={row.done}
                        onClick={() => toggleSetDone(ei, si)}
                      >
                        <span className="tsb-set-index">ست {fa(si + 1)}</span>
                        <span className="tsb-set-values">
                          {bwOnly
                            ? `${fa(row.reps)} تکرار`
                            : `${fa(row.weightKg)} کیلو × ${fa(row.reps)} تکرار`}
                        </span>
                        <span className="tsb-set-hint">
                          {row.done ? 'ثبت شد — برای لغو بزن' : 'برای ثبت بزن'}
                        </span>
                        <span className={`tsb-check${row.done ? ' is-on' : ''}`} aria-hidden="true">
                          {row.done ? '✓' : ''}
                        </span>
                      </button>
                      {isEditing && !row.done && (
                        <div className="tsb-set-editrow">
                          <span className="tsb-set-editfields">
                            <label className="tsb-field">
                              <span>تکرار</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={row.reps}
                                onChange={(e) =>
                                  updateSet(ei, si, {
                                    reps: Math.max(0, parseInt(e.target.value, 10) || 0),
                                  })
                                }
                              />
                            </label>
                            {!bwOnly && (
                              <label className="tsb-field">
                                <span>کیلو</span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  min={0}
                                  step={2.5}
                                  value={row.weightKg}
                                  onChange={(e) =>
                                    updateSet(ei, si, {
                                      weightKg: Math.max(0, parseFloat(e.target.value) || 0),
                                    })
                                  }
                                />
                              </label>
                            )}
                            {bwOnly && <span className="tsb-bw-tag">بادی‌ویت</span>}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="tsb-text-btn tsb-edit-toggle"
                aria-expanded={editingCard === ei}
                onClick={() => setEditingCard(editingCard === ei ? null : ei)}
              >
                {editingCard === ei ? 'تمام ویرایش' : 'ویرایش ست‌ها'}
              </button>
            </article>
          );
        })}
      </div>

      <div className="tsb-finish-wrap">
        <button
          type="button"
          className="btn-primary tsb-finish"
          data-board-finish
          disabled={totalDone === 0}
          onClick={() => setConfirmFinish(true)}
        >
          پایان تمرین
        </button>
        {totalDone === 0 && (
          <p className="tsb-finish-hint">برای پایان تمرین، اول یک ست ثبت کن.</p>
        )}
        {totalDone > 0 && (
          <p className="tsb-finish-hint">
            {fa(totalDone)} از {fa(totalPlanned)} ست ثبت شده است.
          </p>
        )}
      </div>

      {confirmCancel && (
        <div className="tsb-confirm">
          <div className="tsb-confirm-card">
            <h3>تمرین را لغو کنیم؟</h3>
            <p>ست‌های ثبت‌شده ذخیره نمی‌شوند. مطمئنی؟</p>
            <div className="tsb-confirm-actions">
              <button
                type="button"
                className="tsb-danger-btn"
                onClick={() => {
                  setConfirmCancel(false);
                  resetBoard();
                }}
              >
                بله، انصراف
              </button>
              <button
                type="button"
                className="tsb-text-btn"
                onClick={() => setConfirmCancel(false)}
              >
                نه، ادامه بده
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmFinish && (
        <div className="tsb-confirm">
          <div className="tsb-confirm-card">
            <h3>پایان تمرین</h3>
            <p>تمرین تموم بشه و ذخیره بشه؟</p>
            <div className="tsb-confirm-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setConfirmFinish(false);
                  handleFinish();
                }}
              >
                پایان تمرین
              </button>
              <button
                type="button"
                className="tsb-text-btn"
                onClick={() => setConfirmFinish(false)}
              >
                نه، ادامه بده
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
