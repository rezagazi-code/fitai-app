/**
 * اپ هوشمند بدنسازی — MuscleFigure.
 *
 * Neon line-art athlete (original hand-authored SVG, no copied artwork)
 * in the same visual language as the archetype illustrations: thin
 * glowing strokes on near-black. Muscle regions are blurred glow
 * shapes that PULSE on a staggered loop — primary muscles bright and
 * fast, secondary dim and slow — so the figure feels alive instead of
 * a static diagram. Paired with animated per-muscle engagement % bars
 * (the dossier §5 "Lats 100%" pattern, original rendering).
 *
 * Purely presentational: props are data, no logic or data flow changes.
 * The exported props API is unchanged ({ primary, secondary, rows }).
 */
import { useId, type ReactElement } from 'react';
import type { MuscleGroup } from '../lib/exercises';

export interface MuscleRow {
  label: string;
  pct: number;
  primary: boolean;
}

interface MuscleFigureProps {
  primary: MuscleGroup;
  secondary: MuscleGroup[];
  rows: MuscleRow[];
}

type RegionId =
  | 'traps'
  | 'delts'
  | 'pecs'
  | 'lats'
  | 'abs'
  | 'biceps'
  | 'forearms'
  | 'quads'
  | 'glutes'
  | 'calves';

type RegionState = 'off' | 'secondary' | 'primary';

/** Which figure regions each muscle group lights up. */
const MUSCLE_REGIONS: Record<MuscleGroup, RegionId[]> = {
  chest: ['pecs'],
  back: ['lats', 'traps'],
  shoulders: ['delts'],
  biceps: ['biceps'],
  triceps: ['biceps'],
  legs: ['quads'],
  glutes: ['glutes'],
  core: ['abs'],
  calves: ['calves'],
  forearms: ['forearms'],
  fullbody: ['traps', 'delts', 'pecs', 'lats', 'abs', 'biceps', 'forearms', 'quads', 'glutes', 'calves'],
};

const REGION_ORDER: RegionId[] = [
  'traps', 'delts', 'pecs', 'lats', 'abs',
  'biceps', 'forearms', 'quads', 'glutes', 'calves',
];

function regionStates(primary: MuscleGroup, secondary: MuscleGroup[]): Record<RegionId, RegionState> {
  const out: Record<RegionId, RegionState> = {
    traps: 'off', delts: 'off', pecs: 'off', lats: 'off', abs: 'off',
    biceps: 'off', forearms: 'off', quads: 'off', glutes: 'off', calves: 'off',
  };
  const paint = (m: MuscleGroup, s: RegionState): void => {
    for (const r of MUSCLE_REGIONS[m]) {
      if (out[r] === 'primary') continue;
      out[r] = s;
    }
  };
  for (const m of secondary) paint(m, 'secondary');
  paint(primary, 'primary');
  // legs-primary also warms the calves, back-primary the forearms — anatomy, not decoration
  if (primary === 'legs' && out.calves === 'off') out.calves = 'secondary';
  if (primary === 'back' && out.forearms === 'off') out.forearms = 'secondary';
  return out;
}

/** Left-half glow shapes; the right half is a mirrored <use/>. */
function GlowShapes({ uid, states }: { uid: string; states: Record<RegionId, RegionState> }): ReactElement {
  const glId = `mfGl${uid}`;
  const shape = (r: RegionId, d: string): ReactElement | null => {
    const s = states[r];
    if (s === 'off') return null;
    return (
      <path
        key={r}
        d={d}
        fill={s === 'primary' ? '#8fe9ff' : '#2e7fc9'}
        className={s === 'primary' ? 'mf-glow mf-glow--primary' : 'mf-glow mf-glow--secondary'}
        style={{ animationDelay: `${REGION_ORDER.indexOf(r) * 0.18}s` }}
      />
    );
  };
  const ellipse = (r: RegionId, cx: number, cy: number, rx: number, ry: number): ReactElement | null => {
    const s = states[r];
    if (s === 'off') return null;
    return (
      <ellipse
        key={r}
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill={s === 'primary' ? '#8fe9ff' : '#2e7fc9'}
        className={s === 'primary' ? 'mf-glow mf-glow--primary' : 'mf-glow mf-glow--secondary'}
        style={{ animationDelay: `${REGION_ORDER.indexOf(r) * 0.18}s` }}
      />
    );
  };
  return (
    <>
      <g id={glId}>
        {shape('traps', 'M88,66 C74,68 62,73 54,82 L58,88 C68,80 80,75 91,73 Z')}
        {ellipse('delts', 50, 99, 12, 16)}
        {shape('pecs', 'M74,100 Q86,95 98,99 L96,128 Q85,133 75,128 Z')}
        {shape('lats', 'M56,108 C52,126 54,144 58,158 L64,156 C60,142 58,126 60,110 Z')}
        {shape('abs', 'M86,144 C85,157 85,170 87,181 L99,181 L99,144 Z')}
        {shape('biceps', 'M52,118 C48,128 48,142 52,152 L62,150 C60,140 60,130 62,122 Z')}
        {shape('forearms', 'M50,158 C50,170 52,182 54,190 L64,190 C62,180 61,168 62,158 Z')}
        {shape('quads', 'M62,210 C58,232 58,256 62,276 L86,276 C88,254 88,232 86,210 Z')}
        {shape('glutes', 'M60,184 C58,194 60,204 64,212 L70,208 C66,200 64,192 64,184 Z')}
        {shape('calves', 'M66,282 C64,298 66,314 70,328 L88,328 C90,314 90,298 88,282 Z')}
      </g>
      <use href={`#${glId}`} transform="translate(200 0) scale(-1 1)" />
    </>
  );
}

