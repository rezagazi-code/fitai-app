/**
 * اپ هوشمند بدنسازی — bilingual dictionary (FA default, EN toggle).
 *
 * Original, self-written module. No external i18n library: the bundle stays
 * tiny and every user-facing string lives in exactly two dictionaries.
 *
 * Rules:
 *  - `fa` and `en` must ALWAYS have identical key sets. Add keys in pairs.
 *  - Persian strings must read like a native speaker wrote them —
 *    fluent, natural Persian, never translated word-by-word from English.
 *  - Never hard-code a user-facing string in a component; route it through t().
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';

export type Lang = 'fa' | 'en';

type Dict = Record<string, string>;

const STORAGE_KEY = 'fitai.lang';

const fa: Dict = {
  // App
  'app.name': 'اپ هوشمند بدنسازی',
  'app.tagline': 'مربی هوشمندت، هر روز همراهته',

  // Tabs
  'tab.home': 'خانه',
  'tab.workout': 'تمرین',
  'tab.progress': 'پیشرفت',
  'tab.profile': 'پروفایل',

  // Common actions
  'common.save': 'ذخیره',
  'common.cancel': 'انصراف',
  'common.delete': 'حذف',
  'common.edit': 'ویرایش',
  'common.start': 'شروع',
  'common.finish': 'پایان',
  'common.next': 'بعدی',
  'common.back': 'قبلی',
  'common.done': 'تمام شد',
  'common.retry': 'تلاش دوباره',
  'common.loading': 'در حال بارگذاری…',

  // Workout units
  'w.set': 'ست',
  'w.sets': 'ست‌ها',
  'w.reps': 'تکرار',
  'w.weight': 'وزن',
  'w.rest': 'استراحت',
  'w.kg': 'کیلوگرم',
  'w.sec': 'ثانیه',
  'w.min': 'دقیقه',

  // Workout flow
  'w.startWorkout': 'شروع تمرین',
  'w.finishWorkout': 'پایان تمرین',
  'w.logSet': 'ثبت ست',
  'w.restTimer': 'تایمر استراحت',
  'w.sessionDone': 'تمرینت تموم شد! خسته نباشی 💪',
  'w.howHard': 'تمرین امروز چطور بود؟',
  'w.tooEasy': 'خیلی راحت بود',
  'w.justRight': 'همین‌قدر خوب بود',
  'w.tooHard': 'خیلی سخت بود',
  'w.personalBest': 'رکورد شخصی جدید! 🎉',

  // Onboarding
  'onb.title': 'به اپ هوشمند بدنسازی خوش اومدی',
  'onb.subtitle': 'چند تا سؤال کوتاه، بعد برنامه‌ی مخصوص خودت آماده‌ست',
  'onb.yourGoal': 'هدفت از تمرین چیه؟',
  'onb.goalLose': 'چربی‌سوزی',
  'onb.goalBuild': 'عضله‌سازی',
  'onb.goalStrength': 'قدرت',
  'onb.goalHealth': 'تندرستی',
  'onb.yourLevel': 'سطحت کجاست؟',
  'onb.levelNew': 'تازه‌کار',
  'onb.levelMid': 'متوسط',
  'onb.levelPro': 'حرفه‌ای',
  'onb.getPlan': 'برنامه‌م رو بساز',
};

const en: Dict = {
  // App
  'app.name': 'Smart Workout',
  'app.tagline': 'Your AI coach, with you every day',

  // Tabs
  'tab.home': 'Home',
  'tab.workout': 'Workout',
  'tab.progress': 'Progress',
  'tab.profile': 'Profile',

  // Common actions
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.start': 'Start',
  'common.finish': 'Finish',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.done': 'Done',
  'common.retry': 'Try again',
  'common.loading': 'Loading…',

  // Workout units
  'w.set': 'Set',
  'w.sets': 'Sets',
  'w.reps': 'Reps',
  'w.weight': 'Weight',
  'w.rest': 'Rest',
  'w.kg': 'kg',
  'w.sec': 'sec',
  'w.min': 'min',

  // Workout flow
  'w.startWorkout': 'Start workout',
  'w.finishWorkout': 'Finish workout',
  'w.logSet': 'Log set',
  'w.restTimer': 'Rest timer',
  'w.sessionDone': 'Workout complete! Well done 💪',
  'w.howHard': 'How was today\u2019s workout?',
  'w.tooEasy': 'Too easy',
  'w.justRight': 'Just right',
  'w.tooHard': 'Too hard',
  'w.personalBest': 'New personal record! 🎉',

  // Onboarding
  'onb.title': 'Welcome to Smart Workout',
  'onb.subtitle': 'A few quick questions, then your personal plan is ready',
  'onb.yourGoal': 'What\u2019s your training goal?',
  'onb.goalLose': 'Fat loss',
  'onb.goalBuild': 'Muscle building',
  'onb.goalStrength': 'Strength',
  'onb.goalHealth': 'General fitness',
  'onb.yourLevel': 'What\u2019s your level?',
  'onb.levelNew': 'Beginner',
  'onb.levelMid': 'Intermediate',
  'onb.levelPro': 'Advanced',
  'onb.getPlan': 'Build my plan',
};

const dicts: Record<Lang, Dict> = { fa, en };

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'fa' || saved === 'en') return saved;
  } catch {
    /* storage unavailable (SSR/tests) — fall through */
  }
  return 'fa';
}

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextValue>({
  lang: 'fa',
  setLang: () => undefined,
  t: (key: string) => key,
});

function applyLangToDocument(lang: Lang): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
}

export function LangProvider({ children }: { children: ReactNode }): ReactElement {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    applyLangToDocument(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* storage unavailable — language still applies to the document */
    }
  }, [lang]);

  const setLang = (l: Lang): void => setLangState(l);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string) => dicts[lang][key] ?? key,
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}

/** Storage key used to persist the language choice. */
export const LANG_STORAGE_KEY = STORAGE_KEY;
