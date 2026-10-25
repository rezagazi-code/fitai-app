/**
 * اپ هوشمند بدنسازی — context-aware AI coach engine.
 *
 * A rule-based, fully offline coach brain. Every function is pure: it takes a
 * CoachContext and returns bilingual { key, params } messages — the UI layer
 * localizes them via COACH_KEYS / renderCoachMessage. Nothing here touches
 * the network or hard-codes a user-facing string.
 *
 * Personality: a warm, direct Tehran coach. Zero fluff, honest not
 * sycophantic — a light day gets "at least you showed up", not confetti.
 */

import type {
  PersonalRecord,
  ProgramExercise,
  WorkoutProgram,
  WorkoutSession,
} from './store';
import { getActiveProgram, getSessions } from './store';
import { getExercise } from './exercises';
import { getSchedule } from './schedule';

export type CoachTone = 'info' | 'praise' | 'nudge';

/** Bilingual message: a dictionary key plus interpolation params. */
export interface CoachMessage {
  key: string;
  params: Record<string, string | number>;
  tone: CoachTone;
}

export interface UserProfile {
  goal: string; // 'fat-loss' | 'muscle' | 'strength' | 'fitness'
  level: string; // 'new' | 'mid' | 'pro'
  daysPerWeek: number;
}

export interface CoachContext {
  now: Date;
  userProfile: UserProfile;
  plan: WorkoutProgram | null;
  /** Today's program day exercises, or null on a rest day / no program. */
  todayPlanDay: ProgramExercise[] | null;
  todayPlanDayIndex: number | null;
  /** Finished + in-progress sessions from the last 30 days, oldest first. */
  sessions: WorkoutSession[];
  /** Consecutive days with at least one session, ending today/yesterday. */
  streak: number;
  /** PRs achieved in the last 7 days, newest first. */
  recentPRs: PersonalRecord[];
  lastSession: WorkoutSession | null;
  /** Banner key shown last time — the engine never repeats it twice in a row. */
  lastShownKey: string | null;
}

/* ============================================================
 * Bilingual dictionary. `fa` and `en` MUST keep identical key sets.
 * {tokens} are filled from CoachMessage.params by renderCoachMessage.
 * ============================================================ */

type Dict = Record<string, string>;

