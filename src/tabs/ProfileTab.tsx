/**
 * اپ هوشمند بدنسازی — Profile tab.
 * Display-only identity screen: who the athlete is (goal/level from the
 * onboarding profile), their lifetime stats from the local store, the
 * active program, and body measurements — plus one small setting: the
 * daily local training reminder (fully local, no server).
 */
import { useState, type ReactElement } from 'react';
import { useLang, type Lang } from '../lib/i18n';
import {
  ensureReminderScheduled,
  getReminderSettings,
  saveReminderSettings,
} from '../lib/reminder';
import {
  getActiveProgram,
  getPersonalRecords,
  getSessions,
  updateAthleteProfile,
} from '../lib/store';
import { MUSCLE_GROUPS, MUSCLE_LABELS } from '../lib/exercises';

/* ============================================================
 * Local bilingual strings (i18n.tsx is untouched by contract).
 * ============================================================ */
export const PROFILE_KEYS = {
  fa: {
    athlete: 'ورزشکار',
    level: 'سطح',
    daysPerWeek: 'روز در هفته',
    statsSessions: 'جلسات تمرین',
    statsVolume: 'حجم کل تمرین',
    statsPrs: 'رکوردهای شخصی',
    statsDays: 'روز تمرین در هفته',
    program: 'برنامه‌ی فعال',
    noProgram: 'هنوز برنامه‌ای نداری',
    body: 'مشخصات بدن',
    height: 'قد',
    weight: 'وزن',
    measurements: 'اندازه‌ها و اولویت‌ها',
    waist: 'دور کمر',
    hip: 'دور باسن',
    chest: 'دور سینه',
    arm: 'دور بازو',
    thigh: 'دور ران',
    cm: 'سانتی‌متر',
    priorities: 'اولویت‌های رشد',
    prioritiesHint: 'حداکثر ۲ عضله — بقیه با حجم نگهداری تمرین می‌کنن',
    phase: 'فاز برنامه',
    phaseFatloss: 'کاهش چربی',
    phaseGrowth: 'حجم و نگهداری',
    phaseNote: 'چربی‌سوزی سراسری است و با غذا اتفاق می‌افتد؛ تمرین عضله را نگه می‌دارد.',
    saveMeasurements: 'ذخیره‌ی اندازه‌ها و اولویت‌ها',
    savedNote: 'ذخیره شد — برای اعمال روی برنامه، «برنامه‌ی تازه» بساز.',
    coachSig: 'مربی هوشمند',
    coachSigSub: 'هر تمرینت رو می‌بینه، برنامه‌ی بعدیت رو باهاش می‌سازه',
    reminderTitle: 'یادآور تمرین',
    reminderSub: 'هر روز سر همین ساعت، روی گوشی خودت یادآوری می‌شوی — بدون سرور و بدون اینترنت.',
    reminderOn: 'یادآور روشن باشد',
    reminderTime: 'ساعت یادآور',
  },
  en: {
    athlete: 'Athlete',
    level: 'Level',
    daysPerWeek: 'days / week',
    statsSessions: 'Workout sessions',
    statsVolume: 'Total volume',
    statsPrs: 'Personal records',
    statsDays: 'Training days / week',
    program: 'Active program',
    noProgram: 'No program yet',
    body: 'Body',
    height: 'Height',
    weight: 'Weight',
    measurements: 'Measurements & priorities',
    waist: 'Waist',
    hip: 'Hip',
    chest: 'Chest',
    arm: 'Arm',
    thigh: 'Thigh',
    cm: 'cm',
    priorities: 'Growth priorities',
    prioritiesHint: 'Up to 2 muscles — the rest train on maintenance volume',
    phase: 'Program phase',
    phaseFatloss: 'Fat loss',
    phaseGrowth: 'Growth & maintenance',
    phaseNote: 'Fat loss is whole-body and comes from food; training preserves muscle.',
    saveMeasurements: 'Save measurements & priorities',
    savedNote: 'Saved — build a fresh program to apply it.',
    coachSig: 'AI Coach',
    coachSigSub: 'It watches every workout and builds your next plan from it',
    reminderTitle: 'Training reminder',
    reminderSub: 'A daily reminder on your own phone at this hour — no server, no internet.',
    reminderOn: 'Reminder on',
    reminderTime: 'Reminder time',
  },
} as const;

