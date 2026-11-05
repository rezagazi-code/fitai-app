/**
 * اپ هوشمند بدنسازی — Home tab ("امروز").
 * Time-of-day greeting, coach banner driven by the active program,
 * today's workout card (or rest card), weekly calendar, block strip,
 * quick stats, one-tap session start.
 *
 * The today card comes from the fixed weekly schedule, not a daily
 * rotation: training days are fixed weekdays, other days are rest days
 * (part of the plan, with the next session named), and week 4 of each
 * 4-week block is a deload week with fewer sets.
 */
import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useLang, type Lang } from '../lib/i18n';
import CoachBanner from '../components/CoachBanner';
import NextBlockOffer from '../components/NextBlockOffer';
import { getDueBlock } from '../lib/nextBlock';
import RecoveryPanel from '../components/RecoveryPanel';
import { adjustDayForRecovery } from '../lib/recovery';
import TodaySessionBoard, { type BoardExercise } from '../session/TodaySessionBoard';
import BodyMap from '../components/BodyMap';
import HomeExercisesPreview from '../components/HomeExercisesPreview';
import type { MuscleGroup } from '../lib/exercises';
import ExerciseDetail from '../components/ExerciseDetail';
import { getExercise } from '../lib/exercises';
import { buildCoachContext, getBannerMessage, rememberBannerKey } from '../lib/coach';
import { getActiveProgram, getAthleteProfile, getSessions, getVolumeByDay } from '../lib/store';
import {
  deloadSets,
  EN_WEEKDAYS,
  FA_WEEKDAYS,
  getSchedule,
} from '../lib/schedule';

/* Original inline icons for the stat medallions. */
function SessionsIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <path d="m10.5 14.5 2.2 2.2 4-4.4" />
    </svg>
  );
}

function VolumeIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.5 7v10M17.5 7v10" />
      <path d="M4 9.5v5M20 9.5v5M6.5 12h11" />
      <path d="M2.5 10.8v2.4M21.5 10.8v2.4" />
    </svg>
  );
}

interface HomeTabProps {
  /** Opens the next scheduled session (rest card: make-up / early start). */
  onStartNextSession: () => void;
  /** Opens the onboarding wizard to build a program. */
  onBuildProgram: () => void;
  /** Switches to the programs tab (board cancel → new program). */
  onGoToPrograms: () => void;
  /** Body-map tap: jump to the programs library filtered to that muscle. */
  onBodyMapMuscle: (m: MuscleGroup | 'all') => void;
}

function formatTodayLine(lang: Lang): string {
  try {
    return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date());
  } catch {
    return '';
  }
}

function volumeThisWeekKg(): number {
  return getVolumeByDay(7).reduce((sum, d) => sum + d.volumeKg, 0);
}

/** Done sets finished in the current Sat–Fri week (any day kind). */
function doneSetsThisWeek(sessions: ReturnType<typeof getSessions>, weekStart: Date | null): number {
  if (!weekStart) return 0;
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 7 * 86400_000);
  let n = 0;
  for (const s of sessions) {
    if (!s.finishedAt) continue;
    const t = new Date(s.startedAt).getTime();
    if (t < start.getTime() || t >= end.getTime()) continue;
    n += s.sets.filter((x) => x.done !== false).length;
  }
  return n;
}

