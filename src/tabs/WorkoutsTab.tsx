/**
 * اپ هوشمند بدنسازی — Workouts tab.
 *
 * Top: active program card (or a "build my plan" CTA when there is none).
 * Below: the Persian exercise library — search (fa + en), muscle-group
 * chips, equipment chips, and a detail view with form cues, a muscle
 * engagement chart, the MuscleWiki video (when available), and similar
 * exercises.
 *
 * Original component. All strings go through t() — never hard-coded.
 */
import { useMemo, useState } from 'react';
import { useLang, type Lang } from '../lib/i18n';
import MuscleFigure, { type MuscleRow } from '../components/MuscleFigure';
import { getActiveProgram } from '../lib/store';
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

function MuscleEngagement({ exercise, t }: { exercise: Exercise; t: (k: string) => string }) {
  // Rows are computed exactly as before — rendering moved to MuscleFigure.
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
      <h4 style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {t('workouts.muscleEngagement')}
      </h4>
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

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <button
        type="button"
        className="btn-ghost"
        onClick={onBack}
        style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: 'var(--text-small)' }}
      >
        ← {t('common.back')}
      </button>

      <div>
        <h2 className="card-title" style={{ marginBottom: 4 }}>
          {lang === 'fa' ? exercise.nameFa : exercise.nameEn}
        </h2>
        <p className="card-meta">{lang === 'fa' ? exercise.nameEn : exercise.nameFa}</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <span className="chip chip--active">{t(`lib.muscle.${exercise.muscle}`)}</span>
        {exercise.secondary.map((m) => (
          <span key={m} className="chip">
            {t(`lib.muscle.${m}`)}
          </span>
        ))}
      </div>

      <MuscleEngagement exercise={exercise} t={t} />

      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {t('workouts.howTo')}
        </h4>
        <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 'var(--leading-loose)' }}>
          {lang === 'fa' ? exercise.instructionsFa : exercise.instructionsEn}
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--text-tiny)', color: 'var(--text-muted)' }}>
          {t('workouts.equipment')}:
        </span>
        {exercise.equipment.map((eq) => (
          <span key={eq} className="chip">
            {t(`lib.equipment.${eq}`)}
          </span>
        ))}
      </div>

      {exercise.videoUrl ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            type="button"
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={() => window.open(exercise.videoUrl, '_blank', 'noopener')}
          >
            ▶ {t('workouts.watchVideo')}
          </button>
          <span style={{ fontSize: 'var(--text-tiny)', color: 'var(--text-muted)', textAlign: 'center' }}>
            {t('workouts.videoOpensExternally')}
          </span>
        </div>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: 'var(--text-small)',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          {t('workouts.noVideo')}
        </p>
      )}

      {similar.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h4 style={{ margin: 0, fontSize: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            {t('workouts.similarExercises')}
          </h4>
          {similar.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => onSelect(s)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
                fontSize: 'var(--text-small)',
              }}
            >
              <span style={{ color: 'var(--text-primary)' }}>
                {lang === 'fa' ? s.nameFa : s.nameEn}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-tiny)' }}>
                {s.equipment.map((eq) => t(`lib.equipment.${eq}`)).join('، ')}
              </span>
            </button>
          ))}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
            <div className="card" style={{ textAlign: 'center' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map((e) => (
                <button
                  key={e.key}
                  type="button"
                  className="lib-card"
                  data-exercise-row={e.key}
                  onClick={() => setSelected(e)}
                >
                  <span className="lib-card__name">{nameOf(e)}</span>
                  <span className="lib-card__meta">
                    <span className="chip chip--active">{t(`lib.muscle.${e.muscle}`)}</span>
                    <span>
                      {e.equipment.map((eq) => t(`lib.equipment.${eq}`)).join(' · ')}
                      {e.videoUrl ? ` · ${t('workouts.hasVideo')}` : ''}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
