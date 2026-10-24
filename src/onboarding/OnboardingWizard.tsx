/**
 * اپ هوشمند بدنسازی — Onboarding wizard (multi-step, full-screen overlay).
 *
 * Steps: goal → level → days/week → equipment → injuries → height/weight
 * → summary review → finish. On finish it lazily loads generateProgram()
 * from ../lib/program (built by a sibling agent; the import is guarded so
 * the wizard works even when that file is absent), saves the program via
 * the store, persists the profile, and calls onDone().
 *
 * i18n: new strings live in ONBOARDING_KEYS below (fa/en) — the coordinator
 * merges them into lib/i18n.tsx centrally. This file is never edited for
 * copy. Existing dict keys are resolved through useLang().t().
 */
import { useState, type ReactElement } from 'react';
import { useLang, type Lang } from '../lib/i18n';
import { saveProgram, setActiveProgram, setOnboarded } from '../lib/store';
import { EQUIPMENT_TYPES, type Equipment } from '../lib/exercises';
import './onboarding.css';

/* ============================================================
 * i18n bundle — merged into lib/i18n.tsx by the coordinator.
 * fa and en MUST keep identical key sets.
 * ============================================================ */
export const ONBOARDING_KEYS: Record<Lang, Record<string, string>> = {
  fa: {
    'onbw.stepOf': 'مرحله {current} از {total}',
    'onbw.goalSubtitle': 'یکی رو انتخاب کن؛ بعداً می‌تونی عوضش کنی',
    'onbw.goalDesc.fat-loss': 'کاهش چربی و فرم‌گیری بدن',
    'onbw.goalDesc.muscle': 'حجم و فرم عضلات',
    'onbw.goalDesc.strength': 'قوی‌تر شدن در حرکات اصلی',
    'onbw.goalDesc.fitness': 'سلامتی، انرژی و تندرستی روزانه',
    'onbw.goalGeneral': 'تناسب عمومی',
    'onbw.levelSubtitle': 'برنامه‌ت بر اساس سطحت تنظیم می‌شه',
    'onbw.levelDesc.beginner': 'تازه شروع کردم — کمتر از ۶ ماه',
    'onbw.levelDesc.intermediate': '۶ ماه تا ۲ سال تمرین منظم',
    'onbw.levelDesc.advanced': 'بیش از ۲ سال — تکنیک‌ها رو بلدم',
    'onbw.daysTitle': 'هفته‌ای چند روز می‌تونی تمرین کنی؟',
    'onbw.daysSubtitle': 'واقع‌بینانه انتخاب کن — ثبات مهم‌تر از شدته',
    'onbw.daysValue': '{n} روز در هفته',
    'onbw.dayMore': 'یک روز بیشتر',
    'onbw.dayLess': 'یک روز کمتر',
    'onbw.equipmentTitle': 'به چه وسیله‌هایی دسترسی داری؟',
    'onbw.equipmentSubtitle': 'می‌تونی چندتا انتخاب کنی',
    'onbw.injuriesTitle': 'آسیب یا محدودیتی داری؟',
    'onbw.injuriesSubtitle': 'برنامه‌ات طوری ساخته می‌شه که بهشون فشار نیاد',
    'onbw.injury.shoulder': 'سرشانه',
    'onbw.injury.knee': 'زانو',
    'onbw.injury.lower-back': 'کمر',
    'onbw.injury.wrist': 'مچ دست',
    'onbw.injury.none': 'مشکلی ندارم',
    'onbw.injuryNoteLabel': 'توضیح بیشتر (اختیاری)',
    'onbw.injuryNotePlaceholder': 'مثلاً: زانوی راستم تو اسکات درد می‌گیره…',
    'onbw.statsTitle': 'قد و وزنت چقدره؟',
    'onbw.statsSubtitle': 'اختیاریه — برای پیگیری پیشرفتت لازم می‌شه',
    'onbw.height': 'قد (سانتی‌متر)',
    'onbw.weight': 'وزن (کیلوگرم)',
    'onbw.skip': 'رد کردن',
    'onbw.reviewTitle': 'یه نگاه به انتخاب‌هات بنداز',
    'onbw.reviewSubtitle': 'اگه چیزی اشتباهه، بزن روش تا برگردی و درستش کنی',
    'onbw.reviewGoal': 'هدف',
    'onbw.reviewLevel': 'سطح',
    'onbw.reviewDays': 'روزهای تمرین',
    'onbw.reviewEquipment': 'وسیله‌ها',
    'onbw.reviewInjuries': 'آسیب‌ها',
    'onbw.reviewStats': 'قد و وزن',
    'onbw.statsValue': 'قد {h} • وزن {w}',
    'onbw.noStats': 'وارد نشده',
    'onbw.finish': 'ساخت برنامه‌ی من',
    'onbw.generating': 'دارم برنامه‌ی مخصوصت رو می‌سازم…',
    'onbw.needSelection': 'اول یه گزینه انتخاب کن 👆',
    'onbw.needEquipment': 'حداقل یه وسیله انتخاب کن',
    'onbw.needInjury': 'اگه مشکلی نداری، «مشکلی ندارم» رو بزن',
    'onbw.programName': 'برنامه {goal}',
    'onbw.edit': 'ویرایش',
  },
  en: {
    'onbw.stepOf': 'Step {current} of {total}',
    'onbw.goalSubtitle': 'Pick one — you can change it later',
    'onbw.goalDesc.fat-loss': 'Lose fat and get lean',
    'onbw.goalDesc.muscle': 'Build muscle size and shape',
    'onbw.goalDesc.strength': 'Get stronger on the big lifts',
    'onbw.goalDesc.fitness': 'Health, energy and daily fitness',
    'onbw.goalGeneral': 'General fitness',
    'onbw.levelSubtitle': 'Your plan adapts to your level',
    'onbw.levelDesc.beginner': 'Just starting — under 6 months',
    'onbw.levelDesc.intermediate': '6 months to 2 years of consistent training',
    'onbw.levelDesc.advanced': '2+ years — solid technique',
    'onbw.daysTitle': 'How many days per week can you train?',
    'onbw.daysSubtitle': 'Be realistic — consistency beats intensity',
    'onbw.daysValue': '{n} days per week',
    'onbw.dayMore': 'One more day',
    'onbw.dayLess': 'One fewer day',
    'onbw.equipmentTitle': 'What equipment do you have access to?',
    'onbw.equipmentSubtitle': 'Select all that apply',
    'onbw.injuriesTitle': 'Any injuries or limitations?',
    'onbw.injuriesSubtitle': 'Your plan will be built to work around them',
    'onbw.injury.shoulder': 'Shoulder',
    'onbw.injury.knee': 'Knee',
    'onbw.injury.lower-back': 'Lower back',
    'onbw.injury.wrist': 'Wrist',
    'onbw.injury.none': 'No issues',
    'onbw.injuryNoteLabel': 'More detail (optional)',
    'onbw.injuryNotePlaceholder': 'e.g. my right knee hurts during squats…',
    'onbw.statsTitle': 'What are your height and weight?',
    'onbw.statsSubtitle': 'Optional — needed later to track your progress',
    'onbw.height': 'Height (cm)',
    'onbw.weight': 'Weight (kg)',
    'onbw.skip': 'Skip',
    'onbw.reviewTitle': 'Review your choices',
    'onbw.reviewSubtitle': 'Tap any row to go back and change it',
    'onbw.reviewGoal': 'Goal',
    'onbw.reviewLevel': 'Level',
    'onbw.reviewDays': 'Training days',
    'onbw.reviewEquipment': 'Equipment',
    'onbw.reviewInjuries': 'Injuries',
    'onbw.reviewStats': 'Height & weight',
    'onbw.statsValue': 'Height {h} • Weight {w}',
    'onbw.noStats': 'Not provided',
    'onbw.finish': 'Build my program',
    'onbw.generating': 'Building your personal program…',
    'onbw.needSelection': 'Pick an option first 👆',
    'onbw.needEquipment': 'Select at least one',
    'onbw.needInjury': 'If all good, tap “No issues”',
    'onbw.programName': '{goal} program',
    'onbw.edit': 'Edit',
  },
};

