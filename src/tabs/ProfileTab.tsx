/**
 * اپ هوشمند بدنسازی — Profile tab.
 * Display-only identity screen: who the athlete is (goal/level from the
 * onboarding profile), their lifetime stats from the local store, the
 * active program, and body measurements. No actions — pure presence.
 */
import type { ReactElement } from 'react';
import { useLang, type Lang } from '../lib/i18n';
import {
  getActiveProgram,
  getPersonalRecords,
  getSessions,
} from '../lib/store';

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
    coachSig: 'مربی هوشمند',
    coachSigSub: 'هر تمرینت رو می‌بینه، برنامه‌ی بعدیت رو باهاش می‌سازه',
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
    coachSig: 'AI Coach',
    coachSigSub: 'It watches every workout and builds your next plan from it',
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
