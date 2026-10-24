/**
 * اپ هوشمند بدنسازی — movement archetype mapping.
 *
 * Every one of the 158 library exercises maps to exactly one of 12
 * movement archetypes. The illustrator agent renders one cinematic neon
 * line-art PNG per archetype at `public/img/archetypes/<slug>.png`;
 * this module is the single source of truth for exercise key →
 * archetype and for the art URL.
 *
 * Visual data only — no training logic lives here.
 */

export type ArchetypeSlug =
  | 'push-horizontal'
  | 'push-vertical'
  | 'squat'
  | 'hinge'
  | 'pull-horizontal'
  | 'pull-vertical'
  | 'curl'
  | 'triceps'
  | 'raise-lateral'
  | 'fly'
  | 'lunge'
  | 'core';

export interface ArchetypeInfo {
  slug: ArchetypeSlug;
  labelFa: string;
  labelEn: string;
  /** true = multi-joint («ترکیبی»), false = isolation («مجزا») */
  compound: boolean;
}

export const ARCHETYPE_ORDER: ArchetypeSlug[] = [
  'push-horizontal',
  'push-vertical',
  'squat',
  'hinge',
  'pull-horizontal',
  'pull-vertical',
  'curl',
  'triceps',
  'raise-lateral',
  'fly',
  'lunge',
  'core',
];

export const ARCHETYPES: Record<ArchetypeSlug, ArchetypeInfo> = {
  'push-horizontal': { slug: 'push-horizontal', labelFa: 'پرس افقی', labelEn: 'Horizontal push', compound: true },
  'push-vertical': { slug: 'push-vertical', labelFa: 'پرس عمودی', labelEn: 'Vertical push', compound: true },
  squat: { slug: 'squat', labelFa: 'اسکوات', labelEn: 'Squat', compound: true },
  hinge: { slug: 'hinge', labelFa: 'لولای باسن', labelEn: 'Hip hinge', compound: true },
  'pull-horizontal': { slug: 'pull-horizontal', labelFa: 'کشش افقی', labelEn: 'Horizontal pull', compound: true },
  'pull-vertical': { slug: 'pull-vertical', labelFa: 'کشش عمودی', labelEn: 'Vertical pull', compound: true },
  curl: { slug: 'curl', labelFa: 'جلو بازو', labelEn: 'Curl', compound: false },
  triceps: { slug: 'triceps', labelFa: 'پشت بازو', labelEn: 'Triceps', compound: false },
  'raise-lateral': { slug: 'raise-lateral', labelFa: 'بالا آوردن', labelEn: 'Raise', compound: false },
  fly: { slug: 'fly', labelFa: 'فلای', labelEn: 'Fly', compound: false },
  lunge: { slug: 'lunge', labelFa: 'لانج', labelEn: 'Lunge', compound: true },
  core: { slug: 'core', labelFa: 'میان‌تنه', labelEn: 'Core', compound: true },
};

/**
 * All 158 exercise keys → their movement archetype.
 * Assigned by movement pattern (not just primary muscle): e.g. dips and
 * close-grip bench read as triceps work, pullovers as vertical pulls,
 * hip thrusts as hinges.
 */
