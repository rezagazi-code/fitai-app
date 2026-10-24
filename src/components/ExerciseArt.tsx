/**
 * اپ هوشمند بدنسازی — parametric neon exercise illustration.
 *
 * The old archetype PNGs gave every bench press the same picture (a
 * dumbbell press even showed a barbell). This component draws the
 * exercise itself as neon line-art SVG: the body position comes from
 * the pose, the implement from the equipment — so a barbell bench,
 * a dumbbell bench, an incline bench and a machine press are four
 * visibly different pictures, and every one of the 158 library
 * exercises gets its own variant via lib/exerciseArt.
 *
 * Style: cyan glow strokes on the card's dark surface, diagrammatic
 * but anatomically readable — the trainee must recognise the movement
 * at card size.
 */
import type { ReactElement } from 'react';
import type { ArtEquip, ArtPose, ArtVariant } from '../lib/exerciseArt';

const CYAN = '#8ff4ff';
const GLOW = 'rgba(0, 240, 255, 0.20)';
const EQUIP = '#2e9cff';
const EQUIP_GLOW = 'rgba(46, 156, 255, 0.22)';
const FRAME = '#50648c';

/** One neon segment: soft glow underlay + bright core.
 *  Body segments (default cyan) carry the `fig-body` class so the
 *  mass-underlay pass can thicken them into a filled silhouette. */
function S(x1: number, y1: number, x2: number, y2: number, c: string = CYAN, w = 6.5): ReactElement {
  const g = c === CYAN ? GLOW : EQUIP_GLOW;
  return (
    <g key={`${x1},${y1}-${x2},${y2}-${c}`} className={c === CYAN ? 'fig-body' : undefined}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={g} strokeWidth={w + 6} strokeLinecap="round" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={w} strokeLinecap="round" />
    </g>
  );
}

/** Head: filled, shaded — a figure, not a stick-man circle. */
function H(cx: number, cy: number, r = 9): ReactElement {
  return (
    <g key={`h${cx},${cy}`}>
      <circle cx={cx} cy={cy} r={r + 3.5} fill="none" stroke={GLOW} strokeWidth={3.5} />
      <circle cx={cx} cy={cy} r={r} fill="rgba(0, 240, 255, 0.16)" stroke={CYAN} strokeWidth={3.5} />
      <circle cx={cx - 2.5} cy={cy - 2.5} r={r - 5.5} fill="rgba(143, 244, 255, 0.35)" stroke="none" />
    </g>
  );
}

/** Barbell: horizontal bar + plates, centred on (cx, y). */
function Bar(cx: number, y: number, half = 48): ReactElement {
  return (
    <g key={`bar${cx},${y}`}>
      <line x1={cx - half} y1={y} x2={cx + half} y2={y} stroke={EQUIP_GLOW} strokeWidth={9} strokeLinecap="round" />
      <line x1={cx - half} y1={y} x2={cx + half} y2={y} stroke={EQUIP} strokeWidth={4} strokeLinecap="round" />
      {[-half + 2, half - 2].map((dx) => (
        <rect key={dx} x={cx + dx - 3} y={y - 11} width={6} height={22} rx={2.5} fill={EQUIP} opacity={0.9} />
      ))}
      {[-half + 10, half - 10].map((dx) => (
        <rect key={dx} x={cx + dx - 2} y={y - 7} width={4} height={14} rx={2} fill={EQUIP} opacity={0.65} />
      ))}
    </g>
  );
}

/** Dumbbell at (cx, cy), short bar + plates. */
function Db(cx: number, cy: number): ReactElement {
  return (
    <g key={`db${cx},${cy}`}>
      <line x1={cx - 11} y1={cy} x2={cx + 11} y2={cy} stroke={EQUIP_GLOW} strokeWidth={8} strokeLinecap="round" />
      <line x1={cx - 11} y1={cy} x2={cx + 11} y2={cy} stroke={EQUIP} strokeWidth={3.5} strokeLinecap="round" />
      {[-11, 11].map((dx) => (
        <rect key={dx} x={cx + dx - 2.5} y={cy - 8} width={5} height={16} rx={2} fill={EQUIP} opacity={0.9} />
      ))}
    </g>
  );
}

/** Kettlebell: ball + handle arc. */
function Kb(cx: number, cy: number): ReactElement {
  return (
    <g key={`kb${cx},${cy}`}>
      <path d={`M ${cx - 7} ${cy - 2} a 7 7 0 0 1 14 0`} fill="none" stroke={EQUIP} strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy + 8} r={9} fill="none" stroke={EQUIP} strokeWidth={4} />
    </g>
  );
}

