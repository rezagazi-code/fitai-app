/**
 * Musclepro — recovery map + daily adjustment note (second-priority).
 *
 * Shows each trained muscle as ready / semi-ready / tired (coarse
 * labels only, never a fake-precise percentage) with the date of its
 * last heavy session, and — when today's plan is passed in — the
 * daily adjustment note explaining any set reduction. The user can
 * mark a muscle "I'm ready" to override the calculation for 24 hours.
 * This is general training guidance, not a medical assessment.
 */

import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { MUSCLE_LABELS, type MuscleGroup } from '../lib/exercises';
import {
  clearRecoveryOverride,
  recoveryMap,
  setRecoveryReady,
  type DayAdjustment,
} from '../lib/recovery';

const KEYS = {
  fa: {
    title: 'ریکاوری عضلات',
    ready: 'آماده',
    semi: 'نیمه‌آماده',
    tired: 'خسته',
    lastHeavy: 'آخرین تمرین سنگین',
    noHistory: 'هنوز تمرینی ثبت نشده',
    markReady: 'آماده‌ام',
    clearOverride: 'لغو آماده‌بودن',
    overrideNote: 'بازنویسی دستی تو بر محاسبه اولویت دارد (۲۴ ساعت).',
    adjustmentTitle: 'تنظیم امروز بر اساس ریکاوری',
  },
  en: {
    title: 'Muscle recovery',
    ready: 'Ready',
    semi: 'Semi-ready',
    tired: 'Tired',
    lastHeavy: 'Last heavy session',
    noHistory: 'No training recorded yet',
    markReady: "I'm ready",
    clearOverride: 'Clear override',
    overrideNote: 'Your manual override beats the calculation (24 hours).',
    adjustmentTitle: "Today's recovery adjustment",
  },
} as const;

export default function RecoveryPanel({ adjustment }: { adjustment?: DayAdjustment | null }): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const [tick, setTick] = useState(0);
  const rec = recoveryMap();
  void tick;
  const trained = (Object.keys(rec) as MuscleGroup[]).filter((m) => rec[m].lastHeavyDate !== null || rec[m].overridden);

  const stateLabel = (s: string) => (s === 'ready' ? L.ready : s === 'semi' ? L.semi : L.tired);

  return (
    <section className="card" data-recovery-panel>
      <h3 className="card-title">{L.title}</h3>
      {adjustment && (
        <p className="card-meta" style={{ margin: '0 0 12px' }}>
          <strong>{L.adjustmentTitle}:</strong> {lang === 'fa' ? adjustment.noteFa : adjustment.noteEn}
        </p>
      )}
      {trained.length === 0 ? (
        <p className="card-meta" style={{ margin: 0 }}>{L.noHistory}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {trained.map((m) => {
            const r = rec[m];
            return (
              <div key={m} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ flex: 1 }}>
                  {MUSCLE_LABELS[m][lang === 'fa' ? 'fa' : 'en']} — {stateLabel(r.state)}
                  {r.lastHeavyDate ? ` · ${L.lastHeavy}: ${r.lastHeavyDate}` : ''}
                  {r.overridden ? ` · ${L.overrideNote}` : ''}
                </span>
                {r.state !== 'ready' && !r.overridden ? (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => { setRecoveryReady(m); setTick((t) => t + 1); }}
                  >
                    {L.markReady}
                  </button>
                ) : r.overridden ? (
                  <button
                    type="button"
                    className="chip"
                    onClick={() => { clearRecoveryOverride(m); setTick((t) => t + 1); }}
                  >
                    {L.clearOverride}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
