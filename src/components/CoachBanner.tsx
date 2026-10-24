/**
 * اپ هوشمند بدنسازی — CoachBanner.
 * The signature conversational strip: the AI coach speaks in first person.
 * Wired to the context-aware coach engine (src/lib/coach.ts): when no
 * explicit message is passed, the banner assembles context from the store
 * and asks the engine for the single most relevant message right now.
 * Original design, inspired by the pattern (not copied from any product).
 */
import { useEffect, useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import {
  buildCoachContext,
  getBannerMessage,
  rememberBannerKey,
  renderCoachMessage,
  type CoachMessage,
  type CoachTone,
} from '../lib/coach';

export type { CoachTone };

interface CoachBannerProps {
  /** Preferred: an engine-produced message (tone comes with it). */
  coachMessage?: CoachMessage;
  /** Legacy plain-text fallback. */
  message?: string;
  /** Used only with the legacy `message` prop. */
  tone?: CoachTone;
  /** Hero variant: larger, luminous — the Home-screen centerpiece. */
  hero?: boolean;
}

export default function CoachBanner({ coachMessage, message, tone = 'info', hero = false }: CoachBannerProps): ReactElement {
  const { t, lang } = useLang();
  const [auto, setAuto] = useState<CoachMessage | null>(null);

  // Self-driven mode: assemble context from the store and ask the coach
  // engine. Runs once on mount; every store read inside is guarded.
  useEffect(() => {
    if (coachMessage) return;
    try {
      const m = getBannerMessage(buildCoachContext());
      setAuto(m);
      rememberBannerKey(m.key);
    } catch {
      /* fail open — banner simply shows nothing */
    }
  }, [coachMessage]);

  const active = coachMessage ?? auto;
  const text = active ? renderCoachMessage(lang, active) : (message ?? '');
  const activeTone = active ? active.tone : tone;
  // Keyed by message key so the CSS entrance animation replays on change.
  const animKey = active ? active.key : `legacy-${text.slice(0, 24)}`;

  return (
    <div className={`coach-banner coach-banner--${activeTone}${hero ? ' coach-banner--hero' : ''}`} role="status">
      <div className="coach-banner__avatar" aria-hidden="true">
        <span className="coach-banner__pulse" />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a4.5 4.5 0 0 1 4.5 4.5c0 2.6-2 3.4-2 5.5H9.5c0-2.1-2-2.9-2-5.5A4.5 4.5 0 0 1 12 3Z" />
          <path d="M9.5 17.5h5M10.5 20.5h3" />
        </svg>
      </div>
      <div className="coach-banner__text">
        <span className="coach-banner__prefix">{t('coach.prefix')}</span>
        <span key={animKey} className="coach-banner__message">{text}</span>
      </div>
    </div>
  );
}