/** Bench: top line + legs. `tilt` in degrees (positive = head end low). */
function Bench(x1: number, y1: number, x2: number, y2: number): ReactElement {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return (
    <g key={`bench${x1},${y1}`}>
      {S(x1, y1, x2, y2, FRAME, 4)}
      {S(x1 + 8, my + (y1 < y2 ? 4 : -4), x1 + 8, 152, FRAME, 3.5)}
      {S(mx, my + 2, mx, 152, FRAME, 3.5)}
    </g>
  );
}

/** Machine frame: two uprights + top beam. */
function Frame(x1: number, x2: number, top = 22, bottom = 158): ReactElement {
  return (
    <g key={`frame${x1}`}>
      {S(x1, top, x1, bottom, FRAME, 4)}
      {S(x2, top, x2, bottom, FRAME, 4)}
      {S(x1, top, x2, top, FRAME, 4)}
    </g>
  );
}

/** Cable line from a pulley point to a hand point. */
function Cable(px: number, py: number, hx: number, hy: number): ReactElement {
  return (
    <g key={`cable${px},${py}-${hx},${hy}`}>
      <circle cx={px} cy={py} r={5} fill="none" stroke={FRAME} strokeWidth={3} />
      {S(px, py, hx, hy, EQUIP, 2.5)}
    </g>
  );
}

/** Hands implement for press poses: bar / dumbbell pair / machine handles / KB. */
function PressHands(cx: number, y: number, equip: ArtEquip): ReactElement {
  switch (equip) {
    case 'barbell':
      return Bar(cx, y, 48);
    case 'dumbbell':
      return (
        <g>
          {Db(cx - 18, y)}
          {Db(cx + 18, y)}
        </g>
      );
    case 'machine':
      return (
        <g>
          {Frame(34, 166, 18)}
          {S(cx - 18, y + 14, cx - 18, y, EQUIP, 4)}
          {S(cx + 18, y + 14, cx + 18, y, EQUIP, 4)}
        </g>
      );
    case 'kettlebell':
      return Kb(cx, y - 4);
    case 'cable':
      return (
        <g>
          {Cable(34, 24, cx - 18, y)}
          {Cable(166, 24, cx + 18, y)}
        </g>
      );
    default:
      return <g />;
  }
}

/* ================= poses ================= */

type PoseFn = (v: ArtVariant) => ReactElement;

function benchPose(angle: 'flat' | 'incline' | 'decline'): PoseFn {
  return ({ equip }: ArtVariant) => {
    // Head is always at the LEFT end of the bench: incline = head end
    // HIGH (y1 < y2), decline = head end LOW (y1 > y2).
    const tilt = angle === 'flat' ? 0 : angle === 'incline' ? 26 : -26;
    const y1 = 118 - tilt / 2;
    const y2 = 118 + tilt / 2;
    const hx = 52;
    const hy = y1 - 12;
    const tx = 108;
    const ty = (y1 + y2) / 2 - 4;
    const barY = angle === 'decline' ? 66 : angle === 'incline' ? 58 : 66;
    return (
      <g>
        {Bench(42, y1, 152, y2)}
        {H(hx, hy)}
        {S(hx + 8, hy + 4, tx, ty)}
        {S(tx, ty, 130, ty + 12)}
        {S(130, ty + 12, 132, 148)}
        {S(132, 148, 146, 148)}
        {/* arms up to the implement */}
        {S(76, ty - 2, 76, barY + 12)}
        {S(76, barY + 12, 88, barY + 4)}
        {S(88, barY + 4, 100, barY + 4)}
        {equip === 'barbell' && Bar(100, barY, 46)}
        {equip === 'dumbbell' && (
          <g>
            {Db(84, barY)}
            {Db(112, barY)}
          </g>
        )}
        {equip === 'machine' && (
          <g>
            {Frame(34, 166, 18)}
            {S(84, barY + 16, 84, barY, EQUIP, 4)}
            {S(116, barY + 16, 116, barY, EQUIP, 4)}
          </g>
        )}
        {equip === 'cable' && (
          <g>
            {Cable(34, 30, 84, barY)}
            {Cable(166, 30, 116, barY)}
          </g>
        )}
      </g>
    );
  };
}