/** Left-half line art; the right half is a mirrored <use/>. */
function LineArt({ uid }: { uid: string }): ReactElement {
  const llId = `mfLl${uid}`;
  const p = (d: string): ReactElement => <path key={d} d={d} />;
  return (
    <>
      <g id={llId}>
        {p('M90,50 L88,66')}
        {p('M88,66 C74,68 62,73 54,82')}
        {p('M54,82 C42,88 38,102 42,116 C40,128 40,140 42,152')}
        {p('M42,152 C42,166 44,180 46,192')}
        {p('M46,192 C43,203 46,213 55,214 C63,213 65,203 62,192')}
        {p('M62,192 C60,178 60,164 62,152')}
        {p('M62,152 C62,140 62,128 64,118')}
        {p('M64,118 C66,110 68,104 70,100')}
        {p('M54,82 C48,104 50,128 56,148 C58,158 60,166 62,174 C64,186 66,196 68,206')}
        {p('M72,104 C66,124 66,144 70,162')}
        {p('M70,126 Q84,136 98,136')}
        {p('M70,148 C74,160 76,172 76,184')}
        {p('M84,142 C84,156 84,170 86,182')}
        {p('M86,152 L100,152')}
        {p('M86,164 L100,164')}
        {p('M88,176 L100,176')}
        {p('M68,206 C66,228 64,252 64,274')}
        {p('M64,274 C64,294 66,312 68,328')}
        {p('M68,328 L68,344')}
        {p('M92,206 C90,228 88,252 88,274')}
        {p('M88,274 C88,294 90,312 92,328')}
        {p('M92,328 L92,344')}
        {p('M66,344 L94,344 L94,352 Q94,360 86,360 L74,360 Q66,360 66,352 Z')}
      </g>
      <use href={`#${llId}`} transform="translate(200 0) scale(-1 1)" />
      {/* center pieces (drawn once, not mirrored) */}
      <ellipse cx="100" cy="30" rx="17" ry="21" />
      <path d="M100,94 L100,136" />
      <path d="M100,142 L100,184" />
    </>
  );
}

export default function MuscleFigure({ primary, secondary, rows }: MuscleFigureProps): ReactElement {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const blurId = `mfBlur${uid}`;
  const lineId = `mfLine${uid}`;
  const states = regionStates(primary, secondary);

  return (
    <div className="ex-activation">
      <div className="ex-figure">
        <svg viewBox="0 0 200 380" role="img" aria-hidden="true">
          <defs>
            <linearGradient id={lineId} gradientUnits="userSpaceOnUse" x1="100" y1="0" x2="100" y2="380">
              <stop offset="0%" stopColor="#9be9ff" />
              <stop offset="55%" stopColor="#5fc4ff" />
              <stop offset="100%" stopColor="#2e9cff" />
            </linearGradient>
            <filter id={blurId} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>

          {/* pulsing muscle glow, behind the line art */}
          <g filter={`url(#${blurId})`}>
            <GlowShapes uid={uid} states={states} />
          </g>

          {/* neon outline athlete */}
          <g
            className="ex-figure__lines"
            fill="none"
            stroke={`url(#${lineId})`}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <LineArt uid={uid} />
          </g>
        </svg>
      </div>

      {/* per-muscle engagement % bars */}
      <div className="ex-bars">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="ex-bar__head">
              <span className={r.primary ? 'ex-bar__name' : 'ex-bar__name ex-bar__name--dim'}>{r.label}</span>
              <span className={r.primary ? 'ex-bar__pct' : 'ex-bar__pct ex-bar__pct--dim'}>{r.pct}٪</span>
            </div>
            <div className="ex-bar__track">
              <div
                className={r.primary ? 'ex-bar__fill ex-bar__fill--primary' : 'ex-bar__fill ex-bar__fill--secondary'}
                style={{ width: `${r.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
