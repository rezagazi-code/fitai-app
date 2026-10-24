/**
 * نقشه بدن — MuscleWiki-style discovery, original art.
 *
 * The idea borrowed from MuscleWiki is structural, not visual: the
 * interface IS the content. Instead of drilling through menus, the
 * user taps a muscle on the figure and the library filters to it
 * (two taps to any exercise: muscle → card). The figure itself is
 * an original neon-dark silhouette; only the concept is shared.
 */
import { useState } from 'react';
import type { MuscleGroup } from '../lib/exercises';

type MuscleFilter = MuscleGroup | 'all';

type Shape =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number };

interface Zone {
  muscle: MuscleGroup;
  front?: Shape[];
  back?: Shape[];
}

const circle = (cx: number, cy: number, r: number): Shape => ({ kind: 'circle', cx, cy, r });
const ellipse = (cx: number, cy: number, rx: number, ry: number): Shape => ({
  kind: 'ellipse',
  cx,
  cy,
  rx,
  ry,
});

const ZONES: Zone[] = [
  {
    muscle: 'shoulders',
    front: [circle(60, 58, 12), circle(140, 58, 12)],
    back: [circle(60, 58, 12), circle(140, 58, 12)],
  },
  { muscle: 'chest', front: [ellipse(100, 82, 30, 16)] },
  { muscle: 'back', back: [ellipse(100, 84, 32, 24)] },
  {
    muscle: 'biceps',
    front: [ellipse(56, 88, 9, 16), ellipse(144, 88, 9, 16)],
  },
  {
    muscle: 'triceps',
    back: [ellipse(56, 88, 9, 16), ellipse(144, 88, 9, 16)],
  },
  {
    muscle: 'forearms',
    front: [ellipse(49, 120, 7, 12), ellipse(151, 120, 7, 12)],
  },
  { muscle: 'core', front: [ellipse(100, 120, 24, 18)] },
  { muscle: 'glutes', back: [ellipse(100, 144, 24, 11)] },
  {
    muscle: 'legs',
    front: [ellipse(83, 170, 11, 20), ellipse(117, 170, 11, 20)],
    back: [ellipse(83, 170, 11, 20), ellipse(117, 170, 11, 20)],
  },
  {
    muscle: 'calves',
    front: [ellipse(80, 200, 8, 10), ellipse(120, 200, 8, 10)],
    back: [ellipse(80, 200, 8, 10), ellipse(120, 200, 8, 10)],
  },
];

function Silhouette() {
  return (
    <g>
      {/* one organic body path so the figure reads as a body, not a diagram */}
      <path
        d="M74,44 C62,44 54,52 52,66 C50,84 48,100 46,118 C44,126 48,132 52,128 C54,112 56,96 58,80 C60,90 64,100 66,112 C68,124 70,132 74,142 C76,160 78,180 78,200 C78,210 84,212 86,206 C88,188 90,168 92,148 C94,144 106,144 108,148 C110,168 112,188 114,206 C116,212 122,210 122,200 C122,180 124,160 126,142 C130,132 132,124 134,112 C136,100 140,90 142,80 C144,96 146,112 148,128 C152,132 156,126 154,118 C152,100 150,84 148,66 C146,52 138,44 126,44 C118,40 82,40 74,44 Z"
        fill="#2e3d5c"
        stroke="#4a5f8a"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <circle cx={100} cy={26} r={13} fill="#2e3d5c" stroke="#4a5f8a" strokeWidth={2} />
    </g>
  );
}

function ZoneShape({ shape, active }: { shape: Shape; active: boolean }) {
  const common = {
    fill: active ? 'rgba(0, 240, 255, 0.35)' : 'rgba(148, 163, 184, 0.16)',
    stroke: active ? '#00F0FF' : 'rgba(226, 232, 240, 0.40)',
    strokeWidth: active ? 2.5 : 1.5,
  };
  return shape.kind === 'circle' ? (
    <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />
  ) : (
    <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />
  );
}

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
      <svg
        viewBox="0 0 200 224"
        className="bodymap__fig"
        role="group"
        aria-label={t('workouts.bodyMap')}
      >
        <Silhouette />
        {zones.map((z) => {
          const shapes = view === 'front' ? z.front! : z.back!;
          const active = selected === z.muscle;
          return (
            <g
              key={z.muscle}
              className="bodymap-zone"
              role="button"
              aria-label={muscleName(z.muscle)}
              aria-pressed={active}
              onClick={() => onSelect(active ? 'all' : z.muscle)}
              style={{ cursor: 'pointer' }}
            >
              {shapes.map((s, i) => (
                <ZoneShape key={i} shape={s} active={active} />
              ))}
              {active &&
                shapes.map((s, i) =>
                  s.kind === 'circle' ? (
                    <circle
                      key={`halo-${i}`}
                      cx={s.cx}
                      cy={s.cy}
                      r={s.r + 5}
                      fill="none"
                      stroke="rgba(0, 240, 255, 0.25)"
                      strokeWidth={7}
                    />
                  ) : (
                    <ellipse
                      key={`halo-${i}`}
                      cx={s.cx}
                      cy={s.cy}
                      rx={s.rx + 5}
                      ry={s.ry + 5}
                      fill="none"
                      stroke="rgba(0, 240, 255, 0.25)"
                      strokeWidth={7}
                    />
                  ),
                )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