export const EXERCISE_ARCHETYPE: Record<string, ArchetypeSlug> = {
  /* ---- push-horizontal (15) ---- */
  'barbell-bench-press': 'push-horizontal',
  'dumbbell-bench-press': 'push-horizontal',
  'incline-barbell-press': 'push-horizontal',
  'incline-dumbbell-press': 'push-horizontal',
  'decline-barbell-press': 'push-horizontal',
  'machine-chest-press': 'push-horizontal',
  'push-up': 'push-horizontal',
  'knee-push-up': 'push-horizontal',
  'incline-push-up': 'push-horizontal',
  'decline-push-up': 'push-horizontal',
  'diamond-push-up': 'push-horizontal',
  'plyo-push-up': 'push-horizontal',
  'single-arm-cable-press': 'push-horizontal',
  'dumbbell-floor-press': 'push-horizontal',
  'chest-dip': 'push-horizontal',
  /* ---- push-vertical (10) ---- */
  'overhead-press': 'push-vertical',
  'seated-dumbbell-press': 'push-vertical',
  'standing-dumbbell-press': 'push-vertical',
  'arnold-press': 'push-vertical',
  'machine-shoulder-press': 'push-vertical',
  'seated-barbell-press': 'push-vertical',
  'behind-neck-press': 'push-vertical',
  'pike-push-up': 'push-vertical',
  'kettlebell-press': 'push-vertical',
  'clean-and-press': 'push-vertical',
  /* ---- squat (23) ---- */
  'barbell-squat': 'squat',
  'front-squat': 'squat',
  'leg-press': 'squat',
  'leg-extension': 'squat',
  'hack-squat': 'squat',
  'goblet-squat': 'squat',
  'sissy-squat': 'squat',
  'bodyweight-squat': 'squat',
  'wall-sit': 'squat',
  'pistol-squat': 'squat',
  'jump-squat': 'squat',
  'smith-squat': 'squat',
  'box-squat': 'squat',
  'hip-abduction-machine': 'squat',
  'standing-calf-raise': 'squat',
  'seated-calf-raise': 'squat',
  'single-leg-dumbbell-calf-raise': 'squat',
  'leg-press-calf-raise': 'squat',
  'bodyweight-calf-raise': 'squat',
  'smith-calf-raise': 'squat',
  'donkey-calf-raise': 'squat',
  'dumbbell-thruster': 'squat',
  'man-maker': 'squat',
  /* ---- hinge (21) ---- */
  deadlift: 'hinge',
  'romanian-deadlift': 'hinge',
  hyperextension: 'hinge',
  'sumo-deadlift': 'hinge',
  'stiff-leg-deadlift': 'hinge',
  'lying-leg-curl': 'hinge',
  'seated-leg-curl': 'hinge',
  'db-romanian-deadlift': 'hinge',
  'single-leg-deadlift': 'hinge',
  'barbell-hip-thrust': 'hinge',
  'glute-bridge': 'hinge',
  'cable-kickback': 'hinge',
  clamshell: 'hinge',
  'fire-hydrant': 'hinge',
  'good-morning': 'hinge',
  'cable-pull-through': 'hinge',
  'single-leg-hip-thrust': 'hinge',
  'band-abduction': 'hinge',
  'kettlebell-swing': 'hinge',
  'dumbbell-snatch': 'hinge',
  'farmers-walk': 'hinge',
  /* ---- pull-horizontal (8) ---- */
  'barbell-row': 'pull-horizontal',
  'one-arm-dumbbell-row': 'pull-horizontal',
  't-bar-row': 'pull-horizontal',
  'seated-cable-row': 'pull-horizontal',
  'underhand-barbell-row': 'pull-horizontal',
  'machine-row': 'pull-horizontal',
  'band-row': 'pull-horizontal',
  'face-pull': 'pull-horizontal',
  /* ---- pull-vertical (8) ---- */
  'pull-up': 'pull-vertical',
  'lat-pulldown': 'pull-vertical',
  'close-grip-pulldown': 'pull-vertical',
  'chin-up': 'pull-vertical',
  'dumbbell-pullover': 'pull-vertical',
  'straight-arm-pulldown': 'pull-vertical',
  'assisted-pull-up': 'pull-vertical',
  'dead-hang': 'pull-vertical',
  /* ---- curl (17) ---- */
  'barbell-curl': 'curl',
  'dumbbell-curl': 'curl',
  'alternating-curl': 'curl',
  'hammer-curl': 'curl',
  'cable-curl': 'curl',
  'preacher-curl': 'curl',
  'incline-dumbbell-curl': 'curl',
  'concentration-curl': 'curl',
  'reverse-curl': 'curl',
  'spider-curl': 'curl',
  'machine-curl': 'curl',
  'band-curl': 'curl',
  'single-arm-cable-curl': 'curl',
  'wrist-curl': 'curl',
  'reverse-wrist-curl': 'curl',
  'plate-pinch': 'curl',
  'wrist-roller': 'curl',
  /* ---- triceps (13) ---- */
  dips: 'triceps',
  'tricep-pushdown': 'triceps',
  skullcrusher: 'triceps',
  'overhead-dumbbell-extension': 'triceps',
  'single-arm-overhead-extension': 'triceps',
  'bench-dip': 'triceps',
  'rope-pushdown': 'triceps',
  'dumbbell-kickback': 'triceps',
  'close-grip-bench-press': 'triceps',
  'machine-dip': 'triceps',
  'band-pushdown': 'triceps',
  'seated-barbell-extension': 'triceps',
  'weighted-dip': 'triceps',
  /* ---- raise-lateral (8) ---- */
  'lateral-raise': 'raise-lateral',
  'front-raise': 'raise-lateral',
  'cable-lateral-raise': 'raise-lateral',
  'cable-front-raise': 'raise-lateral',
  'upright-row': 'raise-lateral',
  'dumbbell-upright-row': 'raise-lateral',
  'barbell-shrug': 'raise-lateral',
  'dumbbell-shrug': 'raise-lateral',
  /* ---- fly (8) ---- */
  'dumbbell-fly': 'fly',
  'incline-dumbbell-fly': 'fly',
  'cable-crossover': 'fly',
  'cable-fly': 'fly',
  'pec-deck': 'fly',
  'band-chest-fly': 'fly',
  'rear-delt-fly': 'fly',
  'cable-rear-delt-fly': 'fly',
  /* ---- lunge (7) ---- */
  'dumbbell-lunge': 'lunge',
  'barbell-lunge': 'lunge',
  'bulgarian-split-squat': 'lunge',
  'dumbbell-step-up': 'lunge',
  'walking-lunge': 'lunge',
  'lateral-lunge': 'lunge',
  'reverse-lunge': 'lunge',
  /* ---- core (20) ---- */
  plank: 'core',
  crunch: 'core',
  'sit-up': 'core',
  'lying-leg-raise': 'core',
  'hanging-leg-raise': 'core',
  'russian-twist': 'core',
  'side-plank': 'core',
  'mountain-climber': 'core',
  'dead-bug': 'core',
  'ab-wheel-rollout': 'core',
  'cable-crunch': 'core',
  'cable-woodchopper': 'core',
  'bicycle-crunch': 'core',
  'decline-sit-up': 'core',
  superman: 'core',
  'bird-dog': 'core',
  'reverse-plank': 'core',
  burpee: 'core',
  'turkish-get-up': 'core',
  'jumping-jack': 'core',
};

/** Archetype for an exercise key; fails soft to 'core' for unknown keys. */
export function archetypeOf(key: string): ArchetypeSlug {
  return EXERCISE_ARCHETYPE[key] ?? 'core';
}

/** Public URL of the illustrator's archetype art. */
export function archetypeArtUrl(slug: ArchetypeSlug): string {
  return `/img/archetypes/${slug}.png`;
}

export function archetypeLabel(info: ArchetypeInfo, lang: 'fa' | 'en'): string {
  return lang === 'fa' ? info.labelFa : info.labelEn;
}

/** «ترکیبی» / «مجزا» — derived from the movement pattern, shown as card meta. */
export function compoundLabel(compound: boolean, lang: 'fa' | 'en'): string {
  if (lang === 'fa') return compound ? 'ترکیبی' : 'مجزا';
  return compound ? 'Compound' : 'Isolation';
}
