/**
 * اپ هوشمند بدنسازی — shared exercise slide-down panel.
 *
 * One animated panel (the session board's grid-rows technique) used by
 * the Home exercises preview and the 4-week program rows: the movement
 * demo from the wired art, the correct form + explanation from the
 * exercise's own stored instructions (both languages, as stored), and
 * a video button ONLY where a verified MuscleWiki URL already exists
 * on the exercise (videoUrl !== '' — exactly the 9 verified slugs;
 * everything else gets no video button, never an invented URL).
 * Unwired art shows the honest placeholder note, never a fake demo.
 */
import type { ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import AnimatedDemo from './AnimatedDemo';
import { muscleArtOf } from '../lib/muscleArt';
import type { Exercise } from '../lib/exercises';
import './ExerciseSlidePanel.css';

export default function ExerciseSlidePanel({
  exercise,
  open,
}: {
  exercise: Exercise;
  open: boolean;
}): ReactElement {
  const { lang } = useLang();
  const fa = lang === 'fa';
  const art = muscleArtOf(exercise.key);
  return (
    <div
      className={`xpan${open ? ' is-open' : ''}`}
      data-exercise-panel={exercise.key}
    >
      <div className="xpan-inner">
        {art ? (
          <div className="xpan-demo">
            <AnimatedDemo src={art} alt={exercise.nameFa} />
            {exercise.videoUrl !== '' && (
              <button
                type="button"
                className="xpan-video"
                onClick={() => window.open(exercise.videoUrl, '_blank', 'noopener')}
              >
                {fa ? '▶ ویدیو' : '▶ Video'}
              </button>
            )}
          </div>
        ) : (
          <p className="card-meta" style={{ margin: '10px 0 0' }}>
            {fa ? 'نمایش این حرکت هنوز آماده نیست.' : 'The movement demo is not ready yet.'}
          </p>
        )}
        <p className="xpan-instructions">
          {fa ? exercise.instructionsFa : exercise.instructionsEn}
        </p>
        <p className="xpan-instructions xpan-instructions--alt" dir={fa ? 'ltr' : 'rtl'}>
          {fa ? exercise.instructionsEn : exercise.instructionsFa}
        </p>
      </div>
    </div>
  );
}
