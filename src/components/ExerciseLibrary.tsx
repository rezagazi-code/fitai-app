/**
 * اپ هوشمند بدنسازی — exercise library, now on Home.
 *
 * Moved out of the Programs tab (2026-11-06, Reza: exercise search
 * belongs on Home; the Home preview is the nicer entry point). The
 * full browser — search (fa + en), muscle-group chips, equipment
 * chips, and a detail view with a cinematic archetype hero, the
 * animated muscle-activation figure, numbered execution steps, the
 * MuscleWiki video (when available), and similar exercises as art
 * cards — lives here with its own query/muscle/equipment/selected
 * state. Home opens it unfiltered («همه حرکت‌ها») or filtered to the
 * BodyMap muscle, and re-tapping a muscle resets it via resetKey.
 *
 * Original component. All strings go through t() — never hard-coded
 * (archetype labels come from lib/archetypes, keyed by lang).
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import '../styles/exercise-display.css';
import ExerciseArt from './ExerciseArt';
import ExerciseDetail from './ExerciseDetail';
import { artVariantOf } from '../lib/exerciseArt';
import { muscleArtOf } from '../lib/muscleArt';
import { getBannedExerciseKeys } from '../lib/banned';
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

export type MuscleFilter = MuscleGroup | 'all';
type EquipFilter = Equipment | 'all';

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

export default function ExerciseLibrary({
  initialMuscle,
  resetKey,
  onClose,
}: {
  /** Muscle the library opens filtered to (from the Home body map). */
  initialMuscle?: MuscleFilter;
  /** Bumped by Home on every open: resets query/filters/selection. */
  resetKey?: number;
  /** Collapse the library back to the Home preview. */
  onClose?: () => void;
}): ReactElement {
  const { t, lang } = useLang();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleFilter>(initialMuscle ?? 'all');
  const [equipment, setEquipment] = useState<EquipFilter>('all');
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [bannedKeys, setBannedKeys] = useState<string[]>(() => getBannedExerciseKeys());

  // Every fresh open from Home (preview «همه حرکت‌ها» or a BodyMap
  // tap) starts clean with the requested muscle filter — a stale
  // search from the previous open must never leak into the next one.
  useEffect(() => {
    setQuery('');
    setMuscle(initialMuscle ?? 'all');
    setEquipment('all');
    setSelected(null);
    // initialMuscle is intentionally read only when resetKey changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

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
    <section className="card exercise-library" data-exercise-library>
      {selected ? (
        <ExerciseDetail
          exercise={selected}
          onBack={() => setSelected(null)}
          onSelect={setSelected}
          onBannedChange={() => setBannedKeys(getBannedExerciseKeys())}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <h2 style={{ margin: 0, fontSize: 'var(--text-h1)' }}>{t('workouts.title')}</h2>
            {onClose && (
              <button
                type="button"
                className="btn-ghost"
                data-library-close
                onClick={onClose}
              >
                {t('home.libraryClose')}
              </button>
            )}
          </div>

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

          {muscle !== 'all' && (
            <p className="card-meta" style={{ margin: 0 }}>
              {lang === 'fa'
                ? `${results.length} حرکت برای ${t(`lib.muscle.${muscle}`)} — روی یک حرکت بزن (قدم دوم)`
                : `${results.length} exercises for ${t(`lib.muscle.${muscle}`)} — tap one (step 2)`}
            </p>
          )}
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
                        {bannedKeys.includes(e.key) ? (
                          <span className="ex-video-badge">
                            {lang === 'fa' ? 'حذف‌شده از برنامه' : 'Excluded from programs'}
                          </span>
                        ) : muscleArtOf(e.key) ? (
                          <span className="ex-video-badge">
                            {lang === 'fa' ? 'آواتار' : 'Avatar'}
                          </span>
                        ) : e.videoUrl ? (
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
    </section>
  );
}
