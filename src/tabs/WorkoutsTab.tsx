/**
 * اپ هوشمند بدنسازی — Workouts tab.
 *
 * Top: active program card (or a "build my plan" CTA when there is none)
 * with the 4-week view. The exercise library used to live below it;
 * since 2026-11-06 it lives on Home (Reza: exercise search belongs
 * on Home) — this tab keeps only the program, the max-effort day
 * card, and the detail view a max-effort tap opens.
 *
 * Original component. All strings go through t() — never hard-coded
 * (archetype labels come from lib/archetypes, keyed by lang).
 */
import { useMemo, useState } from 'react';
import { useLang, type Lang } from '../lib/i18n';
import '../styles/exercise-display.css';
import ExerciseDetail from '../components/ExerciseDetail';
import FourWeekPlan from '../components/FourWeekPlan';
import { getActiveProgram, getAthleteProfile, getSessions } from '../lib/store';
import { getSchedule } from '../lib/schedule';
import { markMaxEffortDayDone, maxEffortDue, maxEffortExercises } from '../lib/effort';
import { clearPendingRequest, fullName, getPendingRequest } from '../lib/coachLoop';
import {
  EXERCISES,
  MUSCLE_LABELS,
  type Exercise,
  type MuscleGroup,
} from '../lib/exercises';

interface WorkoutsTabProps {
  onBuildProgram?: () => void;
  onStartWorkout?: () => void;
  /** Trainee asks the coach for a program (wizard in request mode). */
  onRequestCoachProgram?: () => void;
  /** Re-open the pending request (view code / paste response). */
  onViewPendingRequest?: () => void;
  /** Bumped by the shell's refresh(): re-reads the active program so a
   * program that lands while this tab is mounted (coach response apply)
   * shows immediately instead of the stale "no program yet" card. */
  refreshToken?: number;
  /** Home week-chip deep-link: open FourWeekPlan on this week. */
  weekRequest?: { week: number; seq: number } | null;
}

const GOAL_KEYS: Record<string, string> = {
  'fat-loss': 'onb.goalLose',
  muscle: 'onb.goalBuild',
  strength: 'onb.goalStrength',
  fitness: 'onb.goalHealth',
};