export const COACH_KEYS: { fa: Dict; en: Dict } = {
  fa: {
    // ---- banner ----
    'b.noProgram':
      'هنوز برنامه‌ای نداری — دو دقیقه طول می‌کشه، هدفت رو بگو تا برنامه‌ت رو بچینم. بزن بریم.',
    'b.welcomeBack':
      '{n} روز غیبت داشتی؛ مهم اینه که برگشتی. امروز سبک شروع کن، بدن خودش یادش میاد.',
    'b.missed':
      'قرار بود این هفته {n} جلسه بیای و عقب افتادی — سرت حتماً شلوغ بوده. امروز جبرانش کن، حتی نیم‌ساعت.',
    'b.deload':
      'چهار هفته‌ست سنگین می‌زنی. این هفته سبک‌تر بزن؛ دیلود تنبلی نیست، بخشی از برنامه‌ست.',
    'b.today':
      'امروز روز {day}ـه. دفعه‌ی قبل {name} رو {w} کیلو {r} تکرار زدی — امروز یه تکرار بیشتر؟',
    'b.todayFresh':
      'امروز روز {day}ـه. {name} رو سبک شروع کن و فرم رو تمیز نگه دار.',
    'b.plateau':
      '{name} سه جلسه‌ست سر جاشه. یا یه هفته سبک‌تر بزن یا یه حرکت جایگزین امتحان کن.',
    'b.pr': 'رکورد جدید: {name} {w} کیلو! دمت گرم — همین فرمون برو جلو.',
    'b.streak': '{n} جلسه پشت سر هم — این دیگه عادت شده، نه تصمیم.',
    'b.goal.fat-loss':
      'چربی‌سوزی یعنی کالری‌سوزی به‌علاوه‌ی پروتئین کافی. امروز بعد تمرین یه پیاده‌روی سبک هم بذار.',
    'b.goal.muscle':
      'برای عضله‌سازی هر وعده یه منبع پروتئین کامل بذار — تمرین فقط نصف راهه.',
    'b.goal.strength':
      'قدرت با تکرار کم و استراحت کامل ساخته می‌شه؛ بین ست‌های سنگین عجله نکن.',
    'b.goal.fitness':
      'تندرستی یعنی ثبات. همین که منظم میای، داری درست کار می‌کنی.',
    'b.tip.0': 'آب کافی یادت نره — کم‌آبی مستقیم روی قدرتت اثر می‌ذاره.',
    'b.tip.1': 'پنج دقیقه گرم کردن قبل تمرین، نصف مصدومیت‌ها رو حذف می‌کنه.',
    'b.tip.2': 'خواب کم یعنی ریکاوری کم. امشب زودتر بخواب.',
    'b.tip.3': 'صبحه و انرژی داری — سنگین‌ترین حرکتت رو اول بذار.',
    'b.tip.4': 'آخر روزه و خسته‌ای؟ سبک بزن، ولی بزن.',
    'b.tip.5': 'فرم تمیز با وزن کمتر، همیشه بهتر از فرم خراب با وزن بیشتره.',
    'b.tip.6': 'بین ست‌ها گوشی رو بذار کنار؛ تمرکز یعنی تکرار بهتر.',
    'b.tip.7': 'پروتئین بعد تمرین رو جدی بگیر — عضله باهاش ساخته می‌شه.',

    // ---- daily tips ----
    't.restDay':
      'امروز استراحته — یه پیاده‌روی سبک یا چند دقیقه کشش، ریکاوری رو سریع‌تر می‌کنه.',
    't.protein.muscle': 'هر وعده یه منبع پروتئین کامل بذار؛ عضله با تمرین تحریک می‌شه، با غذا ساخته می‌شه.',
    't.protein.fat-loss':
      'تو دوره‌ی چربی‌سوزی پروتئین بالا نجاتت می‌ده — عضله رو نگه می‌داره و سیرت نگه می‌داره.',
    't.protein.strength':
      'قبل تمرین یه وعده‌ی سبک کربوهیدرات بخور؛ انرژی ست‌های سنگین از همین‌جا میاد.',
    't.protein.fitness': 'آب کافی و خواب منظم؛ نصف راه تندرستی همین دوتاست.',
    't.water': 'امروز حداقل ۸ لیوان آب — موقع تمرین بیشتر.',
    't.cue.chest': 'تو {name}: سینه رو بالا نگه دار و شونه‌ها رو عقب قفل کن.',
    't.cue.back': 'تو {name}: اول کتف‌ها رو به هم نزدیک کن، بعد دست‌ها رو بکش.',
    't.cue.legs': 'تو {name}: زانوها دنبال نوک پا برن و کمر صاف بمونه.',
    't.cue.shoulders': 'تو {name}: آرنج رو کامل قفل نکن؛ حرکت کنترل‌شده دستته.',
    't.cue.default': 'تو {name}: آروم و کنترل‌شده بزن؛ تکرار تمیز مهم‌تر از تکرار بیشتره.',
    't.sleep': 'این هفته سنگین بودی — امشب خواب کافی بهترین مکمله.',

    // ---- session brief ----
    's.brief': 'جلسه‌ی {day}: تمرکز امروز روی {name}ـه. دفعه‌ی قبل {w} کیلو {r} تکرار زدی.',
    's.briefProg':
      'جلسه‌ی {day}: تمرکز امروز روی {name}ـه. دفعه‌ی قبل {w} کیلو {r} تکرار زدی — امروز هدف {pw} کیلو برای {pr} تکرار.',
    's.briefFresh':
      'جلسه‌ی {day}: امروز با {name} شروع می‌کنیم. سبک شروع کن و فرم رو پیدا کن.',

    // ---- post session ----
    'p.monster':
      'حجم امروز {v} کیلو — {p}٪ بیشتر از میانگینت! دمت گرم. فردا رو جدی استراحت کن.',
    'p.solid': 'جلسه‌ی تمیز و کامل — {v} کیلو حجم. همین ثباته که نتیجه می‌ده.',
    'p.light': 'امروز سبک بود ({v} کیلو) ولی اومدی — همین از نرفتن خیلی بهتره.',
    'p.pr': 'و یه رکورد جدید هم ثبت شد: {name} {w} کیلو!',
    'p.recovery': 'ریکاوری: پروتئین، آب، خواب. جلسه‌ی بعدی رو سبک شروع کن.',
  },
  en: {
    // ---- banner ----
    'b.noProgram':
      "You don't have a program yet — two minutes, tell me your goal and I'll build it. Let's go.",
    'b.welcomeBack':
      'You were away for {n} days; what matters is you came back. Start light today, your body remembers.',
    'b.missed':
      'You planned {n} session{s} this week and fell behind — life happens. Make up for it today, even half an hour.',
    'b.deload':
      "You've been pushing hard for four weeks. Go lighter this week; a deload isn't laziness, it's part of the plan.",
    'b.today':
      'Today is day {day}. Last time you did {name} at {w} kg for {r} reps — one more rep today?',
    'b.todayFresh':
      'Today is day {day}. Start {name} light and keep your form clean.',
    'b.plateau':
      '{name} has stalled for three sessions. Either go lighter for a week or try a substitute lift.',
    'b.pr': 'New record: {name} at {w} kg! Well done — keep it going.',
    'b.streak': '{n} sessions in a row — this is a habit now, not a decision.',
    'b.goal.fat-loss':
      'Fat loss means burning calories plus enough protein. Add a light walk after training today.',
    'b.goal.muscle':
      'For muscle growth, put a complete protein source in every meal — training is only half the job.',
    'b.goal.strength':
      'Strength is built with low reps and full rest; no rushing between heavy sets.',
    'b.goal.fitness':
      'Fitness is about consistency. Showing up regularly means you are doing it right.',
    'b.tip.0': 'Do not forget water — dehydration hits your strength directly.',
    'b.tip.1': 'Five minutes of warm-up removes half of all injuries.',
    'b.tip.2': 'Little sleep means little recovery. Go to bed earlier tonight.',
    'b.tip.3': 'Morning energy is high — put your heaviest lift first.',
    'b.tip.4': 'End of a long day and tired? Go light, but go.',
    'b.tip.5': 'Clean form with less weight always beats ugly form with more.',
    'b.tip.6': 'Put the phone away between sets; focus means better reps.',
    'b.tip.7': 'Take post-workout protein seriously — muscle is built with it.',

    // ---- daily tips ----
    't.restDay':
      'Rest day — a light walk or a few minutes of stretching speeds up recovery.',
    't.protein.muscle':
      'Put a complete protein source in every meal; training stimulates muscle, food builds it.',
    't.protein.fat-loss':
      'High protein saves you while cutting — it keeps muscle on and keeps you full.',
    't.protein.strength':
      'Eat a light carb meal before training; heavy-set energy comes from there.',
    't.protein.fitness': 'Enough water and regular sleep — half of fitness is just those two.',
    't.water': 'At least 8 glasses of water today — more while training.',
    't.cue.chest': 'In {name}: keep your chest up and lock your shoulders back.',
    't.cue.back': 'In {name}: squeeze your shoulder blades together first, then pull.',
    't.cue.legs': 'In {name}: knees track over toes, back stays flat.',
    't.cue.shoulders': 'In {name}: do not lock your elbows fully; stay in control.',
    't.cue.default': 'In {name}: slow and controlled; a clean rep beats an extra rep.',
    't.sleep': 'You trained heavy this week — enough sleep tonight is the best supplement.',

    // ---- session brief ----
    's.brief': 'Day {day}: today is about {name}. Last time: {w} kg for {r} reps.',
    's.briefProg':
      'Day {day}: today is about {name}. Last time: {w} kg for {r} reps — target {pw} kg for {pr} reps.',
    's.briefFresh': 'Day {day}: starting with {name} today. Go light and find your form.',

    // ---- post session ----
    'p.monster':
      'Today: {v} kg — {p}% above your average! Well done. Take tomorrow seriously off.',
    'p.solid': 'Clean, complete session — {v} kg of volume. This consistency is what works.',
    'p.light': 'Light day ({v} kg), but you showed up — far better than skipping.',
    'p.pr': 'And a new record logged: {name} at {w} kg!',
    'p.recovery': 'Recovery: protein, water, sleep. Start the next session light.',
  },
};