type K = keyof typeof PROFILE_KEYS.fa;

/* ---------- tiny original icons ---------- */
function Icon({ children }: { children: ReactElement }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const DumbbellIcon = () => (
  <Icon>
    <>
      <path d="M6.5 7v10M17.5 7v10" />
      <path d="M4 9.5v5M20 9.5v5M6.5 12h11" />
      <path d="M2.5 10.8v2.4M21.5 10.8v2.4" />
    </>
  </Icon>
);

const TrophyIcon = () => (
  <Icon>
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H4.5a3.5 3.5 0 0 0 3.6 3.5M16 5h3.5a3.5 3.5 0 0 1-3.6 3.5" />
      <path d="M12 13v4M8.5 20h7M10 17h4" />
    </>
  </Icon>
);

const CalendarIcon = () => (
  <Icon>
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </>
  </Icon>
);

const SparkIcon = () => (
  <Icon>
    <path d="M12 3a4.5 4.5 0 0 1 4.5 4.5c0 2.6-2 3.4-2 5.5H9.5c0-2.1-2-2.9-2-5.5A4.5 4.5 0 0 1 12 3Z" />
  </Icon>
);

/* ---------- stored onboarding profile (fail-open) ---------- */
interface StoredProfile {
  goal?: 'fat-loss' | 'muscle' | 'strength' | 'fitness';
  level?: 'beginner' | 'intermediate' | 'advanced';
  daysPerWeek?: number;
  heightCm?: number;
  weightKg?: number;
  measurements?: {
    waistCm?: number;
    hipCm?: number;
    chestCm?: number;
    armCm?: number;
    thighCm?: number;
  };
  priorities?: string[];
  phase?: 'fatloss' | 'growth';
}

function readProfile(): StoredProfile | null {
  try {
    const raw = localStorage.getItem('fitai.userProfile');
    return raw ? (JSON.parse(raw) as StoredProfile) : null;
  } catch {
    return null;
  }
}

export default function ProfileTab(): ReactElement {
  const { t, lang } = useLang();
  const k = PROFILE_KEYS[lang] as Record<K, string>;
  const profile = readProfile();

  const goalLabel = profile?.goal
    ? profile.goal === 'fat-loss'
      ? t('onb.goalLose')
      : profile.goal === 'muscle'
        ? t('onb.goalBuild')
        : profile.goal === 'strength'
          ? t('onb.goalStrength')
          : t('onb.goalHealth')
    : k.athlete;

  const levelLabel = profile?.level
    ? profile.level === 'beginner'
      ? t('onb.levelNew')
      : profile.level === 'intermediate'
        ? t('onb.levelMid')
        : t('onb.levelPro')
    : null;

  const sessions = getSessions();
  const [reminder, setReminder] = useState(getReminderSettings);

  /* ---- measurements + priorities editing (per-muscle engine) ---- */
  const savedMeasures = profile?.measurements ?? {};
  const [waist, setWaist] = useState(savedMeasures.waistCm != null ? String(savedMeasures.waistCm) : '');
  const [hip, setHip] = useState(savedMeasures.hipCm != null ? String(savedMeasures.hipCm) : '');
  const [chest, setChest] = useState(savedMeasures.chestCm != null ? String(savedMeasures.chestCm) : '');
  const [arm, setArm] = useState(savedMeasures.armCm != null ? String(savedMeasures.armCm) : '');
  const [thigh, setThigh] = useState(savedMeasures.thighCm != null ? String(savedMeasures.thighCm) : '');
  const [priorities, setPriorities] = useState<string[]>(() =>
    (profile?.priorities ?? []).filter((x) => (MUSCLE_GROUPS as string[]).includes(x)),
  );
  const [justSaved, setJustSaved] = useState(false);

  // The phase is the user's explicit choice, selectable here. It must NOT be
  // silently re-derived from measurements on save: a user who overrode the
  // suggestion (e.g. chose growth despite a high waist ratio) would lose
  // that choice the next time they edit a circumference.
  const [phase, setPhase] = useState<'fatloss' | 'growth'>(
    profile?.phase ?? (profile?.goal === 'fat-loss' ? 'fatloss' : 'growth'),
  );

  const togglePriority = (mm: string): void => {
    setPriorities((prev) => {
      if (prev.includes(mm)) return prev.filter((x) => x !== mm);
      if (prev.length >= 2) return prev; // max 2 — the hint line explains
      return [...prev, mm];
    });
    setJustSaved(false);
  };

  const saveMeasurements = (): void => {
    const parseBounded = (raw: string, min: number, max: number): number | undefined => {
      const v = parseFloat(raw);
      return Number.isFinite(v) && v >= min && v <= max ? v : undefined;
    };
    const measurements = {
      waistCm: parseBounded(waist, 50, 150),
      hipCm: parseBounded(hip, 60, 170),
      chestCm: parseBounded(chest, 60, 170),
      armCm: parseBounded(arm, 20, 70),
      thighCm: parseBounded(thigh, 30, 100),
    };
    const patch: { measurements: typeof measurements; priorities: string[]; phase: 'fatloss' | 'growth' } = {
      measurements,
      priorities,
      phase,
    };
    updateAthleteProfile(patch);
    setJustSaved(true);
  };

  const updateReminder = (next: { enabled: boolean; hour: number; minute: number }) => {
    setReminder(next);
    saveReminderSettings(next);
    void ensureReminderScheduled();
  };

  const reminderTimeValue = `${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`;
  const digits = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US');
  const totalVolume = Math.round(
    sessions.reduce((a, s) => a + s.sets.reduce((x, set) => x + set.reps * set.weightKg, 0), 0),
  );
  const prCount = getPersonalRecords().length;
  const program = getActiveProgram();

  const stats = [
    {
      icon: <CalendarIcon />,
      value: digits.format(sessions.length),
      label: k.statsSessions,
    },
    {
      icon: <DumbbellIcon />,
      value: digits.format(totalVolume),
      unit: t('w.kg'),
      label: k.statsVolume,
    },
    {
      icon: <TrophyIcon />,
      value: digits.format(prCount),
      label: k.statsPrs,
      gold: true,
    },
    {
      icon: <SparkIcon />,
      value: digits.format(program?.daysPerWeek ?? profile?.daysPerWeek ?? 0),
      label: k.statsDays,
    },
  ];

  return (
    <div className="home-cascade">
      {/* identity hero */}
      <section className="card profile-hero">
        <span className="profile-avatar" aria-hidden="true">
          <DumbbellIcon />
        </span>
        <div className="profile-id">
          <p className="profile-eyebrow">{k.athlete}</p>
          <h1 className="profile-name">{goalLabel}</h1>
          <div className="profile-chips">
            {levelLabel && (
              <span className="chip chip--active">
                {k.level}: {levelLabel}
              </span>
            )}
            {profile?.daysPerWeek != null && (
              <span className="chip">
                {digits.format(profile.daysPerWeek)} {k.daysPerWeek}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* lifetime stats */}
      <div className="home-stats profile-stats">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <span className={`stat-icon${s.gold ? ' stat-icon--gold' : ''}`} aria-hidden="true">
              {s.icon}
            </span>
            <div className="stat-body">
              <div className={`stat-value${s.gold ? ' stat-value--gold' : ' stat-value--grad'}`}>
                {s.value}
                {s.unit && <span className="unit"> {s.unit}</span>}
              </div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* active program */}
      <section className="card">
        <h2 className="card-title">{k.program}</h2>
        {program ? (
          <>
            <p className="profile-program-name">{program.name}</p>
            <div className="today-chips">
              <span className="chip chip--active">{goalLabel}</span>
              {levelLabel && <span className="chip">{levelLabel}</span>}
              <span className="chip">
                {digits.format(program.days.length)} {k.statsDays}
              </span>
            </div>
          </>
        ) : (
          <p className="card-meta" style={{ margin: 0 }}>{k.noProgram}</p>
        )}
      </section>

      {/* body */}
      {(profile?.heightCm || profile?.weightKg) && (
        <section className="card">
          <h2 className="card-title">{k.body}</h2>
          <div className="profile-body-grid">
            {profile?.heightCm != null && (
              <div className="profile-body-item">
                <span className="profile-body-value">{digits.format(profile.heightCm)}</span>
                <span className="profile-body-label">
                  {k.height} · {lang === 'fa' ? 'سانتی‌متر' : 'cm'}
                </span>
              </div>
            )}
            {profile?.weightKg != null && (
              <div className="profile-body-item">
                <span className="profile-body-value">{digits.format(profile.weightKg)}</span>
                <span className="profile-body-label">
                  {k.weight} · {t('w.kg')}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* measurements + priorities editing */}
      {profile && (
        <section className="card">
          <h2 className="card-title">{k.measurements}</h2>
          <div className="profile-body-grid">
            {[
              { label: k.waist, value: waist, set: setWaist, min: 50, max: 150 },
              { label: k.hip, value: hip, set: setHip, min: 60, max: 170 },
              { label: k.chest, value: chest, set: setChest, min: 60, max: 170 },
              { label: k.arm, value: arm, set: setArm, min: 20, max: 70 },
              { label: k.thigh, value: thigh, set: setThigh, min: 30, max: 100 },
            ].map((f) => (
              <div className="profile-body-item" key={f.label}>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min={f.min}
                  max={f.max}
                  value={f.value}
                  aria-label={`${f.label} (${k.cm})`}
                  onChange={(e) => {
                    f.set(e.target.value);
                    setJustSaved(false);
                  }}
                />
                <span className="profile-body-label">
                  {f.label} · {k.cm}
                </span>
              </div>
            ))}
          </div>
          <p className="card-meta" style={{ margin: '16px 0 4px' }}>{k.priorities}</p>
          <p className="card-meta">{k.prioritiesHint}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {MUSCLE_GROUPS.filter((mm) => mm !== 'fullbody').map((mm) => {
              const selected = priorities.includes(mm);
              return (
                <button
                  key={mm}
                  type="button"
                  className={`chip${selected ? ' chip--active' : ''}`}
                  aria-pressed={selected}
                  onClick={() => togglePriority(mm)}
                >
                  {lang === 'fa' ? MUSCLE_LABELS[mm].fa : MUSCLE_LABELS[mm].en}
                </button>
              );
            })}
          </div>
          <p className="card-meta">{k.phase}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {(['fatloss', 'growth'] as const).map((ph) => (
              <button
                key={ph}
                type="button"
                className={`chip${phase === ph ? ' chip--active' : ''}`}
                aria-pressed={phase === ph}
                onClick={() => {
                  setPhase(ph);
                  setJustSaved(false);
                }}
              >
                {ph === 'fatloss' ? k.phaseFatloss : k.phaseGrowth}
              </button>
            ))}
          </div>
          <p className="card-meta">{k.phaseNote}</p>
          <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={saveMeasurements}>
            {k.saveMeasurements}
          </button>
          {justSaved && (
            <p className="card-meta" style={{ marginTop: 8 }}>{k.savedNote}</p>
          )}
        </section>
      )}

      {/* daily local reminder */}
      <section className="card">
        <h2 className="card-title">{k.reminderTitle}</h2>
        <p className="card-meta" style={{ margin: '0 0 12px' }}>{k.reminderSub}</p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={reminder.enabled}
            onChange={(e) => updateReminder({ ...reminder, enabled: e.target.checked })}
          />
          {k.reminderOn}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {k.reminderTime}
          <input
            type="time"
            value={reminderTimeValue}
            disabled={!reminder.enabled}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number);
              if (Number.isNaN(h) || Number.isNaN(m)) return;
              updateReminder({ ...reminder, hour: h, minute: m });
            }}
          />
        </label>
      </section>

      {/* signature */}
      <section className="card profile-signature">
        <span className="profile-sig-icon" aria-hidden="true">
          <SparkIcon />
        </span>
        <div>
          <p className="profile-sig-title">{k.coachSig}</p>
          <p className="profile-sig-sub">{k.coachSigSub}</p>
        </div>
      </section>
    </div>
  );
}
