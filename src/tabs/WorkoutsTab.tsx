/**
 * اپ هوشمند بدنسازی — Workouts tab.
 *
 * Top: active program card (or a "build my plan" CTA when there is none).
 * Below: the Persian exercise library — search (fa + en), muscle-group
 * chips, equipment chips, and a detail view with a cinematic archetype
 * hero, the animated muscle-activation figure, numbered execution
 * steps, the MuscleWiki video (when available), and similar exercises
 * as art cards.
 *
 * Original component. All strings go through t() — never hard-coded
 * (archetype labels come from lib/archetypes, keyed by lang).
 */
import { useMemo, useState } from 'react';
import { useLang, type Lang } from '../lib/i18n';
import '../styles/exercise-display.css';
import MuscleFigure, { type MuscleRow } from '../components/MuscleFigure';
import ExerciseArt from '../components/ExerciseArt';
import { artVariantOf } from '../lib/exerciseArt';
import { getActiveProgram } from '../lib/store';
import {
  ARCHETYPES,
  archetypeLabel,
  archetypeOf,
  compoundLabel,
} from '../lib/archetypes';
import {
  EQUIPMENT_TYPES,
  EXERCISES,
  MUSCLE_GROUPS,
  type Equipment,
  type Exercise,
  type MuscleGroup,
} from '../lib/exercises';

interface WorkoutsTabProps {
  onBuildProgram?: () => void;
  onStartWorkout?: () => void;
}

type MuscleFilter = MuscleGroup | 'all';
type EquipFilter = Equipment | 'all';

const GOAL_KEYS: Record<string, string> = {
  'fat-loss': 'onb.goalLose',
  muscle: 'onb.goalBuild',
  strength: 'onb.goalStrength',
  fitness: 'onb.goalHealth',
};

/**
 * Per-exercise neon illustration (replaces the shared archetype PNG:
 * every exercise now shows its own movement + equipment).
 */
