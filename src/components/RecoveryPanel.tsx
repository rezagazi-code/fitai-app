/**
 * Musclepro — recovery map + daily adjustment note, VISIBLE on Home.
 *
 * Every muscle shows an honest recovery percentage BAND (25 / 65 /
 * 100%) derived transparently from days since its last heavy
 * session, or an explicit "no data yet" state when it was never
 * trained — never an invented %. Muscles are grouped so the user
 * sees at a glance what is fresh vs fatigued. The panel stays
 * COMPACT on purpose: muscles render as one chip row per group, so
 * the today card's start button stays above the fold. Tapping a
 * chip expands that muscle's detail (last heavy session, manual
 * "I'm ready" override). When today's plan is passed in, the panel
 * also shows exactly which exercises were reduced (sets before →
 * after, with the fatigued muscle) and which were kept — the same
 * numbers the session launch path uses, shown BEFORE the user
 * starts, never silently.
 * This is general training guidance, not a medical assessment.
 */

import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { MUSCLE_LABELS, getExercise, type MuscleGroup } from '../lib/exercises';
import {
  clearRecoveryOverride,
  recoveryDisplayMap,
  setRecoveryReady,
  type DayAdjustment,
} from '../lib/recovery';

const KEYS = {
  fa: {
    title: 'ریکاوری عضلات',
    ready: 'آماده',
    semi: 'نیمه‌آماده',
    tired: 'خسته',
    freshGroup: 'تازه',
    semiGroup: 'نیمه‌آماده',
    tiredGroup: 'خسته',
    noDataGroup: 'بدون داده',
    lastHeavy: 'آخرین تمرین سنگین',
    noHistory: 'هنوز تمرینی ثبت نشده',
    noDataNote: 'برای این عضله هنوز جلسه‌ای ثبت نشده است، پس درصدی ساخته نمی‌شود؛ بعد از اولین تمرینش، درصد اینجا می‌آید.',
    markReady: 'آماده‌ام',
    clearOverride: 'لغو آماده‌بودن',
    overrideNote: 'بازنویسی دستی تو بر محاسبه اولویت دارد (۲۴ ساعت).',
    adjustmentTitle: 'تنظیم امروز بر اساس ریکاوری',
    reducedTitle: 'ست‌های کم‌شده‌ی امروز',
    kept: 'بدون تغییر',
    reducedWhy: 'چون این عضله خسته است',
    noAdjustment: 'امروز هیچ ستی به‌خاطر ریکاوری کم نشده است.',
    bandNote: 'درصدها باند تقریبی‌اند (۲۵٪ خسته، ۶۵٪ نیمه‌آماده، ۱۰۰٪ آماده) و از روی فاصله تا آخرین جلسه‌ی سنگین حساب می‌شوند، نه اندازه‌گیری دقیق بدن.',
  },
  en: {
    title: 'Muscle recovery',
    ready: 'Ready',
    semi: 'Semi-ready',
    tired: 'Tired',
    freshGroup: 'Fresh',
    semiGroup: 'Semi-ready',
    tiredGroup: 'Tired',
    noDataGroup: 'No data',
    lastHeavy: 'Last heavy session',
    noHistory: 'No training recorded yet',
    noDataNote: 'No session has been recorded for this muscle yet, so no percentage is invented; it appears after its first session.',
    markReady: "I'm ready",
    clearOverride: 'Clear override',
    overrideNote: 'Your manual override beats the calculation (24 hours).',
    adjustmentTitle: "Today's recovery adjustment",
    reducedTitle: "Today's reduced sets",
    kept: 'Unchanged',
    reducedWhy: 'because this muscle is tired',
    noAdjustment: 'No sets were reduced for recovery today.',
    bandNote: 'Percentages are approximate bands (25% tired, 65% semi-ready, 100% ready) computed from days since the last heavy session, not a precise body measurement.',
  },
} as const;

export interface TodayExerciseRef {
  exerciseKey: string;
  sets: number;
}

interface RecoveryPanelProps {
  adjustment?: DayAdjustment | null;
  /** Today's ORIGINAL plan (before recovery adjustment). */
  todayOriginal?: TodayExerciseRef[];
  /** Today's plan AFTER recovery adjustment (same order as original). */
  todayAdjusted?: TodayExerciseRef[];
}

const MUSCLES: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core', 'calves', 'forearms', 'fullbody',
];

