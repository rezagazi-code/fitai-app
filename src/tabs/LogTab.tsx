/**
 * اپ هوشمند بدنسازی — Log tab.
 * Entry point to the active workout session + recent session history.
 */
import type { ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { getActiveProgram, getSessions, type WorkoutSession } from '../lib/store';
import { todayPlanDay } from '../session/launch';
import { getSchedule } from '../lib/schedule';

interface LogTabProps {
  onStartWorkout: () => void;
  /** Rest days: start the next scheduled session (make-up / early start). */
  onStartNextSession: () => void;
  onBuildProgram: () => void;
}

function sessionVolumeKg(s: WorkoutSession): number {
  let v = 0;
  for (const set of s.sets) {
    if (set.done === false) continue;
    v += set.reps * set.weightKg;
  }
  return Math.round(v);
}

function formatDate(iso: string, lang: 'fa' | 'en'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : 'en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export default function LogTab({ onStartWorkout, onStartNextSession, onBuildProgram }: LogTabProps): ReactElement {
  const { t, lang } = useLang();
  const program = getActiveProgram();
  const day = todayPlanDay(program);
  const sched = program ? getSchedule(program) : null;
  const recent = getSessions()
    .filter((s) => s.finishedAt)
    .slice(-5)
    .reverse();
  const digits = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h2 className="fitai-section-title">{t('shell.log')}</h2>
      <p className="fitai-section-sub">{t('log.recentSessions')}</p>

      {day ? (
        <section className="card today-card today-card--cinematic">
          <span className="today-ribbon" aria-hidden="true">
            <span className="today-ribbon__dot" />
            {t('home.todayWorkout')}
          </span>
          <h3 className="card-title">
            {lang === 'fa' ? day.nameFa : day.nameEn}
          </h3>
          <p className="card-meta">
            {digits.format(day.exercises.length)} {t('home.exercises')}
          </p>
          <button
            type="button"
            className="btn-primary btn-shine home-start"
            style={{ width: '100%' }}
            onClick={onStartWorkout}
          >
            {t('w.startWorkout')}
          </button>
        </section>
      ) : sched ? (
        <section className="card today-card today-card--rest">
          <h3 className="card-title">{t('sched.restToday')}</h3>
          <p className="card-meta">{t('sched.restBody')}</p>
          {sched.nextTrain && (
            <p className="card-meta">
              {t('sched.nextSession')}: {lang === 'fa' ? sched.nextTrain.dayNameFa : sched.nextTrain.dayNameEn} — {lang === 'fa' ? sched.nextTrain.weekdayFa : sched.nextTrain.weekdayEn}
            </p>
          )}
          <button
            type="button"
            className="btn-primary btn-shine"
            style={{ width: '100%', marginTop: 16 }}
            onClick={onStartNextSession}
          >
            {t('sched.startNextSession')}
          </button>
        </section>
      ) : (
        <section className="card today-card today-card--empty">
          <h3 className="card-title">{t('home.noProgramTitle')}</h3>
          <p className="card-meta">{t('home.noProgramBody')}</p>
          <button
            type="button"
            className="btn-primary btn-shine"
            style={{ width: '100%', marginTop: 16 }}
            onClick={onBuildProgram}
          >
            {t('workouts.buildProgram')}
          </button>
        </section>
      )}

      <section className="card">
        <h3 className="card-title">{t('log.recentSessions')}</h3>
        {recent.length === 0 ? (
          <p className="card-meta" style={{ margin: 0 }}>
            {t('log.noSessionsYet')}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {recent.map((s) => (
              <div key={s.id} className="log-row">
                <span className="log-row__name">
                  <span className="log-row__check" aria-hidden="true">✓</span>
                  {s.planDayName || formatDate(s.startedAt, lang)}
                </span>
                <span className="card-meta" style={{ whiteSpace: 'nowrap' }}>
                  {digits.format(sessionVolumeKg(s))} {t('w.kg')} •{' '}
                  {digits.format(s.sets.filter((x) => x.done !== false).length)}{' '}
                  {t('log.setsDone')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
