/**
 * اپ هوشمند بدنسازی — Progress tab («پیشرفت»).
 *
 * Real progress analytics drawn from the local session store:
 *  - weekly volume trend (last 8 weeks, hand-written SVG bars)
 *  - muscle-group distribution over the last 30 days (SVG bars)
 *  - personal records by estimated 1RM (Epley) with "new PR" badges
 *  - streak + totals row (weekly streak, sessions, volume, avg duration)
 *  - body-weight tracker (manual entries, SVG line chart)
 *
 * All charts are original hand-written SVG, neon-blue on dark,
 * bilingual via PROGRESS_KEYS, and RTL-aware. Empty states throughout.
 */
import { useMemo, useState, type ReactElement } from 'react';
import { useLang, type Lang } from '../lib/i18n';
import {
  getSessions,
  getMeasurements,
  saveMeasurement,
  type WorkoutSession,
  type BodyMeasurement,
} from '../lib/store';
import { EXERCISES, MUSCLE_LABELS, type MuscleGroup } from '../lib/exercises';

/* ============================================================
 * Local bilingual strings (i18n.tsx is untouched by contract).
 * Persian-first; Persian digits are produced by Intl below.
 * ============================================================ */
export const PROGRESS_KEYS = {
  fa: {
    weeklyVolume: 'روند حجم هفتگی',
    last8Weeks: 'هشت هفته‌ی اخیر',
    muscleDist: 'توزیع عضلات',
    last30Days: 'سی روز اخیر',
    personalRecords: 'رکوردهای شخصی',
    newPr: 'رکورد جدید',
    statsStreak: 'هفته‌های متوالی',
    statsSessions: 'جلسات تمرین',
    statsVolume: 'حجم کل',
    statsAvgDuration: 'میانگین مدت تمرین',
    bodyWeight: 'وزن بدن',
    logWeight: 'ثبت وزن',
    weightHint: 'وزنت رو وارد کن تا روندش رو ببینی',
    noSessions: 'هنوز تمرینی ثبت نشده',
    noSessionsHint: 'بعد از اولین تمرینت، نمودارها و رکوردها اینجا ساخته می‌شن 💪',
    noPrs: 'هنوز رکوردی ثبت نشده',
    noPrsHint: 'با ثبت ست‌های سنگین‌تر، رکوردهای شخصیت اینجا نمایش داده می‌شن',
    noMeasurements: 'هنوز وزنی ثبت نشده',
    noMeasurementsHint: 'اولین وزن رو وارد کن تا نمودار روند ساخته بشه',
    est1rm: '۱RM تخمینی',
    repsShort: 'تکرار',
    weekStreakUnit: 'هفته',
    weightUnit: 'کیلوگرم',
    weightPlaceholder: 'وزن (کیلوگرم)',
    lastEntry: 'آخرین ثبت',
  },
  en: {
    weeklyVolume: 'Weekly volume trend',
    last8Weeks: 'Last 8 weeks',
    muscleDist: 'Muscle-group distribution',
    last30Days: 'Last 30 days',
    personalRecords: 'Personal records',
    newPr: 'New PR',
    statsStreak: 'Weekly streak',
    statsSessions: 'Workout sessions',
    statsVolume: 'Total volume',
    statsAvgDuration: 'Avg session length',
    bodyWeight: 'Body weight',
    logWeight: 'Log weight',
    weightHint: 'Enter your weight to track its trend',
    noSessions: 'No workouts logged yet',
    noSessionsHint: 'Charts and records will be built here after your first workout 💪',
    noPrs: 'No personal records yet',
    noPrsHint: 'Log heavier sets and your personal records will show up here',
    noMeasurements: 'No weight entries yet',
    noMeasurementsHint: 'Log your first weight to build the trend chart',
    est1rm: 'Est. 1RM',
    repsShort: 'reps',
    weekStreakUnit: 'weeks',
    weightUnit: 'kg',
    weightPlaceholder: 'Weight (kg)',
    lastEntry: 'Last entry',
  },
} as const;

type K = keyof typeof PROGRESS_KEYS.fa;

/* ============================================================
 * Helpers
 * ============================================================ */