const POSES = {} as Record<ArtPose, PoseFn>;
Object.assign(POSES, {
  'bench-flat': benchPose('flat'),
  'bench-incline': benchPose('incline'),
  'bench-decline': benchPose('decline'),

  'push-up': (({ form }: ArtVariant) => {
    const floor = (
      <g>
        {S(20, 152, 180, 152, FRAME, 3)}
      </g>
    );
    switch (form) {
      case 'knees':
        return (
          <g>
            {floor}
            {H(52, 96)}
            {S(60, 100, 104, 122)}
            {S(104, 122, 128, 138)}
            {S(128, 138, 154, 148)}
            {S(74, 108, 80, 132)}
            {S(80, 132, 80, 150)}
          </g>
        );
      case 'incline':
        return (
          <g>
            {floor}
            <rect x={52} y={118} width={34} height={34} rx={3} fill="none" stroke={FRAME} strokeWidth={3.5} />
            {H(66, 92)}
            {S(74, 96, 122, 122)}
            {S(122, 122, 158, 138)}
            {S(158, 138, 168, 138)}
            {S(80, 104, 80, 118)}
          </g>
        );
      case 'decline':
        return (
          <g>
            {floor}
            <rect x={138} y={108} width={34} height={44} rx={3} fill="none" stroke={FRAME} strokeWidth={3.5} />
            {H(50, 98)}
            {S(58, 102, 112, 116)}
            {S(112, 116, 146, 110)}
            {S(146, 110, 152, 110)}
            {S(72, 110, 78, 134)}
            {S(78, 134, 78, 150)}
          </g>
        );
      case 'diamond':
        return (
          <g>
            {floor}
            {H(52, 96)}
            {S(60, 100, 118, 122)}
            {S(118, 122, 158, 136)}
            {S(158, 136, 168, 136)}
            {S(74, 108, 78, 132)}
            {S(78, 132, 78, 150)}
            {S(88, 108, 78, 132)}
          </g>
        );
      case 'pike':
        return (
          <g>
            {floor}
            {H(58, 122)}
            {S(66, 118, 104, 72)}
            {S(104, 72, 148, 118)}
            {S(148, 118, 156, 118)}
            {S(72, 112, 76, 150)}
          </g>
        );
      case 'plyo':
        return (
          <g>
            {floor}
            {H(52, 92)}
            {S(60, 96, 118, 118)}
            {S(118, 118, 158, 132)}
            {S(158, 132, 168, 132)}
            {S(74, 104, 80, 128)}
            {S(80, 128, 80, 140)}
            <path d="M 66 138 q 8 8 0 16" fill="none" stroke={CYAN} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
            <path d="M 94 138 q 8 8 0 16" fill="none" stroke={CYAN} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
          </g>
        );
      default:
        return (
          <g>
            {floor}
            {H(52, 96)}
            {S(60, 100, 118, 122)}
            {S(118, 122, 158, 136)}
            {S(158, 136, 168, 136)}
            {S(74, 108, 80, 132)}
            {S(80, 132, 80, 150)}
          </g>
        );
    }
  }) as PoseFn,

  dip: ({ equip }: ArtVariant) => (
    <g>
      {S(52, 104, 148, 104, FRAME, 4.5)}
      {S(60, 104, 60, 152, FRAME, 3.5)}
      {S(140, 104, 140, 152, FRAME, 3.5)}
      {H(100, 52)}
      {S(100, 60, 100, 102)}
      {S(100, 68, 84, 92)}
      {S(84, 92, 84, 104)}
      {S(100, 102, 118, 128)}
      {S(118, 128, 106, 148)}
      {equip === 'machine' && Frame(34, 166, 18)}
    </g>
  ),

  'press-seated': ({ equip }: ArtVariant) => (
    <g>
      {S(56, 58, 56, 132, FRAME, 4)}
      {S(56, 132, 108, 132, FRAME, 4)}
      {H(96, 50)}
      {S(96, 58, 96, 108)}
      {S(96, 108, 130, 114)}
      {S(130, 114, 130, 150)}
      {S(96, 66, 84, 42)}
      {S(84, 42, 90, 28)}
      {S(96, 66, 108, 42)}
      {S(108, 42, 102, 28)}
      {PressHands(96, 26, equip)}
    </g>
  ),

  'press-standing': ({ equip }: ArtVariant) => (
    <g>
      {H(100, 38)}
      {S(100, 46, 100, 100)}
      {S(100, 100, 84, 150)}
      {S(100, 100, 116, 150)}
      {S(100, 54, 84, 30)}
      {S(84, 30, 88, 20)}
      {S(100, 54, 116, 30)}
      {S(116, 30, 112, 20)}
      {PressHands(100, 18, equip)}
    </g>
  ),

  squat: ({ equip, hold }: ArtVariant) => (
    <g>
      {H(100, 34)}
      {S(100, 42, 100, 86)}
      {S(100, 86, 76, 116)}
      {S(76, 116, 80, 150)}
      {S(100, 86, 122, 116)}
      {S(122, 116, 118, 150)}
      {equip === 'barbell' && Bar(100, 44, 48)}
      {equip === 'machine' && (
        <g>
          {Frame(40, 160, 18)}
          {S(60, 44, 140, 44, EQUIP, 4)}
        </g>
      )}
      {equip === 'dumbbell' &&
        (hold === 'chest' ? (
          <>
            {S(100, 52, 92, 68)}
            {S(100, 52, 108, 68)}
            {Db(100, 72)}
          </>
        ) : (
          <g>
            {Db(82, 48)}
            {Db(118, 48)}
          </g>
        ))}
    </g>
  ),

  'leg-press': () => (
    <g>
      {S(150, 56, 150, 136, FRAME, 5)}
      {S(150, 56, 122, 56, FRAME, 4)}
      {S(150, 136, 122, 136, FRAME, 4)}
      {S(52, 128, 96, 108, FRAME, 4)}
      {H(66, 92)}
      {S(74, 96, 98, 112)}
      {S(98, 112, 146, 82)}
      {S(146, 82, 150, 82)}
    </g>
  ),

  'leg-extension': () => (
    <g>
      {S(56, 52, 56, 126, FRAME, 4)}
      {S(56, 126, 112, 126, FRAME, 4)}
      {H(86, 46)}
      {S(86, 54, 86, 104)}
      {S(86, 104, 126, 110)}
      {S(126, 110, 126, 150)}
      <rect x={118} y={132} width={16} height={10} rx={3} fill={EQUIP} opacity={0.85} />
    </g>
  ),

  'leg-curl-lying': () => (
    <g>
      {Bench(40, 112, 152, 112)}
      {H(50, 100)}
      {S(58, 104, 112, 104)}
      {S(112, 104, 138, 108)}
      {S(138, 108, 138, 68)}
      <rect x={130} y={62} width={16} height={10} rx={3} fill={EQUIP} opacity={0.85} />
    </g>
  ),

  'leg-curl-seated': () => (
    <g>
      {S(56, 52, 56, 126, FRAME, 4)}
      {S(56, 126, 112, 126, FRAME, 4)}
      {H(86, 46)}
      {S(86, 54, 86, 104)}
      {S(86, 104, 126, 110)}
      {S(126, 110, 116, 148)}
      <rect x={108} y={140} width={16} height={10} rx={3} fill={EQUIP} opacity={0.85} />
    </g>
  ),

  'calf-raise': ({ equip }: ArtVariant) => (
    <g>
      <rect x={70} y={146} width={60} height={8} rx={3} fill="none" stroke={FRAME} strokeWidth={3.5} />
      {H(100, 34)}
      {S(100, 42, 100, 96)}
      {S(100, 96, 88, 146)}
      {S(100, 96, 112, 146)}
      {S(88, 146, 100, 142)}
      {S(112, 146, 124, 142)}
      {equip === 'barbell' && Bar(100, 44, 46)}
      {equip === 'machine' && Frame(56, 144, 18)}
      {equip === 'dumbbell' && (
        <g>
          {Db(76, 100)}
          {Db(124, 100)}
        </g>
      )}
    </g>
  ),

  abduction: ({ equip }: ArtVariant) => (
    <g>
      {S(56, 126, 140, 126, FRAME, 4)}
      {H(86, 46)}
      {S(86, 54, 86, 106)}
      {S(86, 106, 58, 138)}
      {S(86, 106, 116, 138)}
      {equip === 'band' && S(58, 138, 116, 138, EQUIP, 3)}
      {equip === 'machine' && (
        <g>
          <rect x={48} y={128} width={12} height={18} rx={3} fill={EQUIP} opacity={0.85} />
          <rect x={112} y={128} width={12} height={18} rx={3} fill={EQUIP} opacity={0.85} />
        </g>
      )}
    </g>
  ),

  hinge: ({ equip }: ArtVariant) => (
    <g>
      {H(68, 56)}
      {S(76, 62, 110, 94)}
      {S(110, 94, 116, 150)}
      {S(110, 94, 100, 150)}
      {S(84, 70, 96, 124)}
      {S(96, 124, 106, 124)}
      {equip === 'barbell' && Bar(106, 128, 40)}
      {equip === 'dumbbell' && (
        <g>
          {Db(96, 128)}
          {Db(118, 128)}
        </g>
      )}
      {equip === 'kettlebell' && Kb(106, 126)}
      {equip === 'cable' && Cable(158, 152, 106, 124)}
    </g>
  ),

  'hip-thrust': ({ equip }: ArtVariant) => (
    <g>
      {Bench(38, 104, 92, 104)}
      {H(58, 92)}
      {S(66, 96, 106, 114)}
      {S(106, 114, 140, 128)}
      {S(140, 128, 140, 152)}
      {equip === 'barbell' && Bar(106, 106, 36)}
      {equip === 'dumbbell' && Db(106, 106)}
    </g>
  ),

  swing: () => (
    <g>
      {H(72, 60)}
      {S(80, 66, 110, 94)}
      {S(110, 94, 116, 150)}
      {S(110, 94, 100, 150)}
      {S(86, 72, 138, 112)}
      {Kb(146, 118)}
    </g>
  ),

  'glute-kickback': () => (
    <g>
      {H(70, 38)}
      {S(70, 46, 70, 96)}
      {S(70, 96, 70, 150)}
      {S(70, 96, 118, 118)}
      {S(118, 118, 126, 118)}
      {Cable(160, 152, 122, 118)}
    </g>
  ),
});
/* ================= poses, part 2: pull / curl / triceps ================= */
/* (appended to ExerciseArt.tsx — the POSES record continues below) */