/* ============================================================
 * Public types — the contract with src/lib/program.ts
 * (generateProgram: (profile: UserProfile) => WorkoutPlan)
 * ============================================================ */
export type Goal = 'fat-loss' | 'muscle' | 'strength' | 'fitness';
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type EquipmentKey = Equipment;
export type InjuryKey = 'shoulder' | 'knee' | 'lower-back' | 'wrist' | 'none';

export interface UserProfile {
  goal: Goal;
  level: Level;
  daysPerWeek: number;
  equipment: EquipmentKey[];
  injuries: InjuryKey[];
  injuryNote?: string;
  heightCm?: number;
  weightKg?: number;
}

export interface WorkoutPlanExercise {
  exerciseKey: string;
  sets: number;
  reps: string; // range, e.g. "8-10"
  restSeconds: number;
}

export interface WorkoutPlanDay {
  key?: string;
  /** Engine uses nameFa; fallback `name` kept for shape compatibility. */
  name?: string;
  nameFa?: string;
  nameEn: string;
  exercises: WorkoutPlanExercise[];
}

export interface WorkoutPlan {
  days: WorkoutPlanDay[];
}

/* ============================================================
 * Profile persistence (localStorage, same fail-open pattern as store.ts)
 * ============================================================ */
const PROFILE_KEY = 'fitai.userProfile';

