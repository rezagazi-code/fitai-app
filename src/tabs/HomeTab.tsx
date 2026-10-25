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
import ExerciseDetail, { type DetailTarget } from '../components/ExerciseDetail';
import { buildCoachContext, getBannerMessage, rememberBannerKey } from '../lib/coach';
import { getActiveProgram, getSessions, getVolumeByDay } from '../lib/store';
import { getExercise } from '../lib/exercises';
import {
  deloadSets,
  EN_WEEKDAYS,
  FA_WEEKDAYS,
  getSchedule,
  lastPerformance,
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
  /** Opens the workout session overlay for today's plan day. */
  onStartWorkout: () => void;
  /** Opens the next scheduled session (rest card: make-up / early start). */
  onStartNextSession: () => void;
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

function volumeThisWeekKg(): number {
  return getVolumeByDay(7).reduce((sum, d) => sum + d.volumeKg, 0);
}

export default function HomeTab({ onStartWorkout, onStartNextSession, onBuildProgram }: HomeTabProps): ReactElement {
  const { t, lang } = useLang();
  const program = getActiveProgram();
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);
  const weekdays = lang === 'fa' ? FA_WEEKDAYS : EN_WEEKDAYS;
  const sessions = useMemo(() => getSessions(), []);

  const hour = new Date().getHours();
  const greet = t(`home.greeting.${greetingKey(hour)}`);

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
  const estMinutes = todayExercises
    ? Math.max(15, Math.round((totalSets * 150) / 60))
    : 0;
  const weekSessions = sched ? sched.sessionsDoneThisWeek : 0;
  const weekVolume = volumeThisWeekKg();
  const remaining = sched ? Math.max(0, sched.sessionsPlannedThisWeek - sched.sessionsDoneThisWeek) : 0;

  // Tap a today-card row → exercise detail (art, targets, records).
  const [detail, setDetail] = useState<{ key: string; target: DetailTarget | null } | null>(null);
  const detailExercise = detail ? getExercise(detail.key) ?? null : null;

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
            <div className="stat-value stat-value--grad">{fmt(weekSessions)}</div>
            <div className="stat-label">{t('home.sessionsThisWeek')}</div>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon" aria-hidden="true"><VolumeIcon /></span>
          <div className="stat-body">
            <div className="stat-value stat-value--grad">
              {fmt(weekVolume)} <span className="unit">{t('w.kg')}</span>
            </div>
            <div className="stat-label">{t('home.totalVolume')}</div>
          </div>
        </div>
      </div>

      {sched && todayExercises ? (
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
          {sched.isDeload && <p className="card-meta sched-deload-note">{t('sched.deloadNote')}</p>}
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
          <ul className="today-lifts">
            {todayExercises.map((e) => {
              const ex = getExercise(e.exerciseKey);
              const last = lastPerformance(e.exerciseKey, sessions);
              return (
                <li key={e.exerciseKey} className="today-lift">
                  <button
                    type="button"
                    className="today-lift__btn"
                    onClick={() => setDetail({
                      key: e.exerciseKey,
                      target: { sets: e.sets, reps: e.reps, restSeconds: e.restSeconds },
                    })}
                  >
                    <div className="today-lift__main">
                      <span>
                        <span className="today-lift__name">{ex ? ex.nameFa : e.exerciseKey}</span>
                        {ex && <span className="today-lift__name-en" dir="ltr">{ex.nameEn}</span>}
                      </span>
                      <span className="today-lift__target">
                        <span className="chip set-count">
                          {fmt(e.sets)} × {e.reps}
                        </span>
                        {' · ⏱ '}{fmt(e.restSeconds)} {t('w.sec')}
                      </span>
                    </div>
                    {last && (
                      <div className="today-lift__last">
                        {t('sched.lastTime')}: {fmt(last.weightKg)} {t('w.kg')} × {last.reps.map(fmt).join(lang === 'fa' ? '، ' : ', ')}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="btn-primary btn-shine home-start" onClick={onStartWorkout}>
            {t('w.startWorkout')}
          </button>
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

      {detail && detailExercise && (
        <div className="ex-detail-overlay">
          <ExerciseDetail
            exercise={detailExercise}
            target={detail.target}
            onBack={() => setDetail(null)}
            onSelect={(nx) => setDetail(nx.key === detail.key ? detail : { key: nx.key, target: null })}
          />
        </div>
      )}
    </div>
  );
}