export default function RecoveryPanel({ adjustment, todayOriginal, todayAdjusted }: RecoveryPanelProps): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const fa = lang === 'fa';
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<MuscleGroup | null>(null);
  void tick;
  const rec = recoveryDisplayMap();

  const groupOf = (percent: number | null): 'fresh' | 'semi' | 'tired' | 'nodata' =>
    percent === null ? 'nodata' : percent >= 100 ? 'fresh' : percent >= 65 ? 'semi' : 'tired';
  const groups: Array<{ key: 'fresh' | 'semi' | 'tired' | 'nodata'; label: string }> = [
    { key: 'fresh', label: L.freshGroup },
    { key: 'semi', label: L.semiGroup },
    { key: 'tired', label: L.tiredGroup },
    { key: 'nodata', label: L.noDataGroup },
  ];

  // Today's set changes, computed from original vs adjusted plans.
  const adjustedByKey = new Map((todayAdjusted ?? []).map((e) => [e.exerciseKey, e.sets]));
  const reduced = (todayOriginal ?? [])
    .filter((e) => adjustedByKey.has(e.exerciseKey) && (adjustedByKey.get(e.exerciseKey) ?? e.sets) < e.sets)
    .map((e) => ({ ...e, after: adjustedByKey.get(e.exerciseKey) ?? e.sets }));
  const keptCount = (todayOriginal ?? []).length - reduced.length;
  const showAdjustmentDetail = todayOriginal !== undefined && todayOriginal.length > 0;

  const stateLabel = (s: string) => (s === 'ready' ? L.ready : s === 'semi' ? L.semi : L.tired);
  const sel = selected ? rec[selected] : null;

  return (
    <section className="card" data-recovery-panel>
      <h3 className="card-title">{L.title}</h3>
      <p className="card-meta" style={{ margin: '0 0 10px' }}>{L.bandNote}</p>
      {adjustment && (
        <p className="card-meta" style={{ margin: '0 0 10px' }} data-recovery-note>
          <strong>{L.adjustmentTitle}:</strong> {fa ? adjustment.noteFa : adjustment.noteEn}
        </p>
      )}

      {showAdjustmentDetail && (
        <div data-recovery-adjusted data-reduced={reduced.map((r) => r.exerciseKey).join(',')} style={{ marginBottom: 10 }}>
          {reduced.length === 0 ? (
            <p className="card-meta" style={{ margin: 0 }}>
              {L.noAdjustment} {L.kept}: {keptCount} {fa ? 'حرکت' : 'exercises'}
            </p>
          ) : (
            <>
              <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{L.reducedTitle}</p>
              <ul style={{ margin: 0, paddingInlineStart: 18 }}>
                {reduced.map((r) => {
                  const ex = getExercise(r.exerciseKey);
                  const muscleLabel = ex ? MUSCLE_LABELS[ex.muscle][fa ? 'fa' : 'en'] : '';
                  return (
                    <li key={r.exerciseKey} data-reduced-exercise={r.exerciseKey}>
                      {ex ? (fa ? ex.nameFa : ex.nameEn) : r.exerciseKey} — {fa ? `از ${r.sets} ست به ${r.after} ست` : `from ${r.sets} sets to ${r.after} sets`}
                      {muscleLabel ? ` (${muscleLabel} ${L.reducedWhy})` : ''}
                    </li>
                  );
                })}
              </ul>
              <p className="card-meta" style={{ margin: '6px 0 0' }}>
                {L.kept}: {keptCount} {fa ? 'حرکت' : 'exercises'}
              </p>
            </>
          )}
        </div>
      )}

      {groups.map((g) => {
        const members = MUSCLES.filter((m) => groupOf(rec[m].percent) === g.key);
        if (members.length === 0) return null;
        return (
          <div key={g.key} style={{ marginTop: 8 }} data-recovery-group={g.key}>
            <p style={{ margin: '0 0 4px', fontWeight: 700 }}>{g.label}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {members.map((m) => {
                const r = rec[m];
                return (
                  <button
                    key={m}
                    type="button"
                    className={`chip${selected === m ? ' chip--active' : ''}`}
                    data-recovery-row
                    data-muscle={m}
                    data-percent={r.percent === null ? 'none' : String(r.percent)}
                    onClick={() => setSelected(selected === m ? null : m)}
                  >
                    {MUSCLE_LABELS[m][fa ? 'fa' : 'en']} {r.percent === null ? `· ${L.noHistory}` : `· ${r.percent}٪`}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
      {sel && selected && (
        <div style={{ marginTop: 10 }} data-recovery-detail={selected}>
          <p className="card-meta" style={{ margin: 0 }}>
            {MUSCLE_LABELS[selected][fa ? 'fa' : 'en']} — {sel.percent === null ? L.noHistory : `${sel.percent}٪ · ${stateLabel(sel.state)}`}
            {sel.lastHeavyDate ? ` · ${L.lastHeavy}: ${sel.lastHeavyDate}` : ''}
            {sel.overridden ? ` · ${L.overrideNote}` : ''}
          </p>
          {sel.percent === null && <p className="card-meta" style={{ margin: '4px 0 0' }}>{L.noDataNote}</p>}
          {sel.state !== 'ready' && !sel.overridden && sel.percent !== null && (
            <button type="button" className="chip" style={{ marginTop: 6 }} onClick={() => { setRecoveryReady(selected); setTick((t) => t + 1); }}>
              {L.markReady}
            </button>
          )}
          {sel.overridden && (
            <button type="button" className="chip" style={{ marginTop: 6 }} onClick={() => { clearRecoveryOverride(selected); setTick((t) => t + 1); }}>
              {L.clearOverride}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