export default function WorkoutsTab({ onBuildProgram, onStartWorkout, onRequestCoachProgram, onViewPendingRequest, refreshToken, weekRequest }: WorkoutsTabProps) {
  const { t, lang } = useLang();
  // Detail view only for max-effort taps now; the library browser
  // lives on Home (see components/ExerciseLibrary).
  const [selected, setSelected] = useState<Exercise | null>(null);
  /** Bumped after cancelling a coach request so the pending card re-reads storage. */
  const [, setCoachTick] = useState(0);
  // Max-effort day (second-priority): due at most once per 4-week block,
  // only once the user actually has personal records to test.
  const [maxEffortDone, setMaxEffortDone] = useState(false);
  const maxEffortKeys = maxEffortDue() && !maxEffortDone ? maxEffortExercises(4) : [];

  const program = useMemo(() => getActiveProgram(), [refreshToken]);
  // Rest-day honesty: the Start button opens the NEXT session (see App
  // openTodaySession), so on rest days it must SAY so, with the weekday.
  const todaySched = useMemo(
    () => (program ? getSchedule(program, new Date(), getSessions()) : null),
    // program is memo-stable for the tab's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [program],
  );
  const startLabel =
    todaySched?.kind === 'rest' && todaySched.nextTrain
      ? `${t('sched.startNextSession')} (${lang === 'fa' ? todaySched.nextTrain.weekdayFa : todaySched.nextTrain.weekdayEn})`
      : t('w.startWorkout');
  const totalExercises = useMemo(
    () => (program ? program.days.reduce((n, d) => n + d.length, 0) : 0),
    [program],
  );

  // Per-muscle engine: the program card names the growth priorities and the
  // global phase in one line each (strength programs have no phase).
  const athleteProfile = useMemo(() => getAthleteProfile(), []);
  // Chips follow the PLAN's own priorities (see HomeTab note): profile edits
  // without a rebuild must not label old-plan exercises as growth priority.
  const growthPriorities: string[] = program?.priorities ?? [];
  const showPhase = program != null && program.goal !== 'strength';
  const phaseKey =
    athleteProfile?.phase ??
    ((athleteProfile?.goal ?? program?.goal) === 'fat-loss' ? 'fatloss' : 'growth');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {/* ---------- coach loop: request / waiting status ---------- */}
      {(() => {
        // Read fresh on every render: applying a response (in the
        // App-level sheet) re-renders this tab via the shell refresh.
        const pendingReq = getPendingRequest();
        if (pendingReq) {
          return (
            <div className="card" data-coach-pending style={{ border: '1px solid #f5b942' }}>
              <h2 className="card-title">{t('coach.waitingTitle')}</h2>
              <p className="card-meta" style={{ margin: '0 0 4px' }}>
                {fullName(pendingReq.trainee)} ·{' '}
                {new Date(pendingReq.createdAt).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US')}
              </p>
              <p className="card-meta" style={{ margin: '0 0 12px' }}>{t('coach.waitingBody')}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => onViewPendingRequest?.()}
                >
                  {t('coach.viewCode')}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    if (window.confirm(t('coach.cancelConfirm'))) {
                      clearPendingRequest();
                      setCoachTick((s) => s + 1);
                    }
                  }}
                >
                  {t('coach.cancelRequest')}
                </button>
              </div>
            </div>
          );
        }
        return (
          <div className="card" data-coach-request-entry>
            <h2 className="card-title">{t('coach.requestProgram')}</h2>
            <p className="card-meta" style={{ margin: '0 0 12px' }}>{t('coach.requestHint')}</p>
            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={() => onRequestCoachProgram?.()}
            >
              {t('coach.requestProgram')}
            </button>
          </div>
        );
      })()}

      {/* ---------- active program ---------- */}
      {program ? (
        <div className="card">
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 'var(--text-tiny)',
              color: 'var(--accent-cyan)',
              fontWeight: 700,
            }}
          >
            {t('workouts.activeProgram')}
          </p>
          <h2 className="card-title">{program.name}</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <span className="chip chip--active">
              {t(GOAL_KEYS[program.goal] ?? 'onb.goalHealth')}
            </span>
            <span className="chip">
              {program.daysPerWeek} {t('workouts.daysPerWeek')}
            </span>
            <span className="chip">
              {totalExercises} {t('workouts.exercisesCount')}
            </span>
          </div>
          {showPhase && (
            <p className="card-meta" style={{ marginTop: -8 }}>
              {t('phase.label')}: {t(phaseKey === 'fatloss' ? 'phase.fatloss' : 'phase.growth')}
            </p>
          )}
          {growthPriorities.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              <span className="chip chip--active">{t('priority.label')}:</span>
              {growthPriorities.map((m) => (
                <span className="chip" key={m}>
                  {lang === 'fa'
                    ? (MUSCLE_LABELS[m as MuscleGroup]?.fa ?? m)
                    : (MUSCLE_LABELS[m as MuscleGroup]?.en ?? m)}
                </span>
              ))}
            </div>
          )}
          {onStartWorkout && (
            <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={onStartWorkout}>
              {startLabel}
            </button>
          )}
          <FourWeekPlan
            program={program}
            initialWeek={weekRequest?.week}
            autoOpen={weekRequest != null}
          />
          {/* Rebuild path: saved programs never change on app update, so a
              user whose program predates a generator fix had no way to reach
              the new schemes without reinstalling. This re-opens onboarding;
              finishing it replaces the active program, records stay. */}
          <button
            type="button"
            className="btn-ghost"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => {
              if (window.confirm(t('workouts.rebuildConfirm'))) onBuildProgram?.();
            }}
          >
            {t('workouts.rebuildProgram')}
          </button>
          <p className="card-meta" style={{ marginTop: 4 }}>
            {t('workouts.rebuildHint')}
          </p>
        </div>
      ) : (
        <div
          className="card"
          style={{
            borderStyle: 'dashed',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <h2 className="card-title" style={{ margin: 0 }}>
            {t('workouts.noProgram')}
          </h2>
          <p className="card-meta">{t('workouts.noProgramHint')}</p>
          <button type="button" className="btn-primary" onClick={onBuildProgram}>
            {t('workouts.buildProgram')}
          </button>
        </div>
      )}

      {/* ---------- max-effort day (record-test day, not a daily habit) ---------- */}
      {maxEffortKeys.length > 0 && (
        <div className="card" data-max-effort-day>
          <h2 className="card-title">
            {lang === 'fa' ? 'روز حداکثر تلاش' : 'Max-effort day'}
          </h2>
          <p className="card-meta" style={{ margin: '0 0 12px' }}>
            {lang === 'fa'
              ? 'روزی برای سنجش رکوردهای تمرینی‌ات با بارهای کنترل‌شده — نه هر روز، حداکثر هر چهار هفته یک بار. هرگز با درد تمرین نکن؛ اگر چیزی درد گرفت، همان‌جا متوقف شو.'
              : 'A day to test your training records with controlled loads — not daily, at most once per 4-week block. Never train through pain; stop if anything hurts.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {maxEffortKeys.map((key) => {
              const ex = EXERCISES.find((e) => e.key === key);
              return (
                <button
                  key={key}
                  type="button"
                  className="chip"
                  style={{ textAlign: lang === 'fa' ? 'right' : 'left' }}
                  onClick={() => {
                    const found = EXERCISES.find((e) => e.key === key);
                    if (found) setSelected(found);
                  }}
                >
                  {ex ? (
                    lang === 'fa' ? (
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span>{ex.nameFa}</span>
                        <span dir="ltr" style={{ fontSize: '0.8125rem', opacity: 0.75 }}>{ex.nameEn}</span>
                      </span>
                    ) : (
                      ex.nameEn
                    )
                  ) : (
                    key
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => {
              markMaxEffortDayDone();
              setMaxEffortDone(true);
            }}
          >
            {lang === 'fa' ? 'این روز حداکثر تلاش انجام شد' : 'Mark this max-effort day done'}
          </button>
        </div>
      )}

      {/* ---------- exercise detail (max-effort taps only) ----------
          The library browser moved to Home; a max-effort chip still
          opens the exercise detail here, above nothing else. */}
      {selected && (
        <ExerciseDetail
          exercise={selected}
          onBack={() => setSelected(null)}
          onSelect={setSelected}
        />
      )}
    </div>
  );
}
