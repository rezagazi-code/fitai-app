/**
 * اپ هوشمند بدنسازی — per-exercise illustration variants.
 *
 * The old system mapped all 158 exercises to 12 archetype PNGs, so a
 * barbell bench press and a dumbbell bench press showed the SAME
 * picture (and a dumbbell press even showed a barbell). This module
 * derives a distinct art variant per exercise from its movement
 * pattern + primary equipment, so the picture on every card matches
 * the exercise — especially barbell vs dumbbell vs machine vs cable.
 *
 * A variant is { pose, equip }: pose is the body position, equip is
 * the implement drawn in the figure's hands / on the machine.
 * `artVariantOf` is total: every exercise key resolves to something
 * sensible, with explicit overrides for the odd ones.
 */

import type { Equipment, Exercise } from './exercises';
import { archetypeOf } from './archetypes';

export type ArtEquip =
  | 'barbell'
  | 'dumbbell'
  | 'machine'
  | 'cable'
  | 'kettlebell'
  | 'band'
  | 'bodyweight';

export type ArtPose =
  | 'bench-flat'
  | 'bench-incline'
  | 'bench-decline'
  | 'push-up'
  | 'dip'
  | 'press-seated'
  | 'press-standing'
  | 'squat'
  | 'leg-press'
  | 'leg-extension'
  | 'leg-curl-lying'
  | 'leg-curl-seated'
  | 'calf-raise'
  | 'abduction'
  | 'hinge'
  | 'hip-thrust'
  | 'swing'
  | 'glute-kickback'
  | 'row-bent'
  | 'row-seated'
  | 'pulldown'
  | 'pull-up'
  | 'pullover'
  | 'curl-standing'
  | 'curl-preacher'
  | 'curl-incline'
  | 'pushdown'
  | 'extension-overhead'
  | 'skull'
  | 'kickback'
  | 'raise-lateral'
  | 'raise-front'
  | 'reverse-fly'
  | 'shrug'
  | 'fly-lying'
  | 'fly-machine'
  | 'fly-cable'
  | 'lunge'
  | 'step-up'
  | 'plank'
  | 'crunch'
  | 'hang-leg-raise'
  | 'lying-leg-raise'
  | 'twist'
  | 'wheel'
  | 'woodchopper'
  | 'superman'
  | 'bird-dog'
  | 'farmers-walk';

export interface ArtVariant {
  pose: ArtPose;
  equip: ArtEquip;
  /** Squat dumbbell hold: goblet = one DB at chest, else DBs at shoulders. */
  hold?: 'chest' | 'shoulders';
  /** Fly bench angle (incline fly uses a tilted bench). */
  angle?: 'flat' | 'incline';
  /** Push-up form: knee / incline / decline / diamond / pike / plyo. */
  form?: 'knees' | 'incline' | 'decline' | 'diamond' | 'pike' | 'plyo';
}

/** Primary implement: first equipment entry that is not the bench itself. */
function primaryEquip(ex: Exercise): ArtEquip {
  const impl = ex.equipment.find((e) => e !== 'bench');
  if (!impl) return 'bodyweight';
  if (impl === 'barbell' || impl === 'dumbbell' || impl === 'machine' || impl === 'cable' || impl === 'kettlebell' || impl === 'band') return impl;
  return 'bodyweight';
}

