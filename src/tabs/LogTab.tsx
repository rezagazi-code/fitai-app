/**
 * اپ هوشمند بدنسازی — Log tab.
 * Entry point to the active workout session + recent session history.
 */
import type { ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { getActiveProgram, getSessions, type WorkoutSession } from '../lib/store';
import { programDayToPlanDay, todayPlanDayIndex } from '../session/launch';

interface LogTabProps {
  onStartWorkout: () => void;
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

export default function LogTab({ onStartWorkout, onBuildProgram }: LogTabProps): ReactElement {
  const { t, lang } = useLang();
  const program = getActiveProgram();
  const day = program ? programDayToPlanDay(program, todayPlanDayIndex(program)) : null;
  const recent = getSessions()
    .filter((s) => s.finishedAt)
    .slice(-5)
    .reverse();
  const digits = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <h2 style={{ margin: 0, fontSize: 'var(--text-h1)' }}>{t('shell.log')}</h2>

      {day ? (
        <section className="card">
          <h3 className="card-title">{t('home.todayWorkout')}</h3>
          <p className="card-meta">
            {lang === 'fa' ? day.nameFa : day.nameEn} • {digits.format(day.exercises.length)}{' '}
            {t('home.exercises')}
          </p>
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', marginTop: 12 }}
            onClick={onStartWorkout}
          >
            {t('w.startWorkout')}
          </button>
        </section>
      ) : (
        <section className="card">
          <h3 className="card-title">{t('home.noProgramTitle')}</h3>
          <p className="card-meta">{t('home.noProgramBody')}</p>
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%', marginTop: 12 }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-2)',
                }}
              >
                <span style={{ fontSize: 'var(--text-body)' }}>
                  {s.planDayName || formatDate(s.startedAt, lang)}
                </span>
                <span className="card-meta">
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