Object.assign(POSES, {
  'row-bent': (({ equip }: ArtVariant) => (
    <g>
      {H(58, 52)}
      {S(66, 58, 106, 90)}
      {S(106, 90, 112, 150)}
      {S(106, 90, 98, 150)}
      {S(74, 66, 96, 96)}
      {S(96, 96, 96, 106)}
      {equip === 'barbell' && Bar(96, 110, 36)}
      {equip === 'dumbbell' && Db(96, 108)}
      {equip === 'cable' && Cable(158, 130, 96, 106)}
    </g>
  )) as PoseFn,

  'row-seated': (({ equip }: ArtVariant) => (
    <g>
      {S(150, 40, 150, 132, FRAME, 4)}
      {S(56, 128, 110, 128, FRAME, 4)}
      {H(74, 48)}
      {S(74, 56, 74, 106)}
      {S(74, 106, 128, 118)}
      {S(128, 118, 128, 150)}
      {S(74, 64, 124, 92)}
      {equip === 'cable' && Cable(150, 92, 124, 92)}
      {equip === 'machine' && <rect x={140} y={84} width={14} height={18} rx={3} fill={EQUIP} opacity={0.85} />}
      {equip === 'band' && S(124, 92, 150, 92, EQUIP, 3)}
    </g>
  )) as PoseFn,

  pulldown: (({ equip }: ArtVariant) => (
    <g>
      {Frame(56, 144, 18)}
      {S(56, 126, 112, 126, FRAME, 4)}
      {H(100, 58)}
      {S(100, 66, 100, 112)}
      {S(100, 112, 132, 118)}
      {S(132, 118, 132, 150)}
      {S(100, 72, 82, 38)}
      {S(82, 38, 82, 32)}
      {S(100, 72, 118, 38)}
      {S(118, 38, 118, 32)}
      {Bar(100, 30, 40)}
      {equip === 'cable' && Cable(100, 18, 100, 30)}
    </g>
  )) as PoseFn,

  'pull-up': () => (
    <g>
      {S(48, 28, 152, 28, FRAME, 4.5)}
      {S(48, 28, 48, 60, FRAME, 3.5)}
      {S(152, 28, 152, 60, FRAME, 3.5)}
      {H(100, 54)}
      {S(100, 62, 100, 104)}
      {S(100, 70, 80, 30)}
      {S(100, 70, 120, 30)}
      {S(100, 104, 116, 130)}
      {S(116, 130, 106, 148)}
    </g>
  ),

  pullover: () => (
    <g>
      {Bench(42, 116, 152, 116)}
      {H(52, 104)}
      {S(60, 108, 110, 108)}
      {S(110, 108, 132, 116)}
      {S(132, 116, 132, 148)}
      {S(66, 108, 46, 78)}
      {Db(42, 72)}
    </g>
  ),

  'curl-standing': (({ equip }: ArtVariant) => (
    <g>
      {H(100, 38)}
      {S(100, 46, 100, 100)}
      {S(100, 100, 84, 150)}
      {S(100, 100, 116, 150)}
      {S(100, 54, 86, 84)}
      {S(86, 84, 86, 62)}
      {S(100, 54, 114, 84)}
      {S(114, 84, 114, 62)}
      {equip === 'barbell' && Bar(100, 60, 34)}
      {equip === 'dumbbell' && (
        <g>
          {Db(86, 60)}
          {Db(114, 60)}
        </g>
      )}
      {equip === 'cable' && (
        <g>
          {Cable(60, 152, 86, 62)}
          {Cable(140, 152, 114, 62)}
        </g>
      )}
      {equip === 'band' && S(86, 62, 114, 62, EQUIP, 3)}
      {equip === 'machine' && (
        <g>
          {Frame(60, 140, 90)}
          {S(86, 62, 114, 62, EQUIP, 4)}
        </g>
      )}
    </g>
  )) as PoseFn,

  'curl-preacher': (({ equip }: ArtVariant) => (
    <g>
      {S(72, 122, 132, 78, FRAME, 4.5)}
      {S(72, 122, 72, 150, FRAME, 3.5)}
      {H(70, 44)}
      {S(70, 52, 70, 96)}
      {S(70, 96, 100, 100)}
      {S(70, 60, 100, 92)}
      {S(100, 92, 106, 72)}
      {equip === 'barbell' && Bar(106, 68, 26)}
      {equip === 'dumbbell' && Db(106, 68)}
    </g>
  )) as PoseFn,

  'curl-incline': () => (
    <g>
      {Bench(48, 142, 142, 78)}
      {H(72, 96)}
      {S(80, 102, 108, 118)}
      {S(108, 118, 128, 118)}
      {S(88, 108, 82, 140)}
      {Db(80, 144)}
      {Db(100, 144)}
    </g>
  ),

  pushdown: (({ equip }: ArtVariant) => (
    <g>
      {Frame(70, 130, 18)}
      {Cable(100, 22, 100, 62)}
      {H(100, 40)}
      {S(100, 48, 100, 100)}
      {S(100, 100, 84, 150)}
      {S(100, 100, 116, 150)}
      {S(100, 56, 88, 86)}
      {S(88, 86, 88, 116)}
      {S(100, 56, 112, 86)}
      {S(112, 86, 112, 116)}
      {S(84, 116, 116, 116, EQUIP, 4)}
      {equip === 'band' && S(100, 22, 100, 62, EQUIP, 3)}
    </g>
  )) as PoseFn,

  'extension-overhead': (({ equip }: ArtVariant) => (
    <g>
      {S(56, 128, 112, 128, FRAME, 4)}
      {H(96, 50)}
      {S(96, 58, 96, 108)}
      {S(96, 108, 128, 114)}
      {S(128, 114, 128, 150)}
      {S(96, 64, 82, 44)}
      {S(82, 44, 92, 28)}
      {S(96, 64, 110, 44)}
      {S(110, 44, 100, 28)}
      {equip === 'dumbbell' && Db(96, 24)}
      {equip === 'barbell' && Bar(96, 24, 30)}
    </g>
  )) as PoseFn,

  skull: (({ equip }: ArtVariant) => (
    <g>
      {Bench(42, 116, 152, 116)}
      {H(52, 104)}
      {S(60, 108, 110, 108)}
      {S(110, 108, 132, 116)}
      {S(132, 116, 132, 148)}
      {S(66, 108, 66, 82)}
      {S(66, 82, 80, 74)}
      {equip === 'barbell' && Bar(82, 72, 30)}
      {equip === 'dumbbell' && (
        <g>
          {Db(74, 72)}
          {Db(92, 72)}
        </g>
      )}
    </g>
  )) as PoseFn,

  kickback: () => (
    <g>
      {H(58, 52)}
      {S(66, 58, 106, 90)}
      {S(106, 90, 112, 150)}
      {S(106, 90, 98, 150)}
      {S(74, 66, 104, 88)}
      {S(104, 88, 132, 88)}
      {Db(136, 88)}
    </g>
  ),
});
/* ================= poses, part 3: raise / fly / lunge / core ================= */