/** Explicit overrides for exercises whose key alone misleads the rules. */
const OVERRIDES: Record<string, ArtVariant> = {
  'chest-dip': { pose: 'dip', equip: 'bodyweight' },
  dips: { pose: 'dip', equip: 'bodyweight' },
  'bench-dip': { pose: 'dip', equip: 'bodyweight' },
  'weighted-dip': { pose: 'dip', equip: 'bodyweight' },
  'machine-dip': { pose: 'dip', equip: 'machine' },
  'machine-chest-press': { pose: 'bench-flat', equip: 'machine' },
  'machine-shoulder-press': { pose: 'press-seated', equip: 'machine' },
  'machine-row': { pose: 'row-seated', equip: 'machine' },
  'machine-curl': { pose: 'curl-standing', equip: 'machine' },
  'machine-calf-raise': { pose: 'calf-raise', equip: 'machine' },
  'leg-press-calf-raise': { pose: 'calf-raise', equip: 'machine' },
  'seated-calf-raise': { pose: 'calf-raise', equip: 'machine' },
  'smith-calf-raise': { pose: 'calf-raise', equip: 'machine' },
  'donkey-calf-raise': { pose: 'calf-raise', equip: 'bodyweight' },
  'standing-calf-raise': { pose: 'calf-raise', equip: 'barbell' },
  'bodyweight-calf-raise': { pose: 'calf-raise', equip: 'bodyweight' },
  'single-leg-dumbbell-calf-raise': { pose: 'calf-raise', equip: 'dumbbell' },
  'leg-press': { pose: 'leg-press', equip: 'machine' },
  'leg-extension': { pose: 'leg-extension', equip: 'machine' },
  'hack-squat': { pose: 'squat', equip: 'machine' },
  'smith-squat': { pose: 'squat', equip: 'machine' },
  'hip-abduction-machine': { pose: 'abduction', equip: 'machine' },
  'band-abduction': { pose: 'abduction', equip: 'band' },
  clamshell: { pose: 'abduction', equip: 'bodyweight' },
  'fire-hydrant': { pose: 'bird-dog', equip: 'bodyweight' },
  'cable-kickback': { pose: 'glute-kickback', equip: 'cable' },
  'dumbbell-kickback': { pose: 'kickback', equip: 'dumbbell' },
  'single-arm-cable-press': { pose: 'bench-flat', equip: 'cable' },
  'dumbbell-floor-press': { pose: 'bench-flat', equip: 'dumbbell' },
  'close-grip-bench-press': { pose: 'bench-flat', equip: 'barbell' },
  'dumbbell-pullover': { pose: 'pullover', equip: 'dumbbell' },
  'face-pull': { pose: 'row-seated', equip: 'cable' },
  't-bar-row': { pose: 'row-bent', equip: 'barbell' },
  'band-row': { pose: 'row-seated', equip: 'band' },
  'assisted-pull-up': { pose: 'pull-up', equip: 'machine' },
  'dead-hang': { pose: 'pull-up', equip: 'bodyweight' },
  'straight-arm-pulldown': { pose: 'pulldown', equip: 'cable' },
  'close-grip-pulldown': { pose: 'pulldown', equip: 'machine' },
  'lat-pulldown': { pose: 'pulldown', equip: 'machine' },
  'goblet-squat': { pose: 'squat', equip: 'dumbbell', hold: 'chest' },
  'dumbbell-thruster': { pose: 'squat', equip: 'dumbbell' },
  'man-maker': { pose: 'squat', equip: 'dumbbell' },
  'dumbbell-snatch': { pose: 'press-standing', equip: 'dumbbell' },
  'clean-and-press': { pose: 'press-standing', equip: 'barbell' },
  'kettlebell-press': { pose: 'press-standing', equip: 'kettlebell' },
  'arnold-press': { pose: 'press-seated', equip: 'dumbbell' },
  'behind-neck-press': { pose: 'press-seated', equip: 'barbell' },
  'seated-barbell-press': { pose: 'press-seated', equip: 'barbell' },
  'seated-dumbbell-press': { pose: 'press-seated', equip: 'dumbbell' },
  'standing-dumbbell-press': { pose: 'press-standing', equip: 'dumbbell' },
  'concentration-curl': { pose: 'curl-preacher', equip: 'dumbbell' },
  'spider-curl': { pose: 'curl-preacher', equip: 'barbell' },
  'preacher-curl': { pose: 'curl-preacher', equip: 'barbell' },
  'incline-dumbbell-curl': { pose: 'curl-incline', equip: 'dumbbell' },
  'plate-pinch': { pose: 'farmers-walk', equip: 'bodyweight' },
  'wrist-curl': { pose: 'curl-standing', equip: 'barbell' },
  'reverse-wrist-curl': { pose: 'curl-standing', equip: 'barbell' },
  'wrist-roller': { pose: 'curl-standing', equip: 'barbell' },
  'seated-barbell-extension': { pose: 'extension-overhead', equip: 'barbell' },
  'single-arm-overhead-extension': { pose: 'extension-overhead', equip: 'dumbbell' },
  'overhead-dumbbell-extension': { pose: 'extension-overhead', equip: 'dumbbell' },
  'tricep-pushdown': { pose: 'pushdown', equip: 'cable' },
  'rope-pushdown': { pose: 'pushdown', equip: 'cable' },
  'band-pushdown': { pose: 'pushdown', equip: 'band' },
  skullcrusher: { pose: 'skull', equip: 'barbell' },
  'pec-deck': { pose: 'fly-machine', equip: 'machine' },
  'cable-crossover': { pose: 'fly-cable', equip: 'cable' },
  'cable-fly': { pose: 'fly-cable', equip: 'cable' },
  'band-chest-fly': { pose: 'fly-cable', equip: 'band' },
  'rear-delt-fly': { pose: 'reverse-fly', equip: 'dumbbell' },
  'cable-rear-delt-fly': { pose: 'reverse-fly', equip: 'cable' },
  'incline-dumbbell-fly': { pose: 'fly-lying', equip: 'dumbbell', angle: 'incline' },
  'dumbbell-fly': { pose: 'fly-lying', equip: 'dumbbell' },
  'dumbbell-step-up': { pose: 'step-up', equip: 'dumbbell' },
  'bulgarian-split-squat': { pose: 'lunge', equip: 'dumbbell' },
  'turkish-get-up': { pose: 'lunge', equip: 'kettlebell' },
  burpee: { pose: 'squat', equip: 'bodyweight' },
  'jumping-jack': { pose: 'raise-lateral', equip: 'bodyweight' },
  'mountain-climber': { pose: 'plank', equip: 'bodyweight' },
  'reverse-plank': { pose: 'plank', equip: 'bodyweight' },
  'side-plank': { pose: 'plank', equip: 'bodyweight' },
  'dead-bug': { pose: 'lying-leg-raise', equip: 'bodyweight' },
  'bicycle-crunch': { pose: 'crunch', equip: 'bodyweight' },
  'decline-sit-up': { pose: 'crunch', equip: 'bodyweight' },
  'sit-up': { pose: 'crunch', equip: 'bodyweight' },
  hyperextension: { pose: 'superman', equip: 'bodyweight' },
  'good-morning': { pose: 'hinge', equip: 'barbell' },
  'cable-pull-through': { pose: 'hinge', equip: 'cable' },
  'kettlebell-swing': { pose: 'swing', equip: 'kettlebell' },
  'barbell-shrug': { pose: 'shrug', equip: 'barbell' },
  'dumbbell-shrug': { pose: 'shrug', equip: 'dumbbell' },
  'upright-row': { pose: 'raise-front', equip: 'barbell' },
  'dumbbell-upright-row': { pose: 'raise-front', equip: 'dumbbell' },
  'front-raise': { pose: 'raise-front', equip: 'dumbbell' },
  'cable-front-raise': { pose: 'raise-front', equip: 'cable' },
  'lateral-raise': { pose: 'raise-lateral', equip: 'dumbbell' },
  'cable-lateral-raise': { pose: 'raise-lateral', equip: 'cable' },
  'cable-crunch': { pose: 'crunch', equip: 'cable' },
  'russian-twist': { pose: 'twist', equip: 'dumbbell' },
  'ab-wheel-rollout': { pose: 'wheel', equip: 'bodyweight' },
  'cable-woodchopper': { pose: 'woodchopper', equip: 'cable' },
  'hanging-leg-raise': { pose: 'hang-leg-raise', equip: 'bodyweight' },
  'lying-leg-raise': { pose: 'lying-leg-raise', equip: 'bodyweight' },
  'seated-leg-curl': { pose: 'leg-curl-seated', equip: 'machine' },
  'lying-leg-curl': { pose: 'leg-curl-lying', equip: 'machine' },
  'single-leg-hip-thrust': { pose: 'hip-thrust', equip: 'barbell' },
  'barbell-hip-thrust': { pose: 'hip-thrust', equip: 'barbell' },
  'glute-bridge': { pose: 'hip-thrust', equip: 'bodyweight' },
  'single-leg-deadlift': { pose: 'hinge', equip: 'dumbbell' },
  'db-romanian-deadlift': { pose: 'hinge', equip: 'dumbbell' },
  'stiff-leg-deadlift': { pose: 'hinge', equip: 'barbell' },
  'sumo-deadlift': { pose: 'hinge', equip: 'barbell' },
  'romanian-deadlift': { pose: 'hinge', equip: 'barbell' },
  deadlift: { pose: 'hinge', equip: 'barbell' },
  'pike-push-up': { pose: 'push-up', equip: 'bodyweight', form: 'pike' },
  'plyo-push-up': { pose: 'push-up', equip: 'bodyweight', form: 'plyo' },
  'diamond-push-up': { pose: 'push-up', equip: 'bodyweight', form: 'diamond' },
  'incline-push-up': { pose: 'push-up', equip: 'bodyweight', form: 'incline' },
  'decline-push-up': { pose: 'push-up', equip: 'bodyweight', form: 'decline' },
  'knee-push-up': { pose: 'push-up', equip: 'bodyweight', form: 'knees' },
  'push-up': { pose: 'push-up', equip: 'bodyweight' },
  'overhead-press': { pose: 'press-standing', equip: 'barbell' },
  'barbell-bench-press': { pose: 'bench-flat', equip: 'barbell' },
  'dumbbell-bench-press': { pose: 'bench-flat', equip: 'dumbbell' },
  'incline-barbell-press': { pose: 'bench-incline', equip: 'barbell' },
  'incline-dumbbell-press': { pose: 'bench-incline', equip: 'dumbbell' },
  'decline-barbell-press': { pose: 'bench-decline', equip: 'barbell' },
  'barbell-squat': { pose: 'squat', equip: 'barbell' },
  'front-squat': { pose: 'squat', equip: 'barbell' },
  'box-squat': { pose: 'squat', equip: 'barbell' },
  'bodyweight-squat': { pose: 'squat', equip: 'bodyweight' },
  'sissy-squat': { pose: 'squat', equip: 'bodyweight' },
  'wall-sit': { pose: 'squat', equip: 'bodyweight' },
  'pistol-squat': { pose: 'squat', equip: 'bodyweight' },
  'jump-squat': { pose: 'squat', equip: 'bodyweight' },
  'barbell-row': { pose: 'row-bent', equip: 'barbell' },
  'one-arm-dumbbell-row': { pose: 'row-bent', equip: 'dumbbell' },
  'underhand-barbell-row': { pose: 'row-bent', equip: 'barbell' },
  'seated-cable-row': { pose: 'row-seated', equip: 'cable' },
  'barbell-curl': { pose: 'curl-standing', equip: 'barbell' },
  'dumbbell-curl': { pose: 'curl-standing', equip: 'dumbbell' },
  'alternating-curl': { pose: 'curl-standing', equip: 'dumbbell' },
  'hammer-curl': { pose: 'curl-standing', equip: 'dumbbell' },
  'cable-curl': { pose: 'curl-standing', equip: 'cable' },
  'band-curl': { pose: 'curl-standing', equip: 'band' },
  'reverse-curl': { pose: 'curl-standing', equip: 'barbell' },
  'single-arm-cable-curl': { pose: 'curl-standing', equip: 'cable' },
  'pull-up': { pose: 'pull-up', equip: 'bodyweight' },
  'chin-up': { pose: 'pull-up', equip: 'bodyweight' },
  'barbell-lunge': { pose: 'lunge', equip: 'barbell' },
  'dumbbell-lunge': { pose: 'lunge', equip: 'dumbbell' },
  'walking-lunge': { pose: 'lunge', equip: 'dumbbell' },
  'reverse-lunge': { pose: 'lunge', equip: 'dumbbell' },
  'lateral-lunge': { pose: 'lunge', equip: 'bodyweight' },
  plank: { pose: 'plank', equip: 'bodyweight' },
  crunch: { pose: 'crunch', equip: 'bodyweight' },
  superman: { pose: 'superman', equip: 'bodyweight' },
  'bird-dog': { pose: 'bird-dog', equip: 'bodyweight' },
  'farmers-walk': { pose: 'farmers-walk', equip: 'dumbbell' },
};

