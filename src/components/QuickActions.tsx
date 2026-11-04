/**
 * Musclepro — quick actions: the main expanding button.
 *
 * The Log tab previously had no expanding menu at all (the bottom
 * centre + button is a tab switch, not a menu, and its navigation is
 * left untouched so existing flows keep working). This is the app's
 * primary expanding button: tapping the main button reveals its
 * option buttons ONE BY ONE beneath it, staggered 90ms apart in a
 * fixed order — food, voice food, start session, new program — never
 * all at once. Options are real actions only: food/voice scroll to
 * the sections already on this tab; session and program use the
 * existing callbacks. No option promises anything that does not exist.
 */
import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';

const KEYS = {
  fa: {
    main: 'ثبت سریع',
    close: 'بستن',
    food: 'ثبت غذا',
    voice: 'غذای صوتی',
    session: 'شروع جلسه',
    program: 'برنامه تازه',
  },
  en: {
    main: 'Quick add',
    close: 'Close',
    food: 'Log food',
    voice: 'Voice food',
    session: 'Start session',
    program: 'New program',
  },
} as const;

function scrollToSection(selector: string): void {
  try {
    document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch {
    /* scrolling is best-effort; the section is already on this tab */
  }
}

export default function QuickActions({
  onStartWorkout,
  onBuildProgram,
}: {
  onStartWorkout: () => void;
  onBuildProgram: () => void;
}): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const [open, setOpen] = useState(false);

  const options: Array<{ key: string; label: string; run: () => void }> = [
    { key: 'food', label: L.food, run: () => scrollToSection('[data-meal-diary]') },
    { key: 'voice', label: L.voice, run: () => scrollToSection('[data-voice-food-log]') },
    { key: 'session', label: L.session, run: () => { setOpen(false); onStartWorkout(); } },
    { key: 'program', label: L.program, run: () => { setOpen(false); onBuildProgram(); } },
  ];

  return (
    <section className="quick-menu" aria-label={L.main}>
      <button
        type="button"
        className="btn-primary btn-shine"
        style={{ width: '100%' }}
        data-quick-main
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? L.close : L.main}
        <span
          className={`quick-main__chevron${open ? ' quick-main__chevron--open' : ''}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>
      {open &&
        options.map((opt, i) => (
          <button
            key={opt.key}
            type="button"
            className="btn-secondary quick-option"
            style={{ ['--quick-index' as string]: i }}
            data-quick-option={opt.key}
            data-quick-index={i}
            onClick={opt.run}
          >
            {opt.label}
          </button>
        ))}
    </section>
  );
}
