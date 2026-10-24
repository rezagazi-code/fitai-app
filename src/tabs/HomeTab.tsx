/**
 * اپ هوشمند بدنسازی — Home tab ("امروز").
 * Time-of-day greeting, coach banner driven by the active program,
 * today's workout card, quick stats, one-tap session start.
 */
import type { ReactElement } from 'react';
import { useEffect, useMemo } from 'react';
import { useLang, type Lang } from '../lib/i18n';
import CoachBanner from '../components/CoachBanner';
import { buildCoachContext, getBannerMessage, rememberBannerKey } from '../lib/coach';
import { getActiveProgram, getSessions, getVolumeByDay } from '../lib/store';
import { getExercise } from '../lib/exercises';

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
  /** Opens the workout session overlay for today's plan day. */
  onStartWorkout: () => void;
  /** Opens the onboarding wizard to build a program. */
  onBuildProgram: () => void;
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

export default function HomeTab({ onStartWorkout, onBuildProgram }: HomeTabProps): ReactElement {
  const { t, lang } = useLang();
  const program = getActiveProgram();

  const hour = new Date().getHours();
  const greet = t(`home.greeting.${greetingKey(hour)}`);

  // The coach engine decides the single most relevant banner message from
  // real context: program, recent sessions, streak, PRs, missed days.
  const coachMsg = useMemo(() => getBannerMessage(buildCoachContext()), []);
  useEffect(() => {
    rememberBannerKey(coachMsg.key);
  }, [coachMsg]);

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
  const exerciseNames = todayExercises
    ? todayExercises.slice(0, 3).map((e) => {
        const ex = getExercise(e.exerciseKey);
        return ex ? (lang === 'fa' ? ex.nameFa : ex.nameEn) : e.exerciseKey;
      })
    : [];
  const moreExercises = todayExercises ? Math.max(0, todayExercises.length - 3) : 0;

  const handleStart = () => {
    onStartWorkout();
  };

  return (
    <div className="home-cascade">
      <header className="home-header">
        <p className="home-date">{formatTodayLine(lang)}</p>
        <h1 className="home-greeting">
          {greet}، <span className="accent">{t('app.name')}</span>
        </h1>
      </header>

      <div className="home-banner">
        <CoachBanner coachMessage={coachMsg} hero />
      </div>

      <div className="home-stats">
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true"><SessionsIcon /></span>
          <div className="stat-body">
            <div className="stat-value stat-value--grad">{formatVolume(weekSessions, lang)}</div>
            <div className="stat-label">{t('home.sessionsThisWeek')}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true"><VolumeIcon /></span>
          <div className="stat-body">
            <div className="stat-value stat-value--grad">
              {formatVolume(weekVolume, lang)} <span className="unit">{t('w.kg')}</span>
            </div>
            <div className="stat-label">{t('home.totalVolume')}</div>
          </div>
        </div>
      </div>

      {todayExercises ? (
        <section className="card today-card today-card--cinematic">
          <span className="today-ribbon" aria-hidden="true">
            <span className="today-ribbon__dot" />
            {t('home.todayWorkout')}
          </span>
          <h2 className="card-title">{program!.name}</h2>
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
          {exerciseNames.length > 0 && (
            <div className="today-exercises" aria-label={t('home.todayWorkout')}>
              {exerciseNames.map((name) => (
                <span key={name}>{name}</span>
              ))}
              {moreExercises > 0 && (
                <span>
                  +{formatVolume(moreExercises, lang)}
                </span>
              )}
            </div>
          )}
          <button type="button" className="btn-primary btn-shine home-start" onClick={handleStart}>
            {t('w.startWorkout')}
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
    </div>
  );
}