/* ============================================================
 * Rendering: fill {tokens} and localize digits for Persian.
 * ============================================================ */

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function faDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]).replace(/\./g, '٫');
}

function fmtNum(n: number | string): string {
  if (typeof n === 'string') return n;
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

/** Render a CoachMessage to a display string in the given language. */
export function renderCoachMessage(lang: 'fa' | 'en', msg: CoachMessage): string {
  const dict = COACH_KEYS[lang] ?? COACH_KEYS.en;
  let text = dict[msg.key] ?? COACH_KEYS.en[msg.key] ?? msg.key;
  for (const [k, v] of Object.entries(msg.params)) {
    // the `name` param always carries an exercise key — resolve it per language
    const val = k === 'name' ? exerciseName(String(v), lang) : fmtNum(v);
    text = text.split(`{${k}}`).join(lang === 'fa' ? faDigits(val) : val);
  }
  return text;
}

/* ============================================================
 * Small pure helpers (also exported for the Progress tab).
 * ============================================================ */

const DAY_MS = 86400_000;

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

/** Whole days between two dates (b - a). */
export function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

/** Total lifted volume of one session, in kg. */
export function sessionVolume(s: WorkoutSession): number {
  let v = 0;
  for (const set of s.sets) v += set.reps * set.weightKg;
  return Math.round(v);
}

/** Mean volume across sessions that actually logged sets. */
export function averageVolume(sessions: WorkoutSession[]): number {
  const vols = sessions.map(sessionVolume).filter((v) => v > 0);
  if (vols.length === 0) return 0;
  return Math.round(vols.reduce((a, b) => a + b, 0) / vols.length);
}

/** Best single set (heaviest; tie → most reps) for an exercise. */
export function bestSetForExercise(
  exerciseKey: string,
  sessions: WorkoutSession[],
): { weightKg: number; reps: number } | null {
  let best: { weightKg: number; reps: number } | null = null;
  for (const s of sessions) {
    for (const set of s.sets) {
      if (set.exerciseKey !== exerciseKey) continue;
      if (
        !best ||
        set.weightKg > best.weightKg ||
        (set.weightKg === best.weightKg && set.reps > best.reps)
      ) {
        best = { weightKg: set.weightKg, reps: set.reps };
      }
    }
  }
  return best;
}

/** Consecutive days with ≥1 session, ending today or yesterday. */
export function computeStreak(sessions: WorkoutSession[]): number {
  const days = new Set(sessions.filter((s) => s.sets.length > 0).map((s) => s.startedAt.slice(0, 10)));
  if (days.size === 0) return 0;
  const today = startOfDay(new Date());
  let cursor = new Date(today);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (!days.has(iso(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS); // allow "trained yesterday"
    if (!days.has(iso(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(iso(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return streak;
}

/**
 * Plateau check: the heaviest weight for `exerciseKey` is identical across
 * the last `windowSessions` sessions that contain the lift, with no rep
 * improvement either. Returns details for the Progress tab.
 */
export function detectPlateau(
  exerciseKey: string,
  sessions: WorkoutSession[],
  windowSessions = 3,
): { plateau: boolean; bestWeightKg: number; sessionsChecked: number } {
  const withLift = sessions.filter((s) => s.sets.some((x) => x.exerciseKey === exerciseKey));
  const recent = withLift.slice(-windowSessions);
  if (recent.length < windowSessions) return { plateau: false, bestWeightKg: 0, sessionsChecked: recent.length };
  const bests = recent.map((s) => {
    const sets = s.sets.filter((x) => x.exerciseKey === exerciseKey);
    return sets.reduce((b, x) =>
      x.weightKg > b.weightKg || (x.weightKg === b.weightKg && x.reps > b.reps) ? x : b,
    );
  });
  const w0 = bests[0].weightKg;
  const sameWeight = bests.every((b) => b.weightKg === w0);
  const repsImproving = bests[bests.length - 1].reps > bests[0].reps;
  return {
    plateau: sameWeight && !repsImproving,
    bestWeightKg: w0,
    sessionsChecked: recent.length,
  };
}

/**
 * Deload signal: ≥4 weeks of history, each of the last 4 weeks has ≥2
 * sessions, and last week's volume is still ≥90% of the recent max —
 * i.e. the user has been hammering it without a back-off week.
 */
export function detectDeloadNeed(sessions: WorkoutSession[]): boolean {
  if (sessions.length === 0) return false;
  const now = Date.now();
  // 4 recent calendar weeks, each with ≥2 sessions, volume still near max.
  const vols = [0, 0, 0, 0];
  const counts = [0, 0, 0, 0];
  for (const s of sessions) {
    const ageW = Math.floor((now - new Date(s.startedAt).getTime()) / (7 * DAY_MS));
    if (ageW >= 0 && ageW < 4) {
      const i = 3 - ageW;
      vols[i] += sessionVolume(s);
      counts[i] += 1;
    }
  }
  if (counts.some((c) => c < 2)) return false;
  const recentMax = Math.max(vols[0], vols[1], vols[2]);
  return recentMax > 0 && vols[3] >= 0.9 * recentMax;
}

/** Sessions in the last 7 days vs the weekly target. Negative = behind. */
export function weeklyAdherence(sessions: WorkoutSession[], daysPerWeek: number): {
  done: number;
  target: number;
  behind: number;
} {
  const cutoff = Date.now() - 7 * DAY_MS;
  const done = sessions.filter(
    (s) => new Date(s.startedAt).getTime() >= cutoff && s.sets.length > 0,
  ).length;
  return { done, target: daysPerWeek, behind: daysPerWeek - done };
}

/** PRs set in the last `days` days, newest first. */
export function getRecentPRs(sessions: WorkoutSession[], days = 7): PersonalRecord[] {
  const cutoff = Date.now() - days * DAY_MS;
  const bestBefore = new Map<string, number>();
  const prs: PersonalRecord[] = [];
  const ordered = [...sessions].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );
  for (const s of ordered) {
    const t = new Date(s.startedAt).getTime();
    for (const set of s.sets) {
      const prev = bestBefore.get(set.exerciseKey) ?? 0;
      if (set.weightKg > prev) {
        bestBefore.set(set.exerciseKey, set.weightKg);
        if (t >= cutoff) {
          prs.push({
            exerciseKey: set.exerciseKey,
            bestWeightKg: set.weightKg,
            bestReps: set.reps,
            achievedOn: s.startedAt,
          });
        }
      }
    }
  }
  return prs.reverse();
}

function exerciseName(key: string, lang: 'fa' | 'en'): string {
  const e = getExercise(key);
  if (!e) return key;
  return lang === 'fa' ? e.nameFa : e.nameEn;
}

const FA_ORDINALS = ['اول', 'دوم', 'سوم', 'چهارم', 'پنجم', 'ششم', 'هفتم'];
const EN_ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

function dayOrdinal(i: number, lang: 'fa' | 'en'): string {
  const arr = lang === 'fa' ? FA_ORDINALS : EN_ORDINALS;
  return arr[Math.min(Math.max(i, 0), arr.length - 1)];
}

/* ============================================================
 * Context assembly — reads the store defensively (fail open),
 * so the banner can never crash the app.
 * ============================================================ */

const LAST_KEY_STORAGE = 'fitai.coachLastKey';

export function getLastBannerKey(): string | null {
  try {
    return localStorage.getItem(LAST_KEY_STORAGE);
  } catch {
    return null;
  }
}

export function rememberBannerKey(key: string): void {
  try {
    localStorage.setItem(LAST_KEY_STORAGE, key);
  } catch {
    /* fail open */
  }
}

/**
 * Assemble a CoachContext from the local store. Safe to call anywhere —
 * every read is guarded and the engine degrades gracefully to empty data.
 */
export function buildCoachContext(): CoachContext {
  // Defensive: every store read is guarded so a broken store can never
  // crash the banner — the engine just degrades to empty data.
  let plan: WorkoutProgram | null = null;
  let allSessions: WorkoutSession[] = [];
  try {
    plan = getActiveProgram();
  } catch {
    plan = null;
  }
  try {
    allSessions = getSessions();
  } catch {
    allSessions = [];
  }

  const now = new Date();
  const cutoff = now.getTime() - 30 * DAY_MS;
  const sessions = allSessions
    .filter((s) => new Date(s.startedAt).getTime() >= cutoff)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  const withSets = sessions.filter((s) => s.sets.length > 0);
  const lastSession = withSets.length > 0 ? withSets[withSets.length - 1] : null;

  // Fixed weekly schedule: training days are fixed weekdays, other days
  // are rest days (never a rotating weekday → no workout preview on a
  // rest day). Deload weeks keep the same day; only set counts shrink,
  // and the banner previews the unscaled day.
  let todayPlanDay: ProgramExercise[] | null = null;
  let todayPlanDayIndex: number | null = null;
  if (plan && plan.days.length > 0) {
    const sched = getSchedule(plan, now, sessions);
    if (sched.kind === 'train' && sched.dayIndex != null) {
      todayPlanDayIndex = sched.dayIndex;
      const day = plan.days[sched.dayIndex];
      todayPlanDay = day && day.length > 0 ? day : null;
    }
  }

  let level = 'new';
  try {
    const stored = localStorage.getItem('fitai.profile.level');
    if (stored) level = stored;
  } catch {
    /* ignore */
  }

  return {
    now,
    userProfile: {
      goal: plan?.goal ?? 'fitness',
      level,
      daysPerWeek: plan?.daysPerWeek ?? 3,
    },
    plan,
    todayPlanDay,
    todayPlanDayIndex,
    sessions,
    streak: computeStreak(sessions),
    recentPRs: getRecentPRs(sessions, 7),
    lastSession,
    lastShownKey: getLastBannerKey(),
  };
}

/* ============================================================
 * 1. Banner message — the single most relevant thing right now.
 * Priority: missed day > today preview > plateau > PR > streak >
 * goal tip > generic rotation. Never repeats the last shown key.
 * ============================================================ */

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 100];

const GENERIC_TIPS_ALL = ['b.tip.0', 'b.tip.1', 'b.tip.2', 'b.tip.5', 'b.tip.6', 'b.tip.7'];
const GENERIC_TIPS_MORNING = ['b.tip.3'];
const GENERIC_TIPS_EVENING = ['b.tip.4'];

function pickGenericTip(ctx: CoachContext): CoachMessage {
  const hour = ctx.now.getHours();
  const pool = [
    ...GENERIC_TIPS_ALL,
    ...(hour >= 5 && hour < 12 ? GENERIC_TIPS_MORNING : []),
    ...(hour >= 18 || hour < 5 ? GENERIC_TIPS_EVENING : []),
  ];
  const dayOfYear = Math.floor(
    (startOfDay(ctx.now).getTime() - new Date(ctx.now.getFullYear(), 0, 0).getTime()) / DAY_MS,
  );
  // rotate daily; skip the key shown last time
  for (let i = 0; i < pool.length; i += 1) {
    const key = pool[(dayOfYear + i) % pool.length];
    if (key !== ctx.lastShownKey) return { key, params: {}, tone: 'info' };
  }
  return { key: pool[dayOfYear % pool.length], params: {}, tone: 'info' };
}

export function getBannerMessage(ctx: CoachContext): CoachMessage {
  const last = ctx.lastShownKey;
  const pick = (m: CoachMessage | null): CoachMessage | null =>
    m && m.key !== last ? m : null;

  const candidates: Array<() => CoachMessage | null> = [
    // 0. No program yet — onboarding nudge (keeps the old banner behavior).
    () => (!ctx.plan ? { key: 'b.noProgram', params: {}, tone: 'nudge' as CoachTone } : null),

    // 1. First session back after a 7+ day gap.
    () => {
      if (!ctx.lastSession) return null;
      const gap = dayDiff(new Date(ctx.lastSession.startedAt), ctx.now);
      if (gap >= 7 && ctx.sessions.length >= 1) {
        return { key: 'b.welcomeBack', params: { n: gap }, tone: 'info' };
      }
      return null;
    },

    // 2. Missed scheduled day(s) this week — warm, never shaming.
    () => {
      if (!ctx.lastSession) return null;
      const { behind, target } = weeklyAdherence(ctx.sessions, ctx.userProfile.daysPerWeek);
      const hoursSince = (ctx.now.getTime() - new Date(ctx.lastSession.startedAt).getTime()) / 3600000;
      if (target > 0 && behind > 0 && hoursSince > 30) {
        return { key: 'b.missed', params: { n: behind, s: behind === 1 ? '' : 's' }, tone: 'nudge' };
      }
      return null;
    },

    // 3. Deload suggestion after 4 hard weeks.
    () => (detectDeloadNeed(ctx.sessions) ? { key: 'b.deload', params: {}, tone: 'info' } : null),

    // 4. Today is a training day — preview with last numbers.
    () => {
      if (!ctx.todayPlanDay || ctx.todayPlanDayIndex == null) return null;
      const main = ctx.todayPlanDay[0];
      const best = bestSetForExercise(main.exerciseKey, ctx.sessions);
      const day = dayOrdinal(ctx.todayPlanDayIndex, 'fa');
      if (best) {
        return {
          key: 'b.today',
          params: { day, name: main.exerciseKey, w: best.weightKg, r: best.reps },
          tone: 'info',
        };
      }
      return {
        key: 'b.todayFresh',
        params: { day, name: main.exerciseKey },
        tone: 'info',
      };
    },

    // 5. Plateau on the lift that matters most right now.
    () => {
      const keys: string[] = [];
      if (ctx.todayPlanDay?.[0]) keys.push(ctx.todayPlanDay[0].exerciseKey);
      if (ctx.lastSession) {
        for (const s of ctx.lastSession.sets) {
          if (!keys.includes(s.exerciseKey)) keys.push(s.exerciseKey);
        }
      }
      for (const k of keys.slice(0, 3)) {
        const d = detectPlateau(k, ctx.sessions);
        if (d.plateau) return { key: 'b.plateau', params: { name: k }, tone: 'nudge' };
      }
      return null;
    },

    // 6. New PR celebration.
    () => {
      const pr = ctx.recentPRs[0];
      if (!pr) return null;
      return {
        key: 'b.pr',
        params: { name: pr.exerciseKey, w: pr.bestWeightKg, r: pr.bestReps },
        tone: 'praise',
      };
    },

    // 7. Streak milestone.
    () => {
      if (STREAK_MILESTONES.includes(ctx.streak) && ctx.streak > 0) {
        return { key: 'b.streak', params: { n: ctx.streak }, tone: 'praise' };
      }
      return null;
    },

    // 8. Goal-aligned tip.
    () => {
      const g = ctx.userProfile.goal;
      const key = `b.goal.${g}`;
      if ((COACH_KEYS.en as Dict)[key]) return { key, params: {}, tone: 'info' };
      return { key: 'b.goal.fitness', params: {}, tone: 'info' };
    },
  ];

  for (const c of candidates) {
    const m = pick(c());
    if (m) return m;
  }
  // 9. Generic rotation (time-of-day aware), lastShownKey already handled inside.
  return pickGenericTip(ctx);
}

/* ============================================================
 * 2. Daily tips for Home — 2–3 short, actionable.
 * ============================================================ */

const CUE_BY_MUSCLE: Record<string, string> = {
  chest: 't.cue.chest',
  back: 't.cue.back',
  legs: 't.cue.legs',
  glutes: 't.cue.legs',
  shoulders: 't.cue.shoulders',
};

export function getDailyTips(ctx: CoachContext): CoachMessage[] {
  const tips: CoachMessage[] = [];
  const isTrainingDay = !!ctx.todayPlanDay && ctx.todayPlanDay.length > 0;

  if (!isTrainingDay) {
    tips.push({ key: 't.restDay', params: {}, tone: 'info' });
  }

  const g = ctx.userProfile.goal;
  const proteinKey = `t.protein.${g}`;
  tips.push({
    key: (COACH_KEYS.en as Dict)[proteinKey] ? proteinKey : 't.protein.fitness',
    params: {},
    tone: 'info',
  });

  if (isTrainingDay && ctx.todayPlanDay) {
    const main = ctx.todayPlanDay[0];
    const muscle = getExercise(main.exerciseKey)?.muscle;
    const cueKey = (muscle && CUE_BY_MUSCLE[muscle]) || 't.cue.default';
    tips.push({ key: cueKey, params: { name: main.exerciseKey }, tone: 'info' });
  }

  // Fill up to 3: sleep nudge after heavy weeks, otherwise water.
  while (tips.length < 3) {
    if (!isTrainingDay && detectDeloadNeed(ctx.sessions)) {
      tips.push({ key: 't.sleep', params: {}, tone: 'info' });
    } else {
      tips.push({ key: 't.water', params: {}, tone: 'info' });
    }
  }

  return tips.slice(0, 3);
}

/* ============================================================
 * 3. Pre-workout briefing.
 * Progression comes from src/lib/program.ts `nextProgression` when that
 * module exists; the import is fully defensive (URL-based, @vite-ignore,
 * fire-and-forget) so a missing file is silently skipped.
 * ============================================================ */

type ProgressionFn = (
  exerciseKey: string,
  recentBestSets: Array<{ weightKg: number; reps: number }>,
) => { weightKg: number; reps: number } | null;

let progressionFn: ProgressionFn | null = null;
let progressionTried = false;

function tryLoadProgression(): void {
  if (progressionTried || typeof window === 'undefined') return;
  progressionTried = true;
  try {
    const url = new URL('./program.js', import.meta.url).href;
    void import(/* @vite-ignore */ url)
      .then((m: unknown) => {
        const fn = (m as { nextProgression?: unknown }).nextProgression;
        if (typeof fn === 'function') progressionFn = fn as ProgressionFn;
      })
      .catch(() => {
        /* program.ts absent — progression suggestions skipped */
      });
  } catch {
    /* skip */
  }
}

export interface ProgressionHint {
  weightKg: number;
  reps: number;
}

export function getSessionBrief(
  ctx: CoachContext,
  planDay: ProgramExercise[],
  progressionHint?: ProgressionHint | null,
): CoachMessage {
  tryLoadProgression();
  const dayIdx = ctx.todayPlanDayIndex ?? 0;
  const main = planDay[0];
  const day = dayOrdinal(dayIdx, 'fa');
  if (!main) {
    return { key: 's.briefFresh', params: { day, name: '—' }, tone: 'info' };
  }

  const best = bestSetForExercise(main.exerciseKey, ctx.sessions);
  if (!best) {
    return { key: 's.briefFresh', params: { day, name: main.exerciseKey }, tone: 'info' };
  }

  // Progression: explicit hint wins; otherwise the (maybe absent) program.ts helper.
  let prog: ProgressionHint | null = progressionHint ?? null;
  if (!prog && progressionFn) {
    try {
      const recent = ctx.sessions
        .filter((s) => s.sets.some((x) => x.exerciseKey === main.exerciseKey))
        .slice(-5)
        .map((s) => {
          const b = bestSetForExercise(main.exerciseKey, [s]);
          return b ?? { weightKg: 0, reps: 0 };
        })
        .filter((b) => b.weightKg > 0);
      prog = progressionFn(main.exerciseKey, recent);
    } catch {
      prog = null;
    }
  }

  if (prog && prog.weightKg > 0) {
    return {
      key: 's.briefProg',
      params: {
        day,
        name: main.exerciseKey,
        w: best.weightKg,
        r: best.reps,
        pw: prog.weightKg,
        pr: prog.reps,
      },
      tone: 'info',
    };
  }
  return {
    key: 's.brief',
    params: { day, name: main.exerciseKey, w: best.weightKg, r: best.reps },
    tone: 'info',
  };
}

/* ============================================================
 * 4. Post-session message — praise scaled to effort, PR callouts,
 * recovery note. Returns 1–3 messages (main + PRs + recovery).
 * ============================================================ */

export function getPostSessionMessage(
  session: WorkoutSession,
  ctx: CoachContext,
): CoachMessage[] {
  const out: CoachMessage[] = [];
  const vol = sessionVolume(session);
  const peers = ctx.sessions.filter((s) => s.id !== session.id);
  const avg = averageVolume(peers.length > 0 ? peers.slice(-10) : []);
  const ratio = avg > 0 ? vol / avg : 1;

  if (ratio >= 1.15 && vol > 0) {
    out.push({
      key: 'p.monster',
      params: { v: vol, p: Math.round((ratio - 1) * 100) },
      tone: 'praise',
    });
  } else if (ratio >= 0.8 || avg === 0) {
    out.push({ key: 'p.solid', params: { v: vol }, tone: 'praise' });
  } else {
    // Honest, warm — a light day is not a failure.
    out.push({ key: 'p.light', params: { v: vol }, tone: 'info' });
  }

  // PR callouts: lifts in this session that beat every earlier session.
  const before = new Map<string, number>();
  for (const s of peers) {
    for (const set of s.sets) {
      const b = before.get(set.exerciseKey) ?? 0;
      if (set.weightKg > b) before.set(set.exerciseKey, set.weightKg);
    }
  }
  const seen = new Set<string>();
  for (const set of session.sets) {
    const prev = before.get(set.exerciseKey) ?? 0;
    if (set.weightKg > prev && !seen.has(set.exerciseKey)) {
      seen.add(set.exerciseKey);
      if (out.length < 3) {
        out.push({
          key: 'p.pr',
          params: { name: set.exerciseKey, w: set.weightKg },
          tone: 'praise',
        });
      }
    }
  }

  // Recovery note after a monster session, a very long one, or late at night.
  const hour = new Date(session.finishedAt ?? session.startedAt).getHours();
  if (ratio >= 1.15 || session.sets.length >= 24 || hour >= 21) {
    out.push({ key: 'p.recovery', params: {}, tone: 'info' });
  }

  return out;
}

/* ============================================================
 * Name resolution helper for UI components.
 * ============================================================ */

/** Display name for an exercise key in the given language. */
export function coachExerciseName(key: string, lang: 'fa' | 'en'): string {
  return exerciseName(key, lang);
}
