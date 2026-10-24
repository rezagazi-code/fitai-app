/**
 * اپ هوشمند بدنسازی — Home tab ("امروز").
 * Time-of-day greeting, coach banner driven by the active program,
 * today's workout card, quick stats, one-tap session start.
 */
import type { ReactElement } from 'react';
import { useLang, type Lang } from '../lib/i18n';
import CoachBanner, { type CoachTone } from '../components/CoachBanner';
import { getActiveProgram, getSessions, getVolumeByDay, startSession } from '../lib/store';

interface HomeTabProps {
  /** Called after a session is started — the shell switches to the Log tab. */
  onStartSession: () => void;
}

function greetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
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

function sessionsThisWeekCount(): number {
  const cutoff = Date.now() - 7 * 86400_000;
  return getSessions().filter((s) => new Date(s.startedAt).getTime() >= cutoff).length;
}

function volumeThisWeekKg(): number {
  return getVolumeByDay(7).reduce((sum, d) => sum + d.volumeKg, 0);
}

function formatVolume(kg: number, lang: Lang): string {
  const digits = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US');
  return digits.format(kg);
}

export default function HomeTab({ onStartSession }: HomeTabProps): ReactElement {
  const { t, lang } = useLang();
  const program = getActiveProgram();

  const hour = new Date().getHours();
  const greet = t(`home.greeting.${greetingKey(hour)}`);

  let coachMessage: string;
  let coachTone: CoachTone = 'info';
  if (program) {
    coachMessage = t('coach.hasProgram').replace('{name}', program.name);
  } else {
    coachMessage = t('coach.noProgram');
    coachTone = 'nudge';
  }

  const weekSessions = sessionsThisWeekCount();
  const weekVolume = volumeThisWeekKg();

  // Today's workout: pick the program day by weekday (fallback if fewer days).
  const todayExercises = program && program.days.length > 0
    ? program.days[new Date().getDay() % program.days.length]
    : null;
  const totalSets = todayExercises ? todayExercises.reduce((n, e) => n + e.sets, 0) : 0;
  const estMinutes = todayExercises
    ? Math.max(15, Math.round((totalSets * 150) / 60))
    : 0;

  const handleStart = () => {
    startSession(program ? program.id : null);
    onStartSession();
  };

  return (
    <div>
      <header className="home-header">
        <p className="home-date">{formatTodayLine(lang)}</p>
        <h1 className="home-greeting">
          {greet}، <span className="accent">{t('app.name')}</span>
        </h1>
      </header>

      <div className="home-banner">
        <CoachBanner message={coachMessage} tone={coachTone} />
      </div>

      <div className="home-stats">
        <div className="stat-card">
          <div className="stat-value">{formatVolume(weekSessions, lang)}</div>
          <div className="stat-label">{t('home.sessionsThisWeek')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {formatVolume(weekVolume, lang)} <span className="unit">{t('w.kg')}</span>
          </div>
          <div className="stat-label">{t('home.totalVolume')}</div>
        </div>
      </div>

      {todayExercises ? (
        <section className="card today-card">
          <h2 className="card-title">{t('home.todayWorkout')}</h2>
          <p className="card-meta">{program!.name}</p>
          <div className="today-chips">
            <span className="chip chip--active">
              {formatVolume(todayExercises.length, lang)} {t('home.exercises')}
            </span>
            <span className="chip">
              {formatVolume(totalSets, lang)} {t('w.sets')}
            </span>
            <span className="chip">
              ≈ {formatVolume(estMinutes, lang)} {t('w.min')}
            </span>
          </div>
          <button type="button" className="btn-primary home-start" onClick={handleStart}>
            {t('w.startWorkout')}
          </button>
        </section>
      ) : (
        <section className="card today-card">
          <h2 className="card-title">{t('home.noProgramTitle')}</h2>
          <p className="card-meta">{t('home.noProgramBody')}</p>
        </section>
      )}
    </div>
  );
}