const BLUE = '#2e9cff';
const CYAN = '#00f0ff';

const EX_BY_KEY = new Map(EXERCISES.map((e) => [e.key, e]));

function numFmt(lang: Lang): Intl.NumberFormat {
  return new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US');
}

function fmtNum(n: number, lang: Lang): string {
  return numFmt(lang).format(Math.round(n));
}

function sessionVolumeKg(s: WorkoutSession): number {
  return s.sets.reduce((a, set) => a + set.reps * set.weightKg, 0);
}

function sessionMinutes(s: WorkoutSession): number | null {
  if (!s.finishedAt) return null;
  const ms = new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return ms / 60000;
}

/** Monday of the week containing `d` (local time). */
function weekStartOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}

/** Epley estimated one-rep max. */
function epley1rm(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

function exerciseName(key: string, lang: Lang): string {
  const e = EX_BY_KEY.get(key);
  if (!e) return key;
  return lang === 'fa' ? e.nameFa : e.nameEn;
}

function muscleLabel(m: MuscleGroup, lang: Lang): string {
  return MUSCLE_LABELS[m][lang];
}

/* ============================================================
 * Empty state (illustration: original dumbbell line-art)
 * ============================================================ */
function EmptyDumbbell(): ReactElement {
  return (
    <svg viewBox="0 0 64 64" className="prog-empty-icon" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
        <path d="M22 26v12M42 26v12" />
        <path d="M16 30v4M48 30v4M22 32h20" />
        <path d="M10 29v6M54 29v6" />
      </g>
    </svg>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }): ReactElement {
  return (
    <div className="prog-empty">
      <EmptyDumbbell />
      <p className="prog-empty-title">{title}</p>
      <p className="prog-empty-hint">{hint}</p>
    </div>
  );
}

/* ---------- small section icons (original line-art) ---------- */
function SectionIcon({ children }: { children: ReactElement }) {
  return (
    <svg viewBox="0 0 24 24" className="prog-sec-icon" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const VolIcon = () => (
  <SectionIcon>
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8.5 16v-5M13 16V8M17.5 16v-3" />
    </>
  </SectionIcon>
);

const MuscleIcon = () => (
  <SectionIcon>
    <path d="M7 20c-2.5-4-2.5-9 0-13 1.6 2.6 1.6 4.4 0 6.4 1.8 1.8 4 2.4 5.4 1.2 1.6-1.4 1.6-3.8 0-5.2 1.8-.8 4-.4 5.6.6 2.5 4 2.5 9 0 13-4 0-7-1.6-10.4-1.6-1.4-2.6-2.4-4-1.2-2 1.4-2 3.8-.6 5.2Z" />
  </SectionIcon>
);

const TrophyIcon = () => (
  <SectionIcon>
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H4.5a3.5 3.5 0 0 0 3.6 3.5M16 5h3.5a3.5 3.5 0 0 1-3.6 3.5" />
      <path d="M12 13v4M8.5 20h7M10 17h4" />
    </>
  </SectionIcon>
);

const ScaleIcon = () => (
  <SectionIcon>
    <>
      <path d="M12 4v16M5 7l7-3 7 3" />
      <path d="M5 7l-2.5 6a3 3 0 0 0 5 0L5 7ZM19 7l-2.5 6a3 3 0 0 0 5 0L19 7Z" />
    </>
  </SectionIcon>
);

/* ============================================================
 * 1. Weekly volume trend — last 8 weeks, SVG bars
 * ============================================================ */
interface WeekBucket {
  label: string;
  volumeKg: number;
}

function buildWeekBuckets(sessions: WorkoutSession[], lang: Lang): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const now = new Date();
  const thisMonday = weekStartOf(now);
  const dateFmt = new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
  for (let i = 7; i >= 0; i--) {
    const monday = new Date(thisMonday);
    monday.setDate(monday.getDate() - i * 7);
    const nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);
    let v = 0;
    for (const s of sessions) {
      const t = new Date(s.startedAt);
      if (t >= monday && t < nextMonday) v += sessionVolumeKg(s);
    }
    buckets.push({ label: dateFmt.format(monday), volumeKg: Math.round(v) });
  }
  return buckets;
}

function WeeklyVolumeChart({ buckets, lang }: { buckets: WeekBucket[]; lang: Lang }): ReactElement {
  const W = 560;
  const H = 240;
  const PAD_X = 10;
  const TOP = 34;
  const LABEL_H = 44;
  const chartH = H - TOP - LABEL_H;
  const rtl = lang === 'fa';
  const fmt = numFmt(lang);
  const maxV = Math.max(1, ...buckets.map((b) => b.volumeKg));
  const slot = (W - PAD_X * 2) / buckets.length;
  const barW = Math.min(46, slot * 0.56);

  const slotLeft = (i: number): number => {
    const x = PAD_X + i * slot + (slot - barW) / 2;
    return rtl ? W - x - barW : x;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="prog-chart" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="progVolGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CYAN} />
          <stop offset="100%" stopColor={BLUE} />
        </linearGradient>
      </defs>
      {/* baseline */}
      <line
        x1={PAD_X}
        y1={H - LABEL_H}
        x2={W - PAD_X}
        y2={H - LABEL_H}
        stroke="rgba(244,246,251,0.14)"
        strokeWidth={1}
      />
      {buckets.map((b, i) => {
        const h = Math.max(2, (b.volumeKg / maxV) * chartH);
        const x = slotLeft(i);
        const y = H - LABEL_H - h;
        const isMax = b.volumeKg > 0 && b.volumeKg === maxV;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx={6} fill="url(#progVolGrad)" opacity={b.volumeKg > 0 ? 1 : 0.25} style={isMax ? { filter: 'drop-shadow(0 0 10px rgba(0,240,255,0.75))' } : undefined} />
            {b.volumeKg > 0 && (
              <text
                x={x + barW / 2}
                y={y - 8}
                textAnchor="middle"
                fill="#f4f6fb"
                fontSize={13}
                fontWeight={700}
              >
                {fmt.format(b.volumeKg)}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={H - LABEL_H + 20}
              textAnchor="middle"
              fill="#98a2b8"
              fontSize={12}
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ============================================================
 * 2. Muscle-group distribution — last 30 days, SVG bars
 * ============================================================ */
interface MuscleShare {
  muscle: MuscleGroup;
  volumeKg: number;
  share: number; // 0..1
}

function buildMuscleShares(sessions: WorkoutSession[]): MuscleShare[] {
  const cutoff = Date.now() - 30 * 86400_000;
  const byMuscle = new Map<MuscleGroup, number>();
  let total = 0;
  for (const s of sessions) {
    if (new Date(s.startedAt).getTime() < cutoff) continue;
    for (const set of s.sets) {
      const ex = EX_BY_KEY.get(set.exerciseKey);
      const m: MuscleGroup = ex ? ex.muscle : 'fullbody';
      const v = set.reps * set.weightKg;
      byMuscle.set(m, (byMuscle.get(m) ?? 0) + v);
      total += v;
    }
  }
  if (total <= 0) return [];
  return [...byMuscle.entries()]
    .map(([muscle, volumeKg]) => ({ muscle, volumeKg: Math.round(volumeKg), share: volumeKg / total }))
    .sort((a, b) => b.share - a.share);
}

function MuscleDistChart({ rows, lang }: { rows: MuscleShare[]; lang: Lang }): ReactElement {
  const ROW_H = 46;
  const W = 560;
  const H = rows.length * ROW_H + 8;
  const PAD_X = 10;
  const LABEL_W = 128;
  const PCT_W = 56;
  const rtl = lang === 'fa';
  const fmt = numFmt(lang);

  // bar track region
  const trackX0 = PAD_X + LABEL_W;
  const trackW = W - PAD_X * 2 - LABEL_W - PCT_W;

  const barX = (w: number): number => {
    const x = trackX0;
    return rtl ? W - x - w : x;
  };
  const labelX = rtl ? W - PAD_X : PAD_X;
  const labelAnchor = rtl ? 'end' : 'start';
  const pctX = rtl ? PAD_X : W - PAD_X;
  const pctAnchor = rtl ? 'start' : 'end';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="prog-chart" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="progMuscleGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={BLUE} />
          <stop offset="100%" stopColor={CYAN} />
        </linearGradient>
      </defs>
      {rows.map((r, i) => {
        const y = 4 + i * ROW_H;
        const w = Math.max(3, r.share * trackW);
        return (
          <g key={r.muscle}>
            <text x={labelX} y={y + 18} textAnchor={labelAnchor} fill="#f4f6fb" fontSize={14} fontWeight={600}>
              {muscleLabel(r.muscle, lang)}
            </text>
            <text x={labelX} y={y + 36} textAnchor={labelAnchor} fill="#98a2b8" fontSize={12}>
              {fmt.format(r.volumeKg)}
            </text>
            <rect
              x={rtl ? W - trackX0 - trackW : trackX0}
              y={y + 8}
              width={trackW}
              height={12}
              rx={6}
              fill="rgba(244,246,251,0.07)"
            />
            <rect x={barX(w)} y={y + 8} width={w} height={12} rx={6} fill="url(#progMuscleGrad)" />
            <text x={pctX} y={y + 20} textAnchor={pctAnchor} fill={CYAN} fontSize={13} fontWeight={700}>
              {fmt.format(Math.round(r.share * 100))}
              {lang === 'fa' ? '٪' : '%'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ============================================================
 * 3. Personal records — best Epley 1RM per exercise
 * ============================================================ */
interface PrRow {
  exerciseKey: string;
  weightKg: number;
  reps: number;
  est1rm: number;
  achievedOn: string; // ISO
  isNew: boolean;
}

function buildPrs(sessions: WorkoutSession[], topN: number): PrRow[] {
  const best = new Map<string, PrRow>();
  const newCutoff = Date.now() - 7 * 86400_000;
  for (const s of sessions) {
    for (const set of s.sets) {
      if (set.weightKg <= 0) continue;
      const est = epley1rm(set.weightKg, set.reps);
      const cur = best.get(set.exerciseKey);
      if (!cur || est > cur.est1rm) {
        best.set(set.exerciseKey, {
          exerciseKey: set.exerciseKey,
          weightKg: set.weightKg,
          reps: set.reps,
          est1rm: est,
          achievedOn: s.startedAt,
          isNew: new Date(s.startedAt).getTime() >= newCutoff,
        });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.est1rm - a.est1rm).slice(0, topN);
}

function PrList({ prs, lang, k }: { prs: PrRow[]; lang: Lang; k: Record<K, string> }): ReactElement {
  if (prs.length === 0) return <EmptyState title={k.noPrs} hint={k.noPrsHint} />;
  const dateFmt = new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
  const fmt = numFmt(lang);
  return (
    <ul className="prog-pr-list">
      {prs.map((p, i) => {
        const ex = EX_BY_KEY.get(p.exerciseKey);
        return (
          <li
            key={p.exerciseKey}
            className={`prog-pr-row${p.isNew ? ' prog-pr-row--new' : ''}`}
            style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}
          >
            <div className="prog-pr-main">
              <span className="prog-pr-name">{exerciseName(p.exerciseKey, lang)}</span>
              <span className="prog-pr-sub">
                {fmt.format(p.weightKg)} {k.weightUnit ?? ''} × {fmt.format(p.reps)} {k.repsShort}
                {' — '}
                {k.est1rm}: {fmt.format(p.est1rm)}
              </span>
            </div>
            <div className="prog-pr-side">
              {p.isNew && <span className="prog-pr-badge">{k.newPr}</span>}
              <span className="prog-pr-date">{dateFmt.format(new Date(p.achievedOn))}</span>
              {ex && <span className="chip">{muscleLabel(ex.muscle, lang)}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ============================================================
 * 4. Streak + stats
 * ============================================================ */
function currentWeeklyStreak(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  const weeks = new Set<number>();
  for (const s of sessions) weeks.add(weekStartOf(new Date(s.startedAt)).getTime());
  let streak = 0;
  let cursor = weekStartOf(new Date());
  if (!weeks.has(cursor.getTime())) {
    // current week empty — streak counts back from last week
    cursor.setDate(cursor.getDate() - 7);
  }
  while (weeks.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

/* ============================================================
 * 5. Body weight — manual entries + SVG line chart
 * ============================================================ */
function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function WeightChart({ entries, lang }: { entries: BodyMeasurement[]; lang: Lang }): ReactElement {
  const W = 560;
  const H = 200;
  const PAD_X = 14;
  const PAD_TOP = 18;
  const PAD_BOTTOM = 40;
  const rtl = lang === 'fa';
  const fmt = numFmt(lang);
  const dateFmt = new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });

  const weights = entries.map((e) => e.weightKg as number);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const span = Math.max(0.5, max - min);
  const lo = min - span * 0.25;
  const hi = max + span * 0.25;
  const n = entries.length;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_TOP - PAD_BOTTOM;

  const px = (i: number): number => {
    const x = PAD_X + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW);
    return rtl ? W - x : x;
  };
  const py = (w: number): number => PAD_TOP + (1 - (w - lo) / (hi - lo)) * chartH;

  const points = entries.map((e, i) => `${px(i)},${py(e.weightKg as number)}`).join(' ');
  const area = `${px(0)},${PAD_TOP + chartH} ${points} ${px(n - 1)},${PAD_TOP + chartH}`;

  // x labels: first, middle, last
  const labelIdx = n === 1 ? [0] : n === 2 ? [0, 1] : [0, Math.floor((n - 1) / 2), n - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="prog-chart" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="progWeightGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CYAN} stopOpacity={0.35} />
          <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#progWeightGrad)" />
      {n > 1 && <polyline points={points} fill="none" stroke={CYAN} strokeWidth={2.5} strokeLinejoin="round" />}
      {entries.map((e, i) => {
        const isLast = i === n - 1;
        return (
        <g key={e.date}>
          <circle cx={px(i)} cy={py(e.weightKg as number)} r={isLast ? 6 : 4.5} fill="#0a0c12" stroke={isLast ? CYAN : BLUE} strokeWidth={2.5} style={isLast ? { filter: 'drop-shadow(0 0 8px rgba(0,240,255,0.8))' } : undefined} />
          {i > 0 && i < n - 1 && i % Math.ceil(n / 6) === 0 && (
            <text x={px(i)} y={py(e.weightKg as number) - 10} textAnchor="middle" fill="#a7adbf" fontSize={12}>
              {fmt.format(e.weightKg as number)}
            </text>
          )}
        </g>
        );
      })}
      {labelIdx.map((i) => (
        <text
          key={entries[i].date}
          x={px(i)}
          y={H - 14}
          textAnchor="middle"
          fill="#98a2b8"
          fontSize={12}
        >
          {dateFmt.format(new Date(`${entries[i].date}T12:00:00`))}
        </text>
      ))}
    </svg>
  );
}

function WeightSection({ lang, k }: { lang: Lang; k: Record<K, string> }): ReactElement {
  const [entries, setEntries] = useState<BodyMeasurement[]>(() =>
    getMeasurements().filter((m) => typeof m.weightKg === 'number'),
  );
  const [date, setDate] = useState<string>(todayIso());
  const [weight, setWeight] = useState<string>('');
  const fmt = numFmt(lang);

  const submit = (): void => {
    const w = parseFloat(weight.replace(',', '.'));
    if (!Number.isFinite(w) || w <= 0 || w > 500 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    saveMeasurement({ date, weightKg: Math.round(w * 10) / 10 });
    setEntries(getMeasurements().filter((m) => typeof m.weightKg === 'number'));
    setWeight('');
    setDate(todayIso());
  };

  const last = entries.length > 0 ? entries[entries.length - 1].weightKg : null;

  return (
    <section className="card prog-section">
      <div className="prog-card-head"><ScaleIcon /><h2 className="card-title">{k.bodyWeight}</h2></div>
      <form
        className="prog-weight-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          type="date"
          className="input"
          value={date}
          max={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          aria-label={k.bodyWeight}
        />
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.1"
          className="input"
          value={weight}
          placeholder={k.weightPlaceholder}
          onChange={(e) => setWeight(e.target.value)}
          aria-label={k.weightPlaceholder}
        />
        <button type="submit" className="btn-primary">
          {k.logWeight}
        </button>
      </form>
      {entries.length === 0 ? (
        <EmptyState title={k.noMeasurements} hint={k.noMeasurementsHint} />
      ) : (
        <>
          <WeightChart entries={entries} lang={lang} />
          {last != null && (
            <p className="card-meta prog-last">
              {k.lastEntry}: <strong>{fmt.format(last)}</strong> {k.weightUnit ?? ''}
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ============================================================
 * Main tab
 * ============================================================ */
export default function ProgressTab(): ReactElement {
  const { t, lang } = useLang();
  const k = PROGRESS_KEYS[lang] as Record<K, string>;

  const sessions = useMemo(() => getSessions(), []);

  const buckets = useMemo(() => buildWeekBuckets(sessions, lang), [sessions, lang]);
  const hasVolume = buckets.some((b) => b.volumeKg > 0);
  const muscleRows = useMemo(() => buildMuscleShares(sessions), [sessions]);
  const prs = useMemo(() => buildPrs(sessions, 8), [sessions]);

  const streak = useMemo(() => currentWeeklyStreak(sessions), [sessions]);
  const totalSessions = sessions.length;
  const totalVolume = useMemo(
    () => Math.round(sessions.reduce((a, s) => a + sessionVolumeKg(s), 0)),
    [sessions],
  );
  const avgDuration = useMemo(() => {
    const ds = sessions.map(sessionMinutes).filter((d): d is number => d != null);
    if (ds.length === 0) return null;
    return Math.round(ds.reduce((a, d) => a + d, 0) / ds.length);
  }, [sessions]);

  const fmt = numFmt(lang);
  const hasSessions = sessions.length > 0;

  return (
    <div>
      <style>{PROGRESS_CSS}</style>

      <header className="prog-header">
        <h1 className="prog-title">{t('shell.progress')}</h1>
      </header>

      {/* 4. Streak + stats row */}
      <div className="prog-stats">
        <div className="stat-card">
          <div className="stat-value prog-streak">
            {fmt.format(streak)} <span className="unit">{k.weekStreakUnit}</span>
          </div>
          <div className="stat-label">{k.statsStreak}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{fmt.format(totalSessions)}</div>
          <div className="stat-label">{k.statsSessions}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {fmt.format(totalVolume)} <span className="unit">{t('w.kg')}</span>
          </div>
          <div className="stat-label">{k.statsVolume}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {avgDuration != null ? fmt.format(avgDuration) : '–'}{' '}
            <span className="unit">{t('w.min')}</span>
          </div>
          <div className="stat-label">{k.statsAvgDuration}</div>
        </div>
      </div>

      {/* 1. Weekly volume trend */}
      <section className="card prog-section">
        <div className="prog-card-head"><VolIcon /><h2 className="card-title">{k.weeklyVolume}</h2></div>
        <p className="card-meta">{k.last8Weeks}</p>
        <div className="prog-chart-wrap">
          {hasVolume ? (
            <WeeklyVolumeChart buckets={buckets} lang={lang} />
          ) : (
            <EmptyState title={k.noSessions} hint={k.noSessionsHint} />
          )}
        </div>
      </section>

      {/* 2. Muscle-group distribution */}
      <section className="card prog-section">
        <div className="prog-card-head"><MuscleIcon /><h2 className="card-title">{k.muscleDist}</h2></div>
        <p className="card-meta">{k.last30Days}</p>
        <div className="prog-chart-wrap">
          {muscleRows.length > 0 ? (
            <MuscleDistChart rows={muscleRows} lang={lang} />
          ) : (
            <EmptyState title={k.noSessions} hint={k.noSessionsHint} />
          )}
        </div>
      </section>

      {/* 3. Personal records */}
      <section className="card prog-section prog-section--gold">
        <div className="prog-card-head"><TrophyIcon /><h2 className="card-title">{k.personalRecords}</h2></div>
        <div className="prog-chart-wrap">
          {hasSessions ? (
            <PrList prs={prs} lang={lang} k={k} />
          ) : (
            <EmptyState title={k.noSessions} hint={k.noSessionsHint} />
          )}
        </div>
      </section>

      {/* 5. Body weight */}
      <WeightSection lang={lang} k={k} />
    </div>
  );
}

/* ============================================================
 * Scoped styles (original, uses design tokens)
 * ============================================================ */
const PROGRESS_CSS = `
.prog-header { margin-bottom: var(--space-5); }
.prog-title { font-size: var(--text-h1); margin: 0; font-weight: 800; }
.prog-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  margin-bottom: var(--space-5);
}
.prog-streak { color: var(--accent-cyan); }
.prog-section { margin-bottom: var(--space-5); }

/* gold-framed records section — records are the trophy room */
.prog-section--gold {
  border: 1px solid transparent;
  background:
    linear-gradient(165deg, rgba(28, 26, 18, 0.98), rgba(14, 15, 20, 0.98)) padding-box,
    linear-gradient(135deg, rgba(255, 209, 102, 0.55), rgba(255, 176, 32, 0.14) 50%, rgba(255, 209, 102, 0.08)) border-box;
  box-shadow:
    var(--shadow-card),
    0 0 40px rgba(255, 209, 102, 0.1);
}

/* section header: icon medallion + title */
.prog-card-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-1);
}

.prog-card-head .card-title {
  margin: 0;
}

.prog-sec-icon {
  flex: 0 0 auto;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0.375rem;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, rgba(46, 156, 255, 0.2), rgba(0, 240, 255, 0.07));
  border: 1px solid rgba(46, 156, 255, 0.3);
  color: var(--accent-cyan);
}

.prog-section--gold .prog-sec-icon {
  background: linear-gradient(135deg, rgba(255, 209, 102, 0.24), rgba(255, 176, 32, 0.08));
  border-color: rgba(255, 209, 102, 0.4);
  color: var(--accent-gold);
  box-shadow: 0 0 14px rgba(255, 209, 102, 0.25);
}

.prog-chart-wrap { margin-top: var(--space-4); }
.prog-chart { width: 100%; height: auto; display: block; }
.prog-empty {
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-md);
  padding: var(--space-6) var(--space-4);
  text-align: center;
}
.prog-empty-icon {
  width: 3.5rem;
  height: 3.5rem;
  margin-bottom: var(--space-3);
  color: rgba(0, 240, 255, 0.5);
  filter: drop-shadow(0 0 10px rgba(0, 240, 255, 0.25));
}
.prog-empty-title {
  margin: 0 0 var(--space-2);
  font-weight: 700;
  color: var(--text-secondary);
}
.prog-empty-hint {
  margin: 0;
  font-size: var(--text-small);
  color: var(--text-muted);
  line-height: var(--leading-normal);
}
.prog-pr-list { list-style: none; margin: 0; padding: 0; }
.prog-pr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  animation: fitai-pr-row-in 0.45s var(--ease-out-soft) both;
  transition: background var(--dur-fast) ease;
}
.prog-pr-row:hover {
  background: rgba(244, 246, 251, 0.03);
}
.prog-pr-row:last-child { border-bottom: 0; }
/* fresh records carry a gold edge */
.prog-pr-row--new {
  border-inline-start: 3px solid var(--accent-gold);
  padding-inline-start: var(--space-3);
  background: linear-gradient(90deg, rgba(255, 209, 102, 0.07), transparent 70%);
}
.prog-pr-main { display: flex; flex-direction: column; gap: var(--space-1); }
.prog-pr-name { font-weight: 700; }
.prog-pr-sub { font-size: var(--text-small); color: var(--text-secondary); }
.prog-pr-side {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}
.prog-pr-date { font-size: var(--text-small); color: var(--text-muted); }
.prog-pr-badge {
  font-size: var(--text-tiny);
  font-weight: 800;
  color: #241a02;
  background: var(--grad-pr);
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-3);
  white-space: nowrap;
  box-shadow: var(--shadow-glow-gold);
}
.prog-weight-form {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: var(--space-2);
  margin: var(--space-4) 0;
}
.prog-last { margin-top: var(--space-3); }
.prog-last strong { color: var(--accent-cyan); }
@media (max-width: 420px) {
  .prog-weight-form { grid-template-columns: 1fr 1fr; }
  .prog-weight-form .btn-primary { grid-column: 1 / -1; }
}
`;
