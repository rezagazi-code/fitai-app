/**
 * Musclepro — fasting timer (later dossier item, separate entity).
 *
 * Amber, named "تایمر روزه", stored separately from the rest timer,
 * and shown in the Log tab — never inside a workout session. It only
 * counts elapsed time toward a target the user sets. No health advice,
 * no eating-window prescription, no medical claim.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import {
  fastingElapsedSec,
  getFastingState,
  resetFasting,
  startFasting,
  stopFasting,
} from '../lib/fasting';

const KEYS = {
  fa: {
    title: 'تایمر روزه',
    subtitle: 'موجودیتی جداست — ربطی به تایمر استراحت داخل تمرین ندارد. فقط زمان سپری‌شده تا هدف را نشان می‌دهد؛ توصیه‌ی سلامتی نیست.',
    target: 'هدف (ساعت)',
    start: 'شروع روزه',
    stop: 'پایان روزه',
    reset: 'شروع تازه',
    running: 'در حال روزه',
    stopped: 'متوقف شد',
    idle: 'هنوز شروع نشده است.',
    progress: 'پیشرفت تا هدف',
  },
  en: {
    title: 'Fasting timer',
    subtitle: 'A separate entity — unrelated to the rest timer inside workouts. It only shows elapsed time toward your target; it is not health advice.',
    target: 'Target (hours)',
    start: 'Start fasting',
    stop: 'Stop fasting',
    reset: 'Fresh start',
    running: 'Fasting',
    stopped: 'Stopped',
    idle: 'Not started yet.',
    progress: 'Progress to target',
  },
} as const;

function formatHMS(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function FastingTimer(): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const [state, setState] = useState(() => getFastingState());
  const [target, setTarget] = useState(state.targetHours);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!state.startedAt || state.finishedAt) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [state.startedAt, state.finishedAt]);

  const elapsed = fastingElapsedSec(state);
  const targetSec = state.targetHours * 3600;
  const pct = targetSec > 0 ? Math.min(100, Math.round((elapsed / targetSec) * 100)) : 0;
  const status = !state.startedAt ? L.idle : state.finishedAt ? L.stopped : L.running;

  return (
    <section
      className="card"
      data-fasting-timer
      style={{ borderColor: 'rgba(255,149,0,0.45)' }}
    >
      <h3 className="card-title" style={{ color: '#FF9500' }}>{L.title}</h3>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>{L.subtitle}</p>
      <p className="card-meta" style={{ margin: '0 0 4px' }}>{status}</p>
      <p style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: '8px 0', direction: 'ltr', textAlign: lang === 'fa' ? 'right' : 'left' }}>
        {formatHMS(elapsed)}
      </p>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>
        {L.progress}: {pct}٪ · {L.target}: {state.targetHours}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="card-meta">
          {L.target}
          <input
            className="input"
            type="number"
            min={1}
            max={72}
            style={{ width: 72, marginInlineStart: 4 }}
            value={target}
            onChange={(e) => setTarget(parseFloat(e.target.value) || 16)}
          />
        </label>
        {!state.startedAt || state.finishedAt ? (
          <button type="button" className="btn-primary" onClick={() => setState(startFasting(target))}>
            {L.start}
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => setState(stopFasting())}>
            {L.stop}
          </button>
        )}
        <button type="button" className="chip" onClick={() => { setState(resetFasting()); setTarget(16); }}>
          {L.reset}
        </button>
      </div>
    </section>
  );
}