Object.assign(POSES, {
  'raise-lateral': (({ equip }: ArtVariant) => (
    <g>
      {H(100, 38)}
      {S(100, 46, 100, 100)}
      {S(100, 100, 84, 150)}
      {S(100, 100, 116, 150)}
      {S(100, 54, 56, 68)}
      {S(100, 54, 144, 68)}
      {equip === 'dumbbell' && (
        <g>
          {Db(52, 68)}
          {Db(148, 68)}
        </g>
      )}
      {equip === 'cable' && (
        <g>
          {Cable(40, 150, 56, 68)}
          {Cable(160, 150, 144, 68)}
        </g>
      )}
    </g>
  )) as PoseFn,

  'raise-front': (({ equip }: ArtVariant) => (
    <g>
      {H(78, 38)}
      {S(78, 46, 78, 100)}
      {S(78, 100, 62, 150)}
      {S(78, 100, 94, 150)}
      {S(78, 54, 122, 62)}
      {equip === 'dumbbell' && Db(126, 62)}
      {equip === 'barbell' && Bar(126, 62, 30)}
      {equip === 'cable' && Cable(150, 150, 122, 62)}
    </g>
  )) as PoseFn,

  'reverse-fly': (({ equip }: ArtVariant) => (
    <g>
      {H(100, 48)}
      {S(100, 56, 100, 100)}
      {S(100, 100, 84, 150)}
      {S(100, 100, 116, 150)}
      {S(100, 64, 54, 90)}
      {S(100, 64, 146, 90)}
      {equip === 'dumbbell' && (
        <g>
          {Db(50, 90)}
          {Db(150, 90)}
        </g>
      )}
      {equip === 'cable' && (
        <g>
          {Cable(54, 150, 54, 90)}
          {Cable(146, 150, 146, 90)}
        </g>
      )}
    </g>
  )) as PoseFn,

  shrug: (({ equip }: ArtVariant) => (
    <g>
      {H(100, 38)}
      {S(100, 46, 100, 100)}
      {S(100, 100, 84, 150)}
      {S(100, 100, 116, 150)}
      {S(88, 48, 78, 44)}
      {S(112, 48, 122, 44)}
      {S(100, 56, 78, 104)}
      {S(100, 56, 122, 104)}
      {equip === 'barbell' && Bar(100, 108, 44)}
      {equip === 'dumbbell' && (
        <g>
          {Db(78, 106)}
          {Db(122, 106)}
        </g>
      )}
    </g>
  )) as PoseFn,

  'fly-lying': (({ equip, angle }: ArtVariant) => {
    const inc = angle === 'incline';
    // Fragment (not <g>): the underlay pass hides direct <g> children
    // without .fig-body, so body segments must stay direct children.
    const bench = inc ? (
      <>
        {Bench(44, 96, 150, 134)}
        {H(56, 84)}
      </>
    ) : (
      <>
        {Bench(42, 118, 152, 118)}
        {H(52, 106)}
      </>
    );
    const handY = inc ? 72 : 88;
    return (
      <g>
        {bench}
        {inc ? S(64, 90, 106, 112) : S(60, 110, 110, 110)}
        {S(inc ? 110 : 110, inc ? 108 : 110, 132, 118)}
        {S(132, 118, 132, 148)}
        {S(74, inc ? 100 : 110, 62, handY)}
        {S(62, handY, 56, handY - 6)}
        {equip === 'dumbbell' && (
          <g>
            {Db(52, handY - 8)}
            {Db(88, handY - 8)}
          </g>
        )}
        {equip === 'cable' && (
          <g>
            {Cable(34, 60, 56, handY - 6)}
            {Cable(166, 60, 88, handY - 6)}
          </g>
        )}
      </g>
    );
  }) as PoseFn,

  'fly-machine': () => (
    <g>
      {S(60, 128, 116, 128, FRAME, 4)}
      {S(60, 40, 60, 128, FRAME, 4)}
      {S(140, 40, 140, 128, FRAME, 4)}
      {H(100, 48)}
      {S(100, 56, 100, 108)}
      {S(100, 108, 132, 114)}
      {S(132, 114, 132, 150)}
      {S(100, 64, 82, 88)}
      {S(82, 88, 82, 104)}
      {S(100, 64, 118, 88)}
      {S(118, 88, 118, 104)}
      <rect x={76} y={86} width={8} height={26} rx={3} fill={EQUIP} opacity={0.85} />
      <rect x={116} y={86} width={8} height={26} rx={3} fill={EQUIP} opacity={0.85} />
    </g>
  ),

  'fly-cable': (({ equip }: ArtVariant) => (
    <g>
      {Cable(40, 24, 84, 108)}
      {Cable(160, 24, 116, 108)}
      {H(100, 38)}
      {S(100, 46, 100, 100)}
      {S(100, 100, 84, 150)}
      {S(100, 100, 116, 150)}
      {S(100, 56, 84, 108)}
      {S(100, 56, 116, 108)}
      {equip === 'band' && (
        <g>
          {S(40, 24, 84, 108, EQUIP, 3)}
          {S(160, 24, 116, 108, EQUIP, 3)}
        </g>
      )}
    </g>
  )) as PoseFn,

  lunge: (({ equip }: ArtVariant) => (
    <g>
      {H(100, 38)}
      {S(100, 46, 100, 94)}
      {S(100, 94, 126, 124)}
      {S(126, 124, 126, 150)}
      {S(100, 94, 74, 128)}
      {S(74, 128, 70, 150)}
      {equip === 'barbell' && Bar(100, 46, 44)}
      {equip === 'dumbbell' && (
        <g>
          {Db(76, 100)}
          {Db(124, 100)}
        </g>
      )}
      {equip === 'kettlebell' && (
        <g>
          {S(100, 54, 100, 26)}
          {Kb(100, 20)}
        </g>
      )}
    </g>
  )) as PoseFn,

  'step-up': (({ equip }: ArtVariant) => (
    <g>
      <rect x={112} y={118} width={42} height={34} rx={3} fill="none" stroke={FRAME} strokeWidth={3.5} />
      {H(80, 38)}
      {S(80, 46, 80, 94)}
      {S(80, 94, 112, 118)}
      {S(112, 118, 128, 118)}
      {S(80, 94, 68, 150)}
      {equip === 'dumbbell' && (
        <g>
          {Db(58, 100)}
          {Db(102, 100)}
        </g>
      )}
    </g>
  )) as PoseFn,

  plank: () => (
    <g>
      {S(20, 152, 180, 152, FRAME, 3)}
      {S(52, 138, 82, 138)}
      {H(52, 124)}
      {S(60, 128, 128, 122)}
      {S(128, 122, 162, 134)}
      {S(162, 134, 168, 134)}
    </g>
  ),

  crunch: (({ equip }: ArtVariant) => (
    <g>
      {S(20, 122, 180, 122, FRAME, 3)}
      {H(56, 92)}
      {S(64, 98, 110, 116)}
      {S(110, 116, 136, 96)}
      {S(136, 96, 136, 120)}
      {S(64, 98, 48, 84)}
      {equip === 'cable' && Cable(100, 22, 48, 84)}
    </g>
  )) as PoseFn,

  'hang-leg-raise': () => (
    <g>
      {S(48, 28, 152, 28, FRAME, 4.5)}
      {H(100, 54)}
      {S(100, 62, 100, 104)}
      {S(100, 70, 80, 30)}
      {S(100, 70, 120, 30)}
      {S(100, 104, 140, 108)}
      {S(140, 108, 140, 138)}
    </g>
  ),

  'lying-leg-raise': () => (
    <g>
      {S(20, 122, 180, 122, FRAME, 3)}
      {H(46, 110)}
      {S(54, 112, 106, 112)}
      {S(106, 112, 106, 56)}
      {S(106, 56, 114, 56)}
    </g>
  ),

  twist: (({ equip }: ArtVariant) => (
    <g>
      {S(40, 128, 160, 128, FRAME, 3)}
      {H(88, 46)}
      {S(88, 54, 88, 106)}
      {S(88, 106, 128, 118)}
      {S(88, 106, 112, 126)}
      {S(88, 62, 124, 86)}
      {equip === 'dumbbell' && Db(128, 86)}
      {equip === 'barbell' && Bar(128, 86, 24)}
    </g>
  )) as PoseFn,

  wheel: () => (
    <g>
      {S(20, 152, 180, 152, FRAME, 3)}
      {S(80, 142, 80, 148)}
      {H(84, 108)}
      {S(90, 114, 122, 104)}
      {S(122, 104, 152, 124)}
      <circle cx={158} cy={130} r={10} fill="none" stroke={EQUIP} strokeWidth={4} />
      <circle cx={158} cy={130} r={3} fill={EQUIP} />
    </g>
  ),

  woodchopper: () => (
    <g>
      {Cable(160, 22, 138, 78)}
      {H(100, 40)}
      {S(100, 48, 100, 100)}
      {S(100, 100, 84, 150)}
      {S(100, 100, 116, 150)}
      {S(100, 56, 138, 78)}
    </g>
  ),

  superman: () => (
    <g>
      {S(20, 132, 180, 132, FRAME, 3)}
      {H(46, 108)}
      {S(54, 112, 112, 116)}
      {S(54, 112, 26, 98)}
      {S(112, 116, 158, 102)}
      {S(112, 116, 150, 128)}
    </g>
  ),

  'bird-dog': () => (
    <g>
      {S(20, 150, 180, 150, FRAME, 3)}
      {S(70, 132, 70, 148)}
      {S(120, 132, 120, 148)}
      {S(70, 114, 120, 114)}
      {H(54, 104)}
      {S(70, 114, 34, 100)}
      {S(120, 114, 160, 98)}
    </g>
  ),

  'farmers-walk': () => (
    <g>
      {H(100, 38)}
      {S(100, 46, 100, 96)}
      {S(100, 96, 78, 150)}
      {S(100, 96, 124, 148)}
      {S(100, 56, 76, 102)}
      {S(100, 56, 124, 102)}
      {Db(76, 106)}
      {Db(124, 106)}
    </g>
  ),
});

