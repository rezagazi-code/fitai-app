/**
 * اپ هوشمند بدنسازی — نمایش حرکتی (انیمیشن) یک حرکت.
 *
 * The wired muscle art for an exercise is ONE image holding both
 * panels: start on the left half, end on the right half (900×450).
 * This component turns that single image into a gentle start↔end
 * ping-pong: two layers of the same image, each showing one half
 * (background-size 200%), crossfading over ~1.2s in each direction.
 * No new frames are invented, no video is copied in, and nothing
 * flashes or pulses: opacity only, soft ease, and the animation
 * freezes the moment the user taps it (tap again to resume).
 *
 * Tap behaviour, deliberately split so neither action surprises the
 * other: tapping the animation itself pauses/resumes it; tapping the
 * exercise NAME (or the small detail button on the demo) opens the
 * full detail view with instructions and, where verified, the video.
 */
import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import './AnimatedDemo.css';

export default function AnimatedDemo({
  src,
  alt,
  onOpenDetail,
}: {
  /** Raster muscle-art path (muscleArtOf) — start left, end right. */
  src: string;
  alt: string;
  /** Opens the exercise detail view, if the caller wires it. */
  onOpenDetail?: () => void;
}): ReactElement {
  const { lang } = useLang();
  const fa = lang === 'fa';
  const [paused, setPaused] = useState(false);

  return (
    <div
      className={`anim-demo${paused ? ' is-paused' : ''}`}
      data-anim-demo
      data-anim-paused={paused ? 'true' : 'false'}
      role="button"
      tabIndex={0}
      aria-label={paused ? (fa ? 'ادامه نمایش حرکت' : 'Resume movement demo') : (fa ? 'توقف نمایش حرکت' : 'Pause movement demo')}
      title={fa ? 'برای توقف یا ادامه نمایش بزن' : 'Tap to pause or resume the demo'}
      onClick={() => setPaused((p) => !p)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setPaused((p) => !p);
        }
      }}
    >
      <span
        className="anim-demo-layer anim-demo-start"
        aria-hidden="true"
        style={{ backgroundImage: `url(${src})` }}
      />
      <span
        className="anim-demo-layer anim-demo-end"
        aria-hidden="true"
        style={{ backgroundImage: `url(${src})` }}
      />
      <span className="anim-demo-state" aria-hidden="true">
        {paused ? (fa ? '⏸ متوقف' : '⏸ Paused') : (fa ? '▶ در حال نمایش' : '▶ Playing')}
      </span>
      {onOpenDetail && (
        <button
          type="button"
          className="anim-demo-detail"
          data-anim-detail
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail();
          }}
        >
          {fa ? 'جزئیات و نحوه اجرا' : 'Details & form'}
        </button>
      )}
      <span className="anim-demo-alt" role="img" aria-label={alt} />
    </div>
  );
}
