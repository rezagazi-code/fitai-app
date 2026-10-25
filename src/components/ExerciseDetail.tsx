/**
 * اپ هوشمند بدنسازی — shared exercise detail view.
 *
 * Opened by tapping any exercise row (home today card, session view,
 * library). Always shows BOTH names — Persian prominent, English
 * smaller beneath — regardless of the UI language setting. Shows the
 * designed muscle art (raster start+end panels when mapped, otherwise
 * the vector fallback), how to perform the movement in both
 * languages, the session targets when opened from a plan, and the
 * exercise's history + records + a suggested next load (display
 * only — it never mutates a program).
 */
import { useMemo, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import ExerciseArt from './ExerciseArt';
import MuscleFigure, { type MuscleRow } from './MuscleFigure';
import { artVariantOf } from '../lib/exerciseArt';
import { muscleArtOf } from '../lib/muscleArt';
import {
  ARCHETYPES,
  archetypeLabel,
  archetypeOf,
} from '../lib/archetypes';
import { EXERCISES, type Exercise } from '../lib/exercises';
import { getExerciseHistory } from '../lib/exerciseHistory';

export interface DetailTarget {
  sets: number;
  reps: string;
  restSeconds: number;
}

interface ExerciseDetailProps {
  exercise: Exercise;
  /** Session targets when opened from a plan (home/session); null from the library. */
  target?: DetailTarget | null;
  /** Back / close. */
  onBack: () => void;
  /** Switch the detail to another exercise (similar rows); omit to hide similar. */
  onSelect?: (e: Exercise) => void;
}

/** Per-exercise neon illustration (raster muscle art when mapped). */
function ExerciseArtBox({ exercise, className }: { exercise: Exercise; className?: string }) {
  return (
    <ExerciseArt variant={artVariantOf(exercise)} alt={exercise.nameFa} raster={muscleArtOf(exercise.key)} className={className} />
  );
}

/** Split the prose instructions into numbered execution steps. */
function instructionSteps(text: string): string[] {
  const steps = text
    .split(/(?<=[.؛!؟])\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
  return steps.length > 0 ? steps.slice(0, 6) : [text];
}

function MuscleEngagement({ exercise, t }: { exercise: Exercise; t: (k: string) => string }) {
  const rows: MuscleRow[] = [
    { label: t(`lib.muscle.${exercise.muscle}`), pct: 100, primary: true },
    ...exercise.secondary.map((m) => ({
      label: t(`lib.muscle.${m}`),
      pct: 55,
      primary: false,
    })),
  ];
  return (
    <div className="ex-section">
      <h4 className="ex-section__title">{t('workouts.muscleEngagement')}</h4>
      <MuscleFigure primary={exercise.muscle} secondary={exercise.secondary} rows={rows} />
    </div>
  );
}

export default function ExerciseDetail({ exercise, target, onBack, onSelect }: ExerciseDetailProps): ReactElement {
  const { t, lang } = useLang();
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);
  const fmtDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : 'en-US', {
        day: 'numeric',
        month: 'short',
      }).format(new Date(iso));
    } catch {
      return iso.slice(0, 10);
    }
  };

  const similar = useMemo(
    () => EXERCISES.filter((e) => e.muscle === exercise.muscle && e.key !== exercise.key).slice(0, 4),
    [exercise],
  );
  const slug = archetypeOf(exercise.key);
  const arch = ARCHETYPES[slug];
  const faSteps = useMemo(() => instructionSteps(exercise.instructionsFa), [exercise]);
  const enSteps = useMemo(() => instructionSteps(exercise.instructionsEn), [exercise]);
  const history = useMemo(
    () => getExerciseHistory(exercise.key, target?.reps),
    [exercise, target],
  );
  const lastTop = history.last ? Math.max(...history.last.sets.map((s) => s.weightKg)) : null;

  return (
    <div className="ex-detail">
      {/* ---------- hero moment ---------- */}
      <div className="ex-hero">
        <ExerciseArtBox exercise={exercise} className="ex-hero__art" />
        <div className="ex-hero__scrim" />
        <div className="ex-hero__top">
          <button type="button" className="ex-back" onClick={onBack}>
            {lang === 'fa' ? '→' : '←'} {t('common.back')}
          </button>
          <span className="ex-arch-chip">{archetypeLabel(arch, lang)}</span>
        </div>
        <div className="ex-hero__titles">
          <p className="ex-hero__kicker">{t(`lib.muscle.${exercise.muscle}`)}</p>
          <h2 className="ex-hero__name">{exercise.nameFa}</h2>
          <p className="ex-hero__en" dir="ltr">{exercise.nameEn}</p>
        </div>
      </div>

      <MuscleEngagement exercise={exercise} t={t} />

      {/* ---------- session targets (plan views only) ---------- */}
      {target && (
        <div className="ex-section">
          <h4 className="ex-section__title">{t('detail.targets')}</h4>
          <div className="ex-targets">
            <span className="chip set-count">
              {fmt(target.sets)} × {target.reps} {t('w.sets')}
            </span>
            <span className="chip">
              ⏱ {fmt(target.restSeconds)} {t('w.sec')} {t('w.rest')}
            </span>
          </div>
          {lastTop != null && lastTop > 0 && (
            <p className="card-meta">
              {t('sched.lastTime')}: {fmt(lastTop)} {t('w.kg')}
            </p>
          )}
        </div>
      )}

      {/* ---------- history + records + next-month input ---------- */}
      <div className="ex-section">
        <h4 className="ex-section__title">{t('detail.records')}</h4>
        {!history.last ? (
          <p className="card-meta">{t('detail.noHistory')}</p>
        ) : (
          <>
            <div className="ex-record">
              <span className="ex-record__label">{t('detail.lastSession')}</span>
              <span className="ex-record__value" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
                {history.last.sets.map((s) => `${fmt(s.weightKg)} ${t('w.kg')} × ${fmt(s.reps)}`).join(lang === 'fa' ? '، ' : ', ')}
                <span className="ex-record__date"> · {fmtDate(history.last.date)}</span>
              </span>
            </div>
            {history.pr && (
              <div className="ex-record">
                <span className="ex-record__label">{t('detail.bestLoad')}</span>
                <span className="ex-record__value">
                  {fmt(history.pr.weightKg)} {t('w.kg')} × {fmt(history.pr.reps)}
                  <span className="ex-record__date"> · {fmtDate(history.pr.date)}</span>
                </span>
              </div>
            )}
            {history.trend.length > 1 && (
              <div className="ex-record">
                <span className="ex-record__label">{t('detail.volumeTrend')}</span>
                <span className="ex-record__value" dir={lang === 'fa' ? 'rtl' : 'ltr'}>
                  {history.trend.map((s) => `${fmt(s.volumeKg)}`).join(lang === 'fa' ? ' ← ' : ' → ')} {t('w.kg')}
                </span>
              </div>
            )}
            {history.suggested && (
              <div className="ex-suggest">
                <div className="ex-suggest__title">{t('detail.suggestedNext')}</div>
                <div className="ex-suggest__value">
                  {history.suggested.loadKg != null
                    ? <>{fmt(history.suggested.loadKg)} {t('w.kg')}</>
                    : history.suggested.reps != null
                      ? <>{fmt(history.suggested.reps)} {t('w.reps')}</>
                      : <>{t('detail.suggestedRepeat')}</>}
                </div>
                <p className="ex-suggest__note">
                  {history.suggested.kind === 'up' ? t('detail.suggestedUp') : t('detail.suggestedRepeat')}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------- how to: both languages ---------- */}
      <div className="ex-section">
        <h4 className="ex-section__title">{t('workouts.howTo')}</h4>
        <p className="ex-howto__lang">{t('detail.howToFa')}</p>
        <ol className="ex-steps">
          {faSteps.map((s, i) => (
            <li key={i} className="ex-step">
              <span className="ex-step__num" aria-hidden="true">{i + 1}</span>
              <p className="ex-step__text">{s}</p>
            </li>
          ))}
        </ol>
        <p className="ex-howto__lang" dir="ltr">{t('detail.howToEn')}</p>
        <ol className="ex-steps" dir="ltr">
          {enSteps.map((s, i) => (
            <li key={i} className="ex-step">
              <span className="ex-step__num" aria-hidden="true">{i + 1}</span>
              <p className="ex-step__text">{s}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* ---------- equipment ---------- */}
      <div className="ex-section">
        <div className="ex-equip">
          <span className="ex-equip__label">{t('workouts.equipment')}:</span>
          {exercise.equipment.map((eq) => (
            <span key={eq} className="chip">
              {t(`lib.equipment.${eq}`)}
            </span>
          ))}
        </div>
      </div>

      {/* ---------- video ---------- */}
      {exercise.videoUrl ? (
        <div className="ex-section">
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={() => window.open(exercise.videoUrl, '_blank', 'noopener')}
          >
            ▶ {t('workouts.watchVideo')}
          </button>
          <p className="ex-video-note">{t('workouts.videoOpensExternally')}</p>
        </div>
      ) : (
        <p className="ex-video-note">{t('workouts.noVideo')}</p>
      )}

      {/* ---------- similar: art cards ---------- */}
      {onSelect && similar.length > 0 && (
        <div className="ex-section">
          <h4 className="ex-section__title">{t('workouts.similarExercises')}</h4>
          <div className="ex-similar">
            {similar.map((s) => (
              <button key={s.key} type="button" className="ex-sim" onClick={() => onSelect(s)}>
                <ExerciseArtBox exercise={s} className="ex-sim__art" />
                <span className="ex-sim__body">
                  <span className="ex-sim__name">{s.nameFa}</span>
                  <span className="ex-sim__en" dir="ltr">{s.nameEn}</span>
                  <span className="ex-sim__meta">
                    {s.equipment.map((eq) => t(`lib.equipment.${eq}`)).join(' · ')}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
