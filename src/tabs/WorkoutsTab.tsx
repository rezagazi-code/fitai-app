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
import BodyMap from '../components/BodyMap';
import ExerciseArt from '../components/ExerciseArt';
import ExerciseDetail from '../components/ExerciseDetail';
import { artVariantOf } from '../lib/exerciseArt';
import { muscleArtOf } from '../lib/muscleArt';
import { getActiveProgram } from '../lib/store';
import {
  ARCHETYPES,
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
    <ExerciseArt variant={artVariantOf(exercise)} alt={exercise.nameFa} raster={muscleArtOf(exercise.key)} className={className} />
  );
}

/** Split the prose instructions into numbered execution steps. */

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
          onBack={() => setSelected(null)}
          onSelect={setSelected}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-h1)' }}>{t('workouts.title')}</h2>

          {/* ---------- body map: tap a muscle, see its exercises ---------- */}
          <BodyMap
            selected={muscle}
            onSelect={(m) => {
              setMuscle(m);
              if (m !== 'all') {
                setTimeout(() => {
                  document.querySelector('.ex-lib')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 60);
              }
            }}
            muscleName={(m) => t(`lib.muscle.${m}`)}
            t={t}
          />

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
                        <span className="ex-card__name">{e.nameFa}</span>
                        <span className="ex-card__en-inline" dir="ltr">
                          {e.nameEn}
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
