/**
 * اپ هوشمند بدنسازی — raster muscle illustrations.
 *
 * Original muscle-only anatomical images (start + end panels, involved
 * muscles glowing cyan), generated for the app — chest, shoulders and
 * back families. When an exercise has a raster image, ExerciseArt renders
 * it instead of the parametric neon vector; every other exercise keeps
 * the vector fallback until its own family is produced.
 * Back notes: dumbbell-shrug v2 (regen) is mapped — end panel shows a
 * correct vertical shrug with straight arms, not an upright row.
 * close-grip-pulldown is mapped but flagged: its start panel shows a
 * wide bar rather than a close-grip handle.
 */
const MUSCLE_ART: Record<string, string> = {
  'barbell-bench-press': 'bench-press-barbell',
  'dumbbell-bench-press': 'bench-press-dumbbell',
  'incline-barbell-press': 'bench-press-incline-barbell',
  'incline-dumbbell-press': 'bench-press-incline-dumbbell',
  'decline-barbell-press': 'decline-barbell-press',
  'dumbbell-fly': 'dumbbell-fly',
  'incline-dumbbell-fly': 'incline-dumbbell-fly',
  'cable-crossover': 'cable-crossover',
  'cable-fly': 'cable-fly',
  'machine-chest-press': 'machine-chest-press',
  'pec-deck': 'pec-deck',
  'push-up': 'push-up',
  'knee-push-up': 'knee-push-up',
  'incline-push-up': 'incline-push-up',
  'decline-push-up': 'decline-push-up',
  'diamond-push-up': 'diamond-push-up',
  'plyo-push-up': 'plyo-push-up',
  'single-arm-cable-press': 'single-arm-cable-press',
  'band-chest-fly': 'band-chest-fly',
  'dumbbell-floor-press': 'dumbbell-floor-press',
  'chest-dip': 'chest-dip',
  // Shoulders (18)
  'overhead-press': 'overhead-press',
  'seated-dumbbell-press': 'seated-dumbbell-press',
  'standing-dumbbell-press': 'standing-dumbbell-press',
  'lateral-raise': 'lateral-raise',
  'front-raise': 'front-raise',
  'rear-delt-fly': 'rear-delt-fly',
  'upright-row': 'upright-row',
  'arnold-press': 'arnold-press',
  'cable-lateral-raise': 'cable-lateral-raise',
  'face-pull': 'face-pull',
  'machine-shoulder-press': 'machine-shoulder-press',
  'cable-rear-delt-fly': 'cable-rear-delt-fly',
  'seated-barbell-press': 'seated-barbell-press',
  'dumbbell-upright-row': 'dumbbell-upright-row',
  'behind-neck-press': 'behind-neck-press',
  'pike-push-up': 'pike-push-up',
  'kettlebell-press': 'kettlebell-press',
  'cable-front-raise': 'cable-front-raise',
  // Back (21 of 21)
  'barbell-row': 'barbell-row',
  'deadlift': 'deadlift',
  'pull-up': 'pull-up',
  'lat-pulldown': 'lat-pulldown',
  'close-grip-pulldown': 'close-grip-pulldown',
  'one-arm-dumbbell-row': 'one-arm-dumbbell-row',
  't-bar-row': 't-bar-row',
  'seated-cable-row': 'seated-cable-row',
  'chin-up': 'chin-up',
  'romanian-deadlift': 'romanian-deadlift',
  'underhand-barbell-row': 'underhand-barbell-row',
  'dumbbell-pullover': 'dumbbell-pullover',
  'straight-arm-pulldown': 'straight-arm-pulldown',
  'hyperextension': 'hyperextension',
  'barbell-shrug': 'barbell-shrug',
  'machine-row': 'machine-row',
  'sumo-deadlift': 'sumo-deadlift',
  'assisted-pull-up': 'assisted-pull-up',
  'band-row': 'band-row',
  'stiff-leg-deadlift': 'stiff-leg-deadlift',
  'dumbbell-shrug': 'dumbbell-shrug',
};

/** Public path of the raster muscle image for an exercise key, or null. */
export function muscleArtOf(key: string): string | null {
  const stem = MUSCLE_ART[key];
  return stem ? `/img/muscle/${stem}.webp` : null;
}