export interface StoredUserProfile extends UserProfile {
  programPending: boolean;
  savedAt: string; // ISO
}

export function saveUserProfile(p: UserProfile, programPending: boolean): void {
  try {
    const stored: StoredUserProfile = {
      ...p,
      programPending,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(stored));
    // The coach engine reads the level from this flat key.
    localStorage.setItem('fitai.profile.level', p.level);
  } catch {
    /* storage unavailable — fail open */
  }
}

export function getUserProfile(): StoredUserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as StoredUserProfile) : null;
  } catch {
    return null;
  }
}

/* ============================================================
 * Lazy, guarded loader for generateProgram().
 * ../lib/program.ts is built by a sibling agent and may not exist
 * yet. A template-literal specifier keeps tsc from resolving the
 * module statically (typed as any), while Vite still bundles it
 * when the file exists; when absent the import rejects → null.
 * ============================================================ */
type GenerateProgramFn = (profile: UserProfile) => WorkoutPlan;

/**
 * The program engine (src/lib/program.ts) uses slightly different goal
 * literals than the onboarding UI — map before calling generateProgram.
 */
const ENGINE_GOAL: Record<Goal, 'fatloss' | 'muscle' | 'strength' | 'general'> = {
  'fat-loss': 'fatloss',
  muscle: 'muscle',
  strength: 'strength',
  fitness: 'general',
};

async function loadGenerateProgram(): Promise<GenerateProgramFn | null> {
  try {
    const moduleName = 'program';
    const mod = (await import(`../lib/${moduleName}`)) as {
      generateProgram?: unknown;
    };
    return typeof mod.generateProgram === 'function'
      ? (mod.generateProgram as GenerateProgramFn)
      : null;
  } catch {
    return null;
  }
}

/* ---------------- step model ---------------- */
const STEPS = [
  'goal',
  'level',
  'days',
  'equipment',
  'injuries',
  'stats',
  'review',
] as const;
type StepId = (typeof STEPS)[number];

const GOAL_EMOJI: Record<Goal, string> = {
  'fat-loss': '🔥',
  muscle: '💪',
  strength: '🏋️',
  fitness: '🌿',
};

const INJURY_KEYS: InjuryKey[] = ['shoulder', 'knee', 'lower-back', 'wrist', 'none'];

interface OnboardingWizardProps {
  /** Called when onboarding completes (or the profile is saved) — the shell closes the wizard. */
  onDone: () => void;
}

