/**
 * اپ هوشمند بدنسازی — MuscleFigure.
 * Original anatomical-style figure (hand-drawn SVG geometry, no copied
 * artwork): a stylized front-view athlete whose muscle regions light up
 * with a neon glow for the primary muscle and a dim steel fill for
 * secondary ones — paired with per-muscle engagement % bars
 * (the "Lats 100%" pattern from dossier §5, original rendering).
 *
 * Purely presentational: props are data, no logic or data flow changes.
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

export default function MuscleFigure({ primary, secondary, rows }: MuscleFigureProps): ReactElement {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `mfGrad${uid}`;
  const glowId = `mfGlow${uid}`;
  const states = regionStates(primary, secondary);

  const fillFor = (r: RegionId): string =>
    states[r] === 'primary' ? `url(#${gradId})` : states[r] === 'secondary' ? '#46536e' : '#232b40';
  const filterFor = (r: RegionId): string | undefined =>
    states[r] === 'primary' ? `url(#${glowId})` : undefined;
  const opacityFor = (r: RegionId): number => (states[r] === 'off' ? 0.55 : 1);

  return (
    <div className="muscle-figure">
      <svg viewBox="0 0 120 232" role="img" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="100%" stopColor="#2e9cff" />
          </linearGradient>
          <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ---- skeleton base (always dim) ---- */}
        <circle cx="60" cy="17" r="12.5" fill="#1a2132" />
        <rect x="54.5" y="28.5" width="11" height="9" rx="3" fill="#1a2132" />
        <rect x="41" y="52" width="38" height="72" rx="15" fill="#1a2132" />
        <rect x="43" y="120" width="34" height="20" rx="9" fill="#1a2132" />
        {/* arms */}
        <rect x="23" y="58" width="13" height="36" rx="6.5" fill="#1a2132" />
        <rect x="84" y="58" width="13" height="36" rx="6.5" fill="#1a2132" />
        <rect x="24.5" y="96" width="10" height="34" rx="5" fill="#1a2132" />
        <rect x="85.5" y="96" width="10" height="34" rx="5" fill="#1a2132" />
        <circle cx="29.5" cy="136" r="5" fill="#1a2132" />
        <circle cx="90.5" cy="136" r="5" fill="#1a2132" />
        {/* legs */}
        <rect x="42.5" y="142" width="15" height="42" rx="7.5" fill="#1a2132" />
        <rect x="62.5" y="142" width="15" height="42" rx="7.5" fill="#1a2132" />
        <rect x="43.5" y="186" width="13" height="28" rx="6.5" fill="#1a2132" />
        <rect x="63.5" y="186" width="13" height="28" rx="6.5" fill="#1a2132" />
        <ellipse cx="50" cy="219" rx="8" ry="4" fill="#1a2132" />
        <ellipse cx="70" cy="219" rx="8" ry="4" fill="#1a2132" />

        {/* ---- light-up regions ---- */}
        {/* traps */}
        <path d="M54,34 L44,38 L38,57 L50,57 Z" fill={fillFor('traps')} filter={filterFor('traps')} opacity={opacityFor('traps')} />
        <path d="M66,34 L76,38 L82,57 L70,57 Z" fill={fillFor('traps')} filter={filterFor('traps')} opacity={opacityFor('traps')} />
        {/* deltoids */}
        <ellipse cx="33" cy="60" rx="10.5" ry="13" fill={fillFor('delts')} filter={filterFor('delts')} opacity={opacityFor('delts')} />
        <ellipse cx="87" cy="60" rx="10.5" ry="13" fill={fillFor('delts')} filter={filterFor('delts')} opacity={opacityFor('delts')} />
        {/* lats (outer torso sides) */}
        <path d="M42,70 Q36,92 42,116 L48,112 Q44,92 47,72 Z" fill={fillFor('lats')} filter={filterFor('lats')} opacity={opacityFor('lats')} />
        <path d="M78,70 Q84,92 78,116 L72,112 Q76,92 73,72 Z" fill={fillFor('lats')} filter={filterFor('lats')} opacity={opacityFor('lats')} />
        {/* pecs */}
        <path d="M44,65 Q52,60 58.5,64 L57.5,80 Q51,84.5 45,80 Z" fill={fillFor('pecs')} filter={filterFor('pecs')} opacity={opacityFor('pecs')} />
        <path d="M76,65 Q68,60 61.5,64 L62.5,80 Q69,84.5 75,80 Z" fill={fillFor('pecs')} filter={filterFor('pecs')} opacity={opacityFor('pecs')} />
        {/* abs */}
        <rect x="50.5" y="86" width="19" height="34" rx="5" fill={fillFor('abs')} filter={filterFor('abs')} opacity={opacityFor('abs')} />
        {/* biceps/triceps (upper arms) */}
        <rect x="25" y="60" width="9" height="30" rx="4.5" fill={fillFor('biceps')} filter={filterFor('biceps')} opacity={opacityFor('biceps')} />
        <rect x="86" y="60" width="9" height="30" rx="4.5" fill={fillFor('biceps')} filter={filterFor('biceps')} opacity={opacityFor('biceps')} />
        {/* forearms */}
        <rect x="26.5" y="98" width="6.5" height="28" rx="3.2" fill={fillFor('forearms')} filter={filterFor('forearms')} opacity={opacityFor('forearms')} />
        <rect x="87" y="98" width="6.5" height="28" rx="3.2" fill={fillFor('forearms')} filter={filterFor('forearms')} opacity={opacityFor('forearms')} />
        {/* glutes */}
        <circle cx="52" cy="131" r="7.5" fill={fillFor('glutes')} filter={filterFor('glutes')} opacity={opacityFor('glutes')} />
        <circle cx="68" cy="131" r="7.5" fill={fillFor('glutes')} filter={filterFor('glutes')} opacity={opacityFor('glutes')} />
        {/* quads */}
        <rect x="44.5" y="144" width="11" height="38" rx="5.5" fill={fillFor('quads')} filter={filterFor('quads')} opacity={opacityFor('quads')} />
        <rect x="64.5" y="144" width="11" height="38" rx="5.5" fill={fillFor('quads')} filter={filterFor('quads')} opacity={opacityFor('quads')} />
        {/* calves */}
        <rect x="45.5" y="188" width="9" height="24" rx="4.5" fill={fillFor('calves')} filter={filterFor('calves')} opacity={opacityFor('calves')} />
        <rect x="65.5" y="188" width="9" height="24" rx="4.5" fill={fillFor('calves')} filter={filterFor('calves')} opacity={opacityFor('calves')} />
      </svg>

      {/* per-muscle engagement % bars (dossier §5 pattern) */}
      <div className="muscle-figure__bars">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="muscle-figure__row-label">
              <span className={r.primary ? 'name' : 'name dim'}>{r.label}</span>
              <span className="muscle-figure__pct">{r.pct}٪</span>
            </div>
            <div className="muscle-figure__track">
              <div
                className={r.primary ? 'muscle-figure__fill' : 'muscle-figure__fill muscle-figure__fill--secondary'}
                style={{ width: `${r.pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