export default function HomeTab({ onStartNextSession, onBuildProgram, onGoToPrograms, onBodyMapMuscle }: HomeTabProps): ReactElement {
  const { t, lang } = useLang();
  const program = getActiveProgram();
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);
  const weekdays = lang === 'fa' ? FA_WEEKDAYS : EN_WEEKDAYS;
  // Bumped when the inline board saves a session, so week stats re-read
  // the store without remounting the board (its drafts must survive).
  const [refreshTick, setRefreshTick] = useState(0);
  /* Drill-down from a session-board card (demo or name tap) into the
   * exercise detail view; back returns to the same board. */
  const [boardDetailKey, setBoardDetailKey] = useState<string | null>(null);
  const sessions = useMemo(() => getSessions(), [refreshTick]);

  // The coach engine decides the single most relevant banner message from
  // real context: program, recent sessions, streak, PRs, missed days.
  const coachMsg = useMemo(() => getBannerMessage(buildCoachContext()), []);
  useEffect(() => {
    rememberBannerKey(coachMsg.key);
  }, [coachMsg]);

  // Fixed weekly schedule (Sat–Fri) + 4-week block, anchored at program
  // creation. Rest days are real schedule days, not missing data.
  const sched = program ? getSchedule(program, new Date(), sessions) : null;
  const todayExercises = sched && sched.kind === 'train' && sched.dayIndex != null
    ? program!.days[sched.dayIndex].map((e) => (sched.isDeload ? { ...e, sets: deloadSets(e.sets) } : e))
    : null;
  const totalSets = todayExercises ? todayExercises.reduce((n, e) => n + e.sets, 0) : 0;
  // Daily recovery adjustment for TODAY's card, computed the same way
  // the launch path computes it (after deload) — the note is shown
  // openly, never silently, and the session uses the same numbers.
  const todayRecovery = todayExercises
    ? adjustDayForRecovery(todayExercises.map((e) => ({ exerciseKey: e.exerciseKey, sets: e.sets })))
    : null;
  const todayAdjustment = todayRecovery ? todayRecovery.adjustment : null;
  const todayAdjustedExercises = todayRecovery
    ? todayRecovery.exercises.map((e) => ({ exerciseKey: e.exerciseKey, sets: e.sets }))
    : undefined;
  const estMinutes = todayExercises
    ? Math.max(15, Math.round((totalSets * 150) / 60))
    : 0;
  // Per-muscle engine: priority muscles wear the growth badge; the global
  // phase shows in one line. Strength programs have no phase (their scheme
  // is role-independent), so the line hides for them.
  const athleteProfile = getAthleteProfile();
  const goalLit = athleteProfile?.goal ?? program?.goal;
  const showPhase = program != null && program.goal !== 'strength';
  const phaseKey =
    athleteProfile?.phase ?? (goalLit === 'fat-loss' ? 'fatloss' : 'growth');

  const weekSessions = sched ? sched.sessionsDoneThisWeek : 0;
  const weekVolume = volumeThisWeekKg();
  // Bodyweight work has 0 kg volume, so a kg-only stat hid real work
  // ("0 kg" after a full bodyweight session). Show done sets next to
  // the kilograms so bodyweight training is visible, not erased.
  const weekSets = doneSetsThisWeek(sessions, sched ? sched.weekDays[0].date : null);
  // Re-render after a next-block accept (the active program changes
  // under HomeTab, which reads the store on every render).
  const [, setHomeSeq] = useState(0);
  const remaining = sched ? Math.max(0, sched.sessionsPlannedThisWeek - sched.sessionsDoneThisWeek) : 0;

  // On-demand monthly program: the week-4 offer is the only path by
  // default, so a user mid-block had no way to see the next month.
  // This opens the same offer flow on demand (see NextBlockOffer
  // forceOpen: progressed preview + rest note before any accept,
  // accept uses the same path, dismiss writes nothing).
  const [showMonthly, setShowMonthly] = useState(false);
  const dueBlock = program ? getDueBlock(program, new Date(), sessions) : null;
  // The inline session board: today's exercises AFTER deload AND the
  // recovery cut, each carrying its pre-recovery set count so the
  // board can name the reduction on that exercise's own card.
  const boardExercises: BoardExercise[] = todayRecovery && todayExercises
    ? todayRecovery.exercises.map((adj) => {
        const orig = todayExercises.find((e) => e.exerciseKey === adj.exerciseKey)!;
        return {
          exerciseKey: adj.exerciseKey,
          sets: adj.sets,
          reps: orig.reps,
          restSeconds: orig.restSeconds,
          ...(orig.targetWeightKg != null ? { targetWeightKg: orig.targetWeightKg } : {}),
          originalSets: orig.sets,
        };
      })
    : [];

  return (
    <div className="home-cascade">
      <header className="home-header">
        <p className="home-date">{formatTodayLine(lang)}</p>
      </header>



      {program && (
        <NextBlockOffer program={program} onAccepted={() => setHomeSeq((s) => s + 1)} />
      )}

      {/* Recovery panel sits BELOW the today card on purpose: the
          panel lists all 11 muscles, and above the card it pushed
          the session-start button below the fold (homefix e2e).
          The adjustment note itself is also shown inside the today
          card, above the start button, so the user sees WHY before
          starting without scrolling. */}

      {boardDetailKey && getExercise(boardDetailKey) ? (
        <ExerciseDetail
          exercise={getExercise(boardDetailKey) as NonNullable<ReturnType<typeof getExercise>>}
          onBack={() => setBoardDetailKey(null)}
          onSelect={(e) => setBoardDetailKey(e.key)}
        />
      ) : sched && todayExercises ? (
        <section className="card today-card today-card--cinematic">
          <span className="today-ribbon" aria-hidden="true">
            <span className="today-ribbon__dot" />
            {t('sched.trainToday')}
          </span>
          <h2 className="card-title">{lang === 'fa' ? sched.dayNameFa : sched.dayNameEn}</h2>
          <p className="card-meta">
            {t('sched.block')} {fmt(sched.blockNumber)} — {t('sched.week')} {fmt(sched.weekInBlock)} {t('sched.of')} 4
            {sched.isDeload && <> · {t('sched.deload')}</>}
          </p>
          <p className="card-meta">
            {fmt(sched.sessionsDoneThisWeek)} {t('sched.of')} {fmt(sched.sessionsPlannedThisWeek)} {t('sched.sessionsDoneThisWeek')} — {fmt(remaining)} {t('sched.sessionsLeft')}
          </p>
          {showPhase && (
            <p className="card-meta">
              {t('phase.label')}: {t(phaseKey === 'fatloss' ? 'phase.fatloss' : 'phase.growth')}
            </p>
          )}
          {sched.isDeload && <p className="card-meta sched-deload-note">{t('sched.deloadNote')}</p>}
          {/* Recovery adjustment disclosed inside the card, above the
              start button: the full per-muscle panel sits below the
              card (to keep this button above the fold), but the WHY
              must be seen before starting, not after scrolling. */}
          {todayAdjustment && (
            <p className="card-meta" data-today-adjustment-note style={{ margin: '0 0 12px' }}>
              <strong>{t('home.recoveryAdjustment')}:</strong> {lang === 'fa' ? todayAdjustment.noteFa : todayAdjustment.noteEn}
            </p>
          )}
          {/* SESSION AS THE PRIMARY VIEW, FIRST: the board sits directly
              under the card header (not below chips + explainer), so
              the first exercise's moving demo is above the fold on the
              first screen. Chips + explainer follow below the board. */}
          <TodaySessionBoard
            planKey={program?.dayKeys?.[sched.dayIndex ?? 0] ?? `day-${(sched.dayIndex ?? 0) + 1}`}
            planNameFa={sched.dayNameFa ?? program?.name ?? ''}
            exercises={boardExercises}
            onSaved={() => setRefreshTick((s) => s + 1)}
            onOpenDetail={(key) => setBoardDetailKey(key)}
            onExit={onGoToPrograms}
          />
          <div className="today-chips">
            <span className="chip chip--active">
              {fmt(todayExercises.length)} {t('home.exercises')}
            </span>
            <span className="chip">
              {fmt(totalSets)} {t('w.sets')}
            </span>
            <span className="chip">
              ≈ {fmt(estMinutes)} {t('w.min')}
            </span>
          </div>
          <p className="card-meta">{t('home.setsExplainer')}</p>
        </section>
      ) : sched ? (
        <section className="card today-card today-card--rest">
          <span className="today-ribbon today-ribbon--rest" aria-hidden="true">
            {t('sched.restToday')}
          </span>
          <h2 className="card-title">{t('sched.restToday')}</h2>
          <p className="card-meta">{t('sched.restBody')}</p>
          {sched.nextTrain && (
            <p className="card-meta">
              {t('sched.nextSession')}: {lang === 'fa' ? sched.nextTrain.dayNameFa : sched.nextTrain.dayNameEn} — {lang === 'fa' ? sched.nextTrain.weekdayFa : sched.nextTrain.weekdayEn}
            </p>
          )}
          <p className="card-meta">
            {fmt(sched.sessionsDoneThisWeek)} {t('sched.of')} {fmt(sched.sessionsPlannedThisWeek)} {t('sched.sessionsDoneThisWeek')} — {fmt(remaining)} {t('sched.sessionsLeft')}
          </p>
          {showPhase && (
            <p className="card-meta">
              {t('phase.label')}: {t(phaseKey === 'fatloss' ? 'phase.fatloss' : 'phase.growth')}
            </p>
          )}
          <button type="button" className="btn-primary btn-shine home-start" onClick={onStartNextSession}>
            {t('sched.startNextSession')}
          </button>
        </section>
      ) : (
        <section className="card today-card today-card--empty">
          <h2 className="card-title">{t('home.noProgramTitle')}</h2>
          <p className="card-meta">{t('home.noProgramBody')}</p>
          <button type="button" className="btn-primary btn-shine" style={{ width: '100%', marginTop: 16 }} onClick={onBuildProgram}>
            {t('workouts.buildProgram')}
          </button>
        </section>
      )}

      {/* Session first: on train days the today card (with the
          board's moving demos) sits directly under the greeting, so
          the first exercise demo is above the fold. The coach banner
          and week stats follow below the card — same content, lower
          priority than today's session. */}
      {/* Body map lives on Home, not in Programs: tap a muscle to open
          the library filtered to it. Session stays first above. */}
      <BodyMap
        selected="all"
        onSelect={onBodyMapMuscle}
        muscleName={(m) => t(`lib.muscle.${m}`)}
        t={t}
      />

      {/* Exercises preview: a small taste of the library, not all of
          it — «همه حرکت‌ها» jumps to the library unfiltered. */}
      <HomeExercisesPreview onSeeAll={() => onBodyMapMuscle('all')} />

      <div className="home-banner">
        <CoachBanner coachMessage={coachMsg} hero />
      </div>

      <div className="home-stats">
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true"><SessionsIcon /></span>
          <div className="stat-body">
            <div className="stat-value stat-value--grad">{fmt(weekSessions)}</div>
            <div className="stat-label">{t('home.sessionsThisWeek')}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true"><VolumeIcon /></span>
          <div className="stat-body">
            <div className="stat-value stat-value--grad">
              {fmt(weekVolume)} <span className="unit">{t('w.kg')}</span>
              {weekSets > 0 && (
                <span className="unit"> · {fmt(weekSets)} {t('w.sets')}</span>
              )}
            </div>
            <div className="stat-label">{t('home.totalVolume')}</div>
          </div>
        </div>
      </div>

      {program && (
        <RecoveryPanel
          adjustment={todayAdjustment}
          todayOriginal={todayExercises ? todayExercises.map((e) => ({ exerciseKey: e.exerciseKey, sets: e.sets })) : undefined}
          todayAdjusted={todayAdjustedExercises}
        />
      )}

      {/* Monthly program on demand. Hidden when the week-4 offer is
          already due (it renders above), so the user never sees two
          offers at once. */}
      {program && dueBlock == null && (
        <section className="card monthly-action" data-monthly-action>
          {!showMonthly ? (
            <button type="button" className="btn-secondary monthly-action__btn" data-monthly-open onClick={() => setShowMonthly(true)}>
              {t('home.nextMonthProgram')}
            </button>
          ) : (
            <NextBlockOffer
              program={program}
              forceOpen
              onAccepted={() => {
                setHomeSeq((s) => s + 1);
                setShowMonthly(false);
              }}
            />
          )}
        </section>
      )}

      {sched && (
        <>
          <section className="card sched-card">
            <h2 className="card-title">{t('sched.weekCalendar')}</h2>
            <div className="sched-calendar" role="list" aria-label={t('sched.weekCalendar')}>
              {sched.weekDays.map((d) => (
                <div
                  key={d.faWeekday}
                  role="listitem"
                  className={`sched-day${d.isToday ? ' sched-day--today' : ''}${d.done ? ' sched-day--done' : ''}`}
                >
                  <span className="sched-day__weekday">{weekdays[d.faWeekday]}</span>
                  <span className="sched-day__kind">
                    {d.done ? '✓ ' : ''}{d.kind === 'train' ? t('sched.train') : t('sched.rest')}
                    {d.kind === 'train' && sched.isDeload ? ` · ${t('sched.deload')}` : ''}
                  </span>
                  {d.kind === 'train' && (
                    <span className="sched-day__name">{lang === 'fa' ? d.dayNameFa : d.dayNameEn}</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="card sched-card">
            <h2 className="card-title">
              {t('sched.blockPlan')} — {t('sched.block')} {fmt(sched.blockNumber)}
            </h2>
            <div className="sched-block">
              {[1, 2, 3, 4].map((w) => (
                <span key={w} className={`chip${w === sched.weekInBlock ? ' chip--active' : ''}`}>
                  {t('sched.week')} {fmt(w)}{w === 4 ? ` · ${t('sched.deload')}` : ''}
                </span>
              ))}
            </div>
          </section>
        </>
      )}

    </div>
  );
}
