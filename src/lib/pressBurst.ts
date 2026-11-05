/**
 * اپ هوشمند بدنسازی — JS-driven press burst.
 *
 * The CSS :active-only burst was invisible on real taps: a quick tap
 * ends before the 0.5s ring can play, and :active never fires at all
 * on some touch paths. A pointerdown listener (capture, document-wide)
 * adds .fitai-press-burst, which runs a full ~600ms ring + scale in
 * the button's own --btn-burst-color even after the finger lifts;
 * animationend removes the class so the next tap restarts it.
 * Respects prefers-reduced-motion (burst off entirely). No state,
 * no React wiring — buttons are plain DOM, so one listener covers
 * every tab, including buttons mounted later.
 */
const BURST_SELECTOR =
  '.btn-primary, .btn-secondary, .btn-ghost, .tabbar-center, .quick-option, .exercise-library .chip, .sched-block .chip';

export function initPressBurst(): () => void {
  const onDown = (ev: PointerEvent): void => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const target = ev.target as HTMLElement | null;
    const el = target?.closest?.(BURST_SELECTOR) as HTMLElement | null;
    if (!el) return;
    if (el.closest('[disabled]') || el.getAttribute('aria-disabled') === 'true') return;
    // Restart even if the class is still on from a fast double-tap.
    el.classList.remove('fitai-press-burst');
    void el.offsetWidth;
    el.classList.add('fitai-press-burst');
  };
  const onEnd = (ev: AnimationEvent): void => {
    if (ev.animationName === 'fitai-press-burst') {
      (ev.target as HTMLElement).classList.remove('fitai-press-burst');
    }
  };
  document.addEventListener('pointerdown', onDown, true);
  document.addEventListener('animationend', onEnd, true);
  return () => {
    document.removeEventListener('pointerdown', onDown, true);
    document.removeEventListener('animationend', onEnd, true);
  };
}