function ExerciseArtBox({
  exercise,
  className,
}: {
  exercise: Exercise;
  className?: string;
}) {
  return (
    <ExerciseArt variant={artVariantOf(exercise)} alt={exercise.nameFa} className={className} />
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
    {
      label: t(`lib.muscle.${exercise.muscle}`),
      pct: 100,
      primary: true,
    },
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

function ExerciseDetail({
  exercise,
  t,
  lang,
  onBack,
  onSelect,
}: {
  exercise: Exercise;
  t: (k: string) => string;
  lang: Lang;
  onBack: () => void;
  onSelect: (e: Exercise) => void;
}) {
  const similar = useMemo(
    () =>
      EXERCISES.filter((e) => e.muscle === exercise.muscle && e.key !== exercise.key).slice(0, 4),
    [exercise],
  );
  const slug = archetypeOf(exercise.key);
  const arch = ARCHETYPES[slug];
  const name = lang === 'fa' ? exercise.nameFa : exercise.nameEn;
  const altName = lang === 'fa' ? exercise.nameEn : exercise.nameFa;
  const steps = useMemo(
    () => instructionSteps(lang === 'fa' ? exercise.instructionsFa : exercise.instructionsEn),
    [exercise, lang],
  );

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
          <h2 className="ex-hero__name">{name}</h2>
          <p className="ex-hero__en">{altName}</p>
        </div>
      </div>

      <MuscleEngagement exercise={exercise} t={t} />

      {/* ---------- how to: numbered visual steps ---------- */}
      <div className="ex-section">
        <h4 className="ex-section__title">{t('workouts.howTo')}</h4>
        <ol className="ex-steps">
          {steps.map((s, i) => (
            <li key={i} className="ex-step">
              <span className="ex-step__num" aria-hidden="true">
                {i + 1}
              </span>
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
      {similar.length > 0 && (
        <div className="ex-section">
          <h4 className="ex-section__title">{t('workouts.similarExercises')}</h4>
          <div className="ex-similar">
            {similar.map((s) => {
              const sName = lang === 'fa' ? s.nameFa : s.nameEn;
              return (
                <button key={s.key} type="button" className="ex-sim" onClick={() => onSelect(s)}>
                  <ExerciseArtBox exercise={s} className="ex-sim__art" />
                  <span className="ex-sim__body">
                    <span className="ex-sim__name">{sName}</span>
                    <span className="ex-sim__meta">
                      {s.equipment.map((eq) => t(`lib.equipment.${eq}`)).join(' · ')}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WorkoutsTab({ onBuildProgram, onStartWorkout }: WorkoutsTabProps) {
  const { t, lang } = useLang();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleFilter>('all');
  const [equipment, setEquipment] = useState<EquipFilter>('all');
  const [selected, setSelected] = useState<Exercise | null>(null);

  const program = useMemo(() => getActiveProgram(), []);
  const totalExercises = useMemo(
    () => (program ? program.days.reduce((n, d) => n + d.length, 0) : 0),
    [program],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      if (muscle !== 'all' && e.muscle !== muscle) return false;
      if (equipment !== 'all' && !e.equipment.includes(equipment)) return false;
      if (!q) return true;
      return (
        e.nameFa.includes(query.trim()) ||
        e.nameEn.toLowerCase().includes(q) ||
        e.key.includes(q.replace(/\s+/g, '-'))
      );
    });
  }, [query, muscle, equipment]);

  const nameOf = (e: Exercise) => (lang === 'fa' ? e.nameFa : e.nameEn);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
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
          {onStartWorkout && (
            <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={onStartWorkout}>
              {t('w.startWorkout')}
            </button>
          )}
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

      {/* ---------- library ---------- */}
      {selected ? (
        <ExerciseDetail
          exercise={selected}
          t={t}
          lang={lang}
          onBack={() => setSelected(null)}
          onSelect={setSelected}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-h1)' }}>{t('workouts.title')}</h2>

          <input
            className="input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('workouts.searchPlaceholder')}
            type="search"
            aria-label={t('workouts.searchPlaceholder')}
          />

          <div className="ex-filters" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-tiny)', color: 'var(--text-muted)' }}>
              {t('workouts.muscle')}
            </span>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              <button
                type="button"
                className={muscle === 'all' ? 'chip chip--active' : 'chip'}
                onClick={() => setMuscle('all')}
                style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {t('workouts.all')}
              </button>
              {MUSCLE_GROUPS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={muscle === m ? 'chip chip--active' : 'chip'}
                  onClick={() => setMuscle(muscle === m ? 'all' : m)}
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {t(`lib.muscle.${m}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="ex-filters" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 'var(--text-tiny)', color: 'var(--text-muted)' }}>
              {t('workouts.equipment')}
            </span>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              <button
                type="button"
                className={equipment === 'all' ? 'chip chip--active' : 'chip'}
                onClick={() => setEquipment('all')}
                style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {t('workouts.all')}
              </button>
              {EQUIPMENT_TYPES.map((eq) => (
                <button
                  key={eq}
                  type="button"
                  className={equipment === eq ? 'chip chip--active' : 'chip'}
                  onClick={() => setEquipment(equipment === eq ? 'all' : eq)}
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  {t(`lib.equipment.${eq}`)}
                </button>
              ))}
            </div>
          </div>

          {results.length === 0 ? (
            <div className="card ex-empty">
              <p style={{ margin: '0 0 8px', fontSize: 'var(--text-body)' }}>
                {t('workouts.noResults')}
              </p>
              <p className="card-meta" style={{ marginBottom: 16 }}>
                {t('workouts.noResultsHint')}
              </p>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setQuery('');
                  setMuscle('all');
                  setEquipment('all');
                }}
              >
                {t('workouts.clearFilters')}
              </button>
            </div>
          ) : (
            <div className="ex-lib">
              {results.map((e) => {
                const arch = ARCHETYPES[archetypeOf(e.key)];
                const enName = lang === 'fa' ? e.nameEn : e.nameFa;
                return (
                  <button
                    key={e.key}
                    type="button"
                    className="ex-card"
                    data-exercise-row={e.key}
                    onClick={() => setSelected(e)}
                  >
                    <ExerciseArtBox exercise={e} className="ex-card__art" />
                    <span className="ex-card__body">
                      <span className="ex-card__title">
                        <span className="ex-card__name">{nameOf(e)}</span>
                        <span className="ex-card__en-inline" dir="ltr">
                          {enName}
                        </span>
                      </span>
                      <span className="ex-card__meta">
                        <span className="ex-muscle-chip">{t(`lib.muscle.${e.muscle}`)}</span>
                        <span className="ex-meta">
                          {e.equipment.map((eq) => t(`lib.equipment.${eq}`)).join(' · ')}
                        </span>
                        <span className="ex-meta">·</span>
                        <span className="ex-meta">{compoundLabel(arch.compound, lang)}</span>
                        {e.videoUrl ? (
                          <span className="ex-video-badge">▶ {t('workouts.hasVideo')}</span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
