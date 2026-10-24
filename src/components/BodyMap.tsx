/**
 * نقشه بدن — MuscleWiki-style discovery, original art.
 *
 * The idea borrowed from MuscleWiki is structural, not visual: the
 * interface IS the content. Instead of drilling through menus, the
 * user taps a muscle on the figure and the library filters to it
 * (two taps to any exercise: muscle → card). The figure itself is
 * the same original muscle-only character as the exercise art:
 * a full-body anatomical figure, front and back, with every major
 * muscle group visible. Tap zones are positioned over it in %.
 */
import { useState } from 'react';
import type { MuscleGroup } from '../lib/exercises';

type MuscleFilter = MuscleGroup | 'all';

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Zone {
  muscle: MuscleGroup;
  front?: Rect[];
  back?: Rect[];
}

const r = (left: number, top: number, width: number, height: number): Rect => ({
  left,
  top,
  width,
  height,
});

const ZONES: Zone[] = [
  {
    muscle: 'shoulders',
    front: [r(20, 18, 16, 8), r(64, 18, 16, 8)],
    back: [r(18, 19, 17, 8), r(65, 19, 17, 8)],
  },
  { muscle: 'chest', front: [r(33, 20, 34, 11)] },
  { muscle: 'back', back: [r(30, 18, 40, 20)] },
  {
    muscle: 'biceps',
    front: [r(16, 28, 11, 10), r(73, 28, 11, 10)],
  },
  {
    muscle: 'triceps',
    back: [r(13, 28, 11, 10), r(76, 28, 11, 10)],
  },
  {
    muscle: 'forearms',
    front: [r(11, 38, 10, 13), r(79, 38, 10, 13)],
  },
  { muscle: 'core', front: [r(36, 30, 28, 18)] },
  { muscle: 'glutes', back: [r(34, 45, 32, 11)] },
  {
    muscle: 'legs',
    front: [r(29, 52, 16, 20), r(55, 52, 16, 20)],
    back: [r(32, 56, 16, 18), r(52, 56, 16, 18)],
  },
  {
    muscle: 'calves',
    front: [r(32, 74, 12, 16), r(56, 74, 12, 16)],
    back: [r(35, 75, 13, 15), r(52, 75, 13, 15)],
  },
];

export default function BodyMap({
  selected,
  onSelect,
  muscleName,
  t,
}: {
  selected: MuscleFilter;
  onSelect: (m: MuscleFilter) => void;
  muscleName: (m: MuscleGroup) => string;
  t: (k: string) => string;
}) {
  const [view, setView] = useState<'front' | 'back'>('front');
  const zones = ZONES.filter((z) => (view === 'front' ? z.front : z.back));

  return (
    <div className="bodymap card">
      <div className="bodymap__head">
        <span className="bodymap__title">{t('workouts.bodyMap')}</span>
        <div className="bodymap__toggle" role="group" aria-label={t('workouts.bodyMap')}>
          <button
            type="button"
            className={view === 'front' ? 'chip chip--active' : 'chip'}
            onClick={() => setView('front')}
          >
            {t('workouts.bodyFront')}
          </button>
          <button
            type="button"
            className={view === 'back' ? 'chip chip--active' : 'chip'}
            onClick={() => setView('back')}
          >
            {t('workouts.bodyBack')}
          </button>
        </div>
      </div>
      <p className="bodymap__hint">{t('workouts.tapMuscle')}</p>
      <div className="bodymap__figwrap" role="group" aria-label={t('workouts.bodyMap')}>
        <img
          className="bodymap__img"
          src={view === 'front' ? '/img/bodymap-front.webp' : '/img/bodymap-back.webp'}
          alt=""
          draggable={false}
        />
        {zones.map((z) => {
          const rects = view === 'front' ? z.front! : z.back!;
          const active = selected === z.muscle;
          return rects.map((rect, i) => (
            <button
              key={`${z.muscle}-${i}`}
              type="button"
              className={active ? 'bodymap-zone bodymap-zone--active' : 'bodymap-zone'}
              aria-label={muscleName(z.muscle)}
              aria-pressed={active}
              onClick={() => onSelect(active ? 'all' : z.muscle)}
              style={{
                left: `${rect.left}%`,
                top: `${rect.top}%`,
                width: `${rect.width}%`,
                height: `${rect.height}%`,
              }}
            />
          ));
        })}
      </div>
    </div>
  );
}