/** Distinct art variant for an exercise (falls back to archetype rules). */
export function artVariantOf(ex: Exercise): ArtVariant {
  const hit = OVERRIDES[ex.key];
  if (hit) return hit;
  const eq = primaryEquip(ex);
  const key = ex.key;
  const arch = archetypeOf(key);
  switch (arch) {
    case 'push-horizontal':
      if (key.includes('push-up')) return { pose: 'push-up', equip: 'bodyweight' };
      if (key.includes('dip')) return { pose: 'dip', equip: 'bodyweight' };
      if (key.includes('incline')) return { pose: 'bench-incline', equip: eq };
      if (key.includes('decline')) return { pose: 'bench-decline', equip: eq };
      return { pose: 'bench-flat', equip: eq };
    case 'push-vertical':
      return { pose: key.includes('seated') ? 'press-seated' : 'press-standing', equip: eq };
    case 'squat':
      if (key.includes('calf')) return { pose: 'calf-raise', equip: eq };
      if (key.includes('leg-press')) return { pose: 'leg-press', equip: 'machine' };
      if (key.includes('leg-extension')) return { pose: 'leg-extension', equip: 'machine' };
      if (key.includes('abduction')) return { pose: 'abduction', equip: 'machine' };
      return { pose: 'squat', equip: eq };
    case 'hinge':
      if (key.includes('leg-curl')) return { pose: key.includes('seated') ? 'leg-curl-seated' : 'leg-curl-lying', equip: 'machine' };
      if (key.includes('hip-thrust') || key.includes('glute-bridge')) return { pose: 'hip-thrust', equip: eq };
      if (key.includes('swing')) return { pose: 'swing', equip: eq };
      if (key.includes('kickback')) return { pose: 'glute-kickback', equip: eq };
      return { pose: 'hinge', equip: eq };
    case 'pull-horizontal':
      return { pose: key.includes('seated') || eq === 'machine' || eq === 'band' ? 'row-seated' : 'row-bent', equip: eq };
    case 'pull-vertical':
      if (key.includes('pulldown')) return { pose: 'pulldown', equip: eq };
      if (key.includes('pullover')) return { pose: 'pullover', equip: eq };
      return { pose: 'pull-up', equip: eq };
    case 'curl':
      if (key.includes('preacher') || key.includes('spider') || key.includes('concentration')) return { pose: 'curl-preacher', equip: eq };
      if (key.includes('incline')) return { pose: 'curl-incline', equip: eq };
      return { pose: 'curl-standing', equip: eq };
    case 'triceps':
      if (key.includes('pushdown')) return { pose: 'pushdown', equip: eq };
      if (key.includes('skull')) return { pose: 'skull', equip: eq };
      if (key.includes('overhead') || key.includes('extension')) return { pose: 'extension-overhead', equip: eq };
      if (key.includes('kickback')) return { pose: 'kickback', equip: eq };
      if (key.includes('dip')) return { pose: 'dip', equip: eq };
      return { pose: 'bench-flat', equip: eq };
    case 'raise-lateral':
      if (key.includes('shrug')) return { pose: 'shrug', equip: eq };
      if (key.includes('front')) return { pose: 'raise-front', equip: eq };
      return { pose: 'raise-lateral', equip: eq };
    case 'fly':
      if (eq === 'machine') return { pose: 'fly-machine', equip: eq };
      if (eq === 'cable' || eq === 'band') return { pose: 'fly-cable', equip: eq };
      return { pose: 'fly-lying', equip: eq };
    case 'lunge':
      if (key.includes('step-up')) return { pose: 'step-up', equip: eq };
      return { pose: 'lunge', equip: eq };
    case 'core':
      if (key.includes('plank')) return { pose: 'plank', equip: 'bodyweight' };
      if (key.includes('crunch') || key.includes('sit-up') || key.includes('bicycle')) return { pose: 'crunch', equip: eq };
      if (key.includes('hanging')) return { pose: 'hang-leg-raise', equip: 'bodyweight' };
      if (key.includes('leg-raise') || key.includes('dead-bug')) return { pose: 'lying-leg-raise', equip: 'bodyweight' };
      if (key.includes('twist')) return { pose: 'twist', equip: eq };
      if (key.includes('wheel')) return { pose: 'wheel', equip: 'bodyweight' };
      if (key.includes('woodchopper')) return { pose: 'woodchopper', equip: 'cable' };
      if (key.includes('superman') || key.includes('hyperextension')) return { pose: 'superman', equip: 'bodyweight' };
      if (key.includes('bird-dog')) return { pose: 'bird-dog', equip: 'bodyweight' };
      if (key.includes('climber')) return { pose: 'plank', equip: 'bodyweight' };
      return { pose: 'crunch', equip: eq };
    default:
      return { pose: 'squat', equip: eq };
  }
}

export type { Equipment };
