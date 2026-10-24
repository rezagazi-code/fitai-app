/**
 * اپ هوشمند بدنسازی — CoachBanner.
 * The signature conversational strip: the AI coach speaks in first person.
 * Original design, inspired by the pattern (not copied from any product).
 */
import type { ReactElement } from 'react';
import { useLang } from '../lib/i18n';

export type CoachTone = 'info' | 'praise' | 'nudge';

interface CoachBannerProps {
  message: string;
  tone?: CoachTone;
}

export default function CoachBanner({ message, tone = 'info' }: CoachBannerProps): ReactElement {
  const { t } = useLang();

  return (
    <div className={`coach-banner coach-banner--${tone}`} role="status">
      <div className="coach-banner__avatar" aria-hidden="true">
        <span className="coach-banner__pulse" />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3a4.5 4.5 0 0 1 4.5 4.5c0 2.6-2 3.4-2 5.5H9.5c0-2.1-2-2.9-2-5.5A4.5 4.5 0 0 1 12 3Z" />
          <path d="M9.5 17.5h5M10.5 20.5h3" />
        </svg>
      </div>
      <div className="coach-banner__text">
        <span className="coach-banner__prefix">{t('coach.prefix')}</span>
        {message}
      </div>
    </div>
  );
}
