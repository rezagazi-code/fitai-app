/**
 * اپ هوشمند بدنسازی — exercises preview on Home.
 *
 * Sits AFTER the BodyMap block (the session stays first). A small
 * preview, not the whole library: one representative exercise from
 * each of the first six muscle groups, as a compact grid. Each card
 * shows the art thumbnail, fa name + en name, and a muscle chip, and
 * tapping it expands EXACTLY ONE slide-down panel beneath it (demo +
 * correct form + explanation). «همه حرکت‌ها» jumps to the library tab
 * unfiltered, through the same tab-switch the BodyMap tap uses.
 * All cards start closed.
 */
import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import ExerciseArt from './ExerciseArt';
import ExerciseSlidePanel from './ExerciseSlidePanel';
import { artVariantOf } from '../lib/exerciseArt';
import { muscleArtOf } from '../lib/muscleArt';
import {
  EXERCISES,
  MUSCLE_GROUPS,
  type Exercise,
} from '../lib/exercises';
import './HomeExercisesPreview.css';
import './HomeExercisesPreview.css';

/** One representative move per muscle group (first six groups). */
function previewExercises(): Exercise[] {
  const out: Exercise[] = [];
  for (const g of MUSCLE_GROUPS.slice(0, 6)) {
    const e = EXERCISES.find((x) => x.muscle === g);
    if (e) out.push(e);
  }
  return out;
}

export default function HomeExercisesPreview({
  onSeeAll,
}: {
  /** Jump to the library tab, unfiltered. */
  onSeeAll: () => void;
}): ReactElement {
  const { t } = useLang();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const preview = previewExercises();
  return (
    <section className="card" data-home-exercises>
      <h2 className="card-title home-ex-title">{t('home.exercisesPreviewTitle')}</h2>
      <div className="home-ex-grid">
        {preview.map((e) => {
          const expanded = openKey === e.key;
          return (
            <div key={e.key} className="home-ex-item" data-home-exercise={e.key}>
              <button
                type="button"
                className="home-ex-card"
                aria-expanded={expanded}
                onClick={() => setOpenKey(expanded ? null : e.key)}
              >
                <ExerciseArt
                  variant={artVariantOf(e)}
                  alt={e.nameFa}
                  raster={muscleArtOf(e.key)}
                  className="home-ex-art"
                />
                <span className="home-ex-name">{e.nameFa}</span>
                <span className="home-ex-en" dir="ltr">{e.nameEn}</span>
                <span className="chip home-ex-chip">{t(`lib.muscle.${e.muscle}`)}</span>
                <span className="home-ex-chev" aria-hidden="true">{expanded ? '⌃' : '⌄'}</span>
              </button>
              <ExerciseSlidePanel exercise={e} open={expanded} />
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="btn-ghost home-ex-all"
        style={{ width: '100%', marginTop: 12 }}
        data-home-all-exercises
        onClick={onSeeAll}
      >
        {t('home.allExercises')}
      </button>
    </section>
  );
}