/**
 * Neon SVG illustration for one exercise variant. Renders at whatever
 * size its container gives it; the art box keeps the dark surface.
 *
 * Two passes: a mass-underlay (same pose, body segments only,
 * thickened into a filled silhouette so the figure reads as an
 * athlete, not a stick man) beneath the crisp detail pass.
 */
export default function ExerciseArt({
  variant,
  alt,
  className,
  raster,
}: {
  variant: ArtVariant;
  alt: string;
  className?: string;
  /** Original raster muscle image — when present it replaces the vector. */
  raster?: string | null;
}) {
  const Pose = POSES[variant.pose];
  if (raster) {
    return (
      <div className={`ex-art ${className ?? ''}`} role="img" aria-label={alt} style={{ background: '#0b111c' }}>
        <img
          src={raster}
          alt=""
          aria-hidden="true"
          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }
  return (
    <div className={`ex-art ${className ?? ''}`} role="img" aria-label={alt} style={{ background: '#0b111c' }}>
      <style>{`.ex-fig-underlay > g > :not(.fig-body){display:none}.ex-fig-underlay .fig-body line{stroke-width:15px !important;stroke:#155e75 !important}`}</style>
      <svg
        viewBox="10 5 180 160"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <defs>
          <radialGradient id="ex-art-glow" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stopColor="rgba(46,156,255,0.28)" />
            <stop offset="100%" stopColor="rgba(46,156,255,0)" />
          </radialGradient>
        </defs>
        <rect width="200" height="200" fill="url(#ex-art-glow)" />
        <g className="ex-fig-underlay" opacity={0.95}>
          <Pose {...variant} />
        </g>
        <Pose {...variant} />
      </svg>
    </div>
  );
}