export default function OnboardingWizard({ onDone }: OnboardingWizardProps): ReactElement {
  const { t, lang } = useLang();
  const lt = (key: string): string => ONBOARDING_KEYS[lang][key] ?? key;
  const fmtNum = (n: number): string =>
    new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);

  const [stepIdx, setStepIdx] = useState(0);
  const [direction, setDirection] = useState<'fwd' | 'back'>('fwd');
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [days, setDays] = useState(3);
  const [equipment, setEquipment] = useState<EquipmentKey[]>([]);
  const [injuries, setInjuries] = useState<InjuryKey[]>([]);
  const [injuryNote, setInjuryNote] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');

  const step: StepId = STEPS[stepIdx];
  const total = STEPS.length;

  const goalLabel = (g: Goal): string =>
    g === 'fat-loss'
      ? t('onb.goalLose')
      : g === 'muscle'
        ? t('onb.goalBuild')
        : g === 'strength'
          ? t('onb.goalStrength')
          : lt('onbw.goalGeneral');

  const levelLabel = (l: Level): string =>
    l === 'beginner' ? t('onb.levelNew') : l === 'intermediate' ? t('onb.levelMid') : t('onb.levelPro');

  /* ---------------- navigation + validation ---------------- */
  const goTo = (idx: number, dir: 'fwd' | 'back'): void => {
    setDirection(dir);
    setError(null);
    setStepIdx(Math.max(0, Math.min(total - 1, idx)));
  };

  const validationError = (id: StepId): string | null => {
    switch (id) {
      case 'goal':
        return goal ? null : 'onbw.needSelection';
      case 'level':
        return level ? null : 'onbw.needSelection';
      case 'equipment':
        return equipment.length > 0 ? null : 'onbw.needEquipment';
      case 'injuries':
        return injuries.length > 0 ? null : 'onbw.needInjury';
      default:
        return null; // days (stepper), stats (optional), review
    }
  };

  const handleNext = (): void => {
    const err = validationError(step);
    if (err) {
      setError(err);
      setShake(true);
      window.setTimeout(() => setShake(false), 350);
      return;
    }
    goTo(stepIdx + 1, 'fwd');
  };

  const handleBack = (): void => goTo(stepIdx - 1, 'back');

  const toggleEquipment = (k: EquipmentKey): void => {
    setEquipment((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const toggleInjury = (k: InjuryKey): void => {
    setInjuries((prev) => {
      if (k === 'none') return prev.includes('none') ? [] : ['none']; // exclusive
      const rest = prev.filter((x) => x !== 'none');
      return rest.includes(k) ? rest.filter((x) => x !== k) : [...rest, k];
    });
  };

  /* ---------------- finish ---------------- */
  const buildProfile = (): UserProfile => {
    const p: UserProfile = {
      goal: goal as Goal,
      level: level as Level,
      daysPerWeek: days,
      equipment: [...equipment],
      injuries: [...injuries],
    };
    const note = injuryNote.trim();
    if (note) p.injuryNote = note;
    const h = parseInt(height, 10);
    if (Number.isFinite(h) && h >= 120 && h <= 230) p.heightCm = h;
    const w = parseFloat(weight);
    if (Number.isFinite(w) && w >= 30 && w <= 300) p.weightKg = w;
    return p;
  };

  const handleFinish = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const profile = buildProfile();
    try {
      const generate = await loadGenerateProgram();
      let programSaved = false;
      if (generate) {
        try {
          const engineProfile = {
            ...profile,
            goal: ENGINE_GOAL[profile.goal],
            // 'none' is not an injury — drop it so the engine stays clean
            injuries: profile.injuries.filter((i) => i !== 'none'),
          };
          const plan = generate(engineProfile as UserProfile);
          if (plan && Array.isArray(plan.days) && plan.days.length > 0) {
            const stored = saveProgram({
              name: lt('onbw.programName').replace('{goal}', goalLabel(profile.goal)),
              goal: profile.goal,
              level: profile.level,
              daysPerWeek: profile.daysPerWeek,
              dayKeys: plan.days.map((d, i) => d.key ?? `day-${i + 1}`),
              dayNames: plan.days.map((d) => ({
                fa: d.nameFa ?? d.name ?? '',
                en: d.nameEn ?? '',
              })),
              days: plan.days.map((d) =>
                d.exercises.map((e) => ({
                  exerciseKey: e.exerciseKey,
                  sets: e.sets,
                  reps: e.reps,
                  restSeconds: e.restSeconds,
                })),
              ),
            });
            setActiveProgram(stored.id);
            programSaved = true;
          }
        } catch {
          /* generator failed — fall back to profile-only */
        }
      }
      saveUserProfile(profile, !programSaved);
      setOnboarded();
    } catch {
      saveUserProfile(profile, true);
      setOnboarded();
    } finally {
      onDone();
    }
  };

  /* ---------------- step renderers ---------------- */
  const goalOptions: { key: Goal; label: string; desc: string }[] = (
    Object.keys(GOAL_EMOJI) as Goal[]
  ).map((k) => ({ key: k, label: goalLabel(k), desc: lt(`onbw.goalDesc.${k}`) }));

  const levelOptions: { key: Level; label: string; desc: string }[] = (
    ['beginner', 'intermediate', 'advanced'] as Level[]
  ).map((k) => ({ key: k, label: levelLabel(k), desc: lt(`onbw.levelDesc.${k}`) }));

  const renderStep = (): ReactElement => {
    switch (step) {
      case 'goal':
        return (
          <>
            <h2 className="onbw-title">{t('onb.yourGoal')}</h2>
            <p className="onbw-subtitle">{lt('onbw.goalSubtitle')}</p>
            <div className="onbw-options">
              {goalOptions.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  className={`onbw-option${goal === o.key ? ' onbw-option--selected' : ''}`}
                  aria-pressed={goal === o.key}
                  onClick={() => setGoal(o.key)}
                >
                  {goal === o.key && <span className="onbw-check">✓</span>}
                  <span className="onbw-option-emoji" aria-hidden="true">
                    {GOAL_EMOJI[o.key]}
                  </span>
                  <span className="onbw-option-label">{o.label}</span>
                  <span className="onbw-option-desc">{o.desc}</span>
                </button>
              ))}
            </div>
          </>
        );

      case 'level':
        return (
          <>
            <h2 className="onbw-title">{t('onb.yourLevel')}</h2>
            <p className="onbw-subtitle">{lt('onbw.levelSubtitle')}</p>
            <div className="onbw-options onbw-options--list">
              {levelOptions.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  className={`onbw-option${level === o.key ? ' onbw-option--selected' : ''}`}
                  aria-pressed={level === o.key}
                  onClick={() => setLevel(o.key)}
                >
                  {level === o.key && <span className="onbw-check">✓</span>}
                  <span className="onbw-option-label">{o.label}</span>
                  <span className="onbw-option-desc">{o.desc}</span>
                </button>
              ))}
            </div>
          </>
        );

      case 'days':
        return (
          <>
            <h2 className="onbw-title">{lt('onbw.daysTitle')}</h2>
            <p className="onbw-subtitle">{lt('onbw.daysSubtitle')}</p>
            <div className="onbw-stepper">
              <button
                type="button"
                className="onbw-stepper-btn"
                aria-label={lt('onbw.dayLess')}
                disabled={days <= 2}
                onClick={() => setDays((d) => Math.max(2, d - 1))}
              >
                −
              </button>
              <div className="onbw-stepper-value" aria-live="polite">
                {lt('onbw.daysValue').replace('{n}', fmtNum(days))}
              </div>
              <button
                type="button"
                className="onbw-stepper-btn"
                aria-label={lt('onbw.dayMore')}
                disabled={days >= 6}
                onClick={() => setDays((d) => Math.min(6, d + 1))}
              >
                +
              </button>
            </div>
          </>
        );

      case 'equipment':
        return (
          <>
            <h2 className="onbw-title">{lt('onbw.equipmentTitle')}</h2>
            <p className="onbw-subtitle">{lt('onbw.equipmentSubtitle')}</p>
            <div className="onbw-options">
              {EQUIPMENT_TYPES.map((k) => {
                const selected = equipment.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    className={`onbw-option${selected ? ' onbw-option--selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleEquipment(k)}
                  >
                    {selected && <span className="onbw-check">✓</span>}
                    <span className="onbw-option-label">{t(`lib.equipment.${k}`)}</span>
                  </button>
                );
              })}
            </div>
          </>
        );

      case 'injuries':
        return (
          <>
            <h2 className="onbw-title">{lt('onbw.injuriesTitle')}</h2>
            <p className="onbw-subtitle">{lt('onbw.injuriesSubtitle')}</p>
            <div className="onbw-chips">
              {INJURY_KEYS.map((k) => {
                const selected = injuries.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    className={`chip onbw-chip-btn${selected ? ' chip--active' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleInjury(k)}
                  >
                    {lt(`onbw.injury.${k}`)}
                  </button>
                );
              })}
            </div>
            <div className="onbw-field">
              <label className="onbw-field-label" htmlFor="onbw-injury-note">
                {lt('onbw.injuryNoteLabel')}
              </label>
              <input
                id="onbw-injury-note"
                className="input"
                type="text"
                value={injuryNote}
                maxLength={200}
                placeholder={lt('onbw.injuryNotePlaceholder')}
                onChange={(e) => setInjuryNote(e.target.value)}
              />
            </div>
          </>
        );

      case 'stats': {
        return (
          <>
            <h2 className="onbw-title">{lt('onbw.statsTitle')}</h2>
            <p className="onbw-subtitle">{lt('onbw.statsSubtitle')}</p>
            <div className="onbw-field">
              <label className="onbw-field-label" htmlFor="onbw-height">
                {lt('onbw.height')}
              </label>
              <input
                id="onbw-height"
                className="input"
                type="number"
                inputMode="numeric"
                min={120}
                max={230}
                value={height}
                placeholder={lang === 'fa' ? '۱۷۸' : '178'}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
            <div className="onbw-field">
              <label className="onbw-field-label" htmlFor="onbw-weight">
                {lt('onbw.weight')}
              </label>
              <input
                id="onbw-weight"
                className="input"
                type="number"
                inputMode="decimal"
                min={30}
                max={300}
                step="0.5"
                value={weight}
                placeholder={lang === 'fa' ? '۸۲' : '82'}
                onChange={(e) => setWeight(e.target.value)}
              />
            </div>
          </>
        );
      }

      case 'review': {
        const sep = lang === 'fa' ? '، ' : ', ';
        const rows: { id: StepId; label: string; value: string }[] = [
          { id: 'goal', label: lt('onbw.reviewGoal'), value: goal ? goalLabel(goal) : '—' },
          { id: 'level', label: lt('onbw.reviewLevel'), value: level ? levelLabel(level) : '—' },
          {
            id: 'days',
            label: lt('onbw.reviewDays'),
            value: lt('onbw.daysValue').replace('{n}', fmtNum(days)),
          },
          {
            id: 'equipment',
            label: lt('onbw.reviewEquipment'),
            value: equipment.map((k) => t(`lib.equipment.${k}`)).join(sep),
          },
          {
            id: 'injuries',
            label: lt('onbw.reviewInjuries'),
            value:
              injuries.map((k) => lt(`onbw.injury.${k}`)).join(sep) +
              (injuryNote.trim() ? ` — ${injuryNote.trim()}` : ''),
          },
          {
            id: 'stats',
            label: lt('onbw.reviewStats'),
            value:
              height.trim() || weight.trim()
                ? lt('onbw.statsValue')
                    .replace('{h}', height.trim() || '—')
                    .replace('{w}', weight.trim() || '—')
                : lt('onbw.noStats'),
          },
        ];
        return (
          <>
            <h2 className="onbw-title">{lt('onbw.reviewTitle')}</h2>
            <p className="onbw-subtitle">{lt('onbw.reviewSubtitle')}</p>
            <div className="onbw-review">
              {rows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="onbw-review-row"
                  onClick={() => goTo(STEPS.indexOf(r.id), 'back')}
                >
                  <span className="onbw-review-text">
                    <span className="onbw-review-label">{r.label}</span>
                    <span className="onbw-review-value">{r.value}</span>
                  </span>
                  <span className="onbw-review-edit">{lt('onbw.edit')} ✎</span>
                </button>
              ))}
            </div>
          </>
        );
      }
    }
  };

  const nextLabel =
    step === 'review'
      ? lt('onbw.finish')
      : step === 'stats' && height.trim() === '' && weight.trim() === ''
        ? lt('onbw.skip')
        : t('common.next');

  return (
    <div
      className={`onbw-overlay fitai-root ${lang === 'fa' ? 'onbw-rtl' : 'onbw-ltr'}`}
      role="dialog"
      aria-modal="true"
      aria-label={t('app.name')}
    >
      <div className="onbw-sheet">
        <div className="onbw-progress-wrap">
          <div className="onbw-progress" aria-hidden="true">
            <div
              className="onbw-progress-fill"
              style={{ width: `${(((stepIdx + 1) / total) * 100).toFixed(1)}%` }}
            />
          </div>
          <span className="onbw-stepcount">
            {lt('onbw.stepOf')
              .replace('{current}', fmtNum(stepIdx + 1))
              .replace('{total}', fmtNum(total))}
          </span>
        </div>

        <div className="onbw-body">
          <div key={stepIdx} className={`onbw-step onbw-enter-${direction}${shake ? ' onbw-shake' : ''}`}>
            {renderStep()}
          </div>
        </div>

        <p className="onbw-error" role="alert">
          {error ? lt(error) : ''}
        </p>

        <div className="onbw-footer">
          {stepIdx > 0 && (
            <button type="button" className="btn-ghost" onClick={handleBack} disabled={busy}>
              {t('common.back')}
            </button>
          )}
          <button
            type="button"
            className="btn-primary"
            onClick={step === 'review' ? handleFinish : handleNext}
            disabled={busy}
          >
            {busy && <span className="onbw-spinner" aria-hidden="true" />}
            {busy ? lt('onbw.generating') : nextLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
