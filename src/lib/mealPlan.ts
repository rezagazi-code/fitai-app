/**
 * Musclepro — day meal plan, meal redistribution, market shopping list
 * (second-priority dossier items, original implementation).
 *
 * A day plan is a list of foods per meal group (breakfast / lunch /
 * dinner / snack) with quantities in real units. Calories are general
 * estimates only — the plan never prescribes a personal target and
 * never diagnoses anything.
 *
 * Redistribution (day-plan idea, done honestly): if the user marks a meal
 * as skipped (only two meals possible today), that meal's estimated
 * calories are spread proportionally over the remaining meals, and the
 * plan says WHY the amounts changed. Totals stay the same; nothing is
 * hidden. A skipped meal can be un-skipped to restore the plan.
 *
 * Shopping list: aggregated from the day plan (and, when the plan is
 * empty, from today's food log), grouped by market section — bakery,
 * protein, vegetables & fruit, dairy, legumes & dried goods, other —
 * with calm checkboxes. No prices: the list is a reminder, not a
 * purchase, and it never claims to order anything.
 */

import { getTodayFoodLog, type FoodLogEntry } from './food';
import { FOOD_DB } from './foodDB';
import { getExclusions, isFoodExcluded, type FoodExclusions } from './foodExtended';

export type MealGroup = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_GROUPS: Array<{ key: MealGroup; fa: string; en: string }> = [
  { key: 'breakfast', fa: 'صبحانه', en: 'Breakfast' },
  { key: 'lunch', fa: 'ناهار', en: 'Lunch' },
  { key: 'dinner', fa: 'شام', en: 'Dinner' },
  { key: 'snack', fa: 'میان‌وعده', en: 'Snack' },
];

export interface PlannedFood {
  foodKey: string | null;
  nameFa: string;
  nameEn: string;
  qty: number;
  unitFa: string;
  unitEn: string;
  grams: number;
  kcal: number;
  section: MarketSection;
}

export type MarketSection =
  | 'bakery'
  | 'protein'
  | 'produce'
  | 'dairy'
  | 'legumes'
  | 'other';

export const MARKET_SECTIONS: Array<{ key: MarketSection; fa: string; en: string }> = [
  { key: 'bakery', fa: 'نانوایی', en: 'Bakery' },
  { key: 'protein', fa: 'پروتئین', en: 'Protein' },
  { key: 'produce', fa: 'سبزی و میوه', en: 'Vegetables & fruit' },
  { key: 'dairy', fa: 'لبنیات', en: 'Dairy' },
  { key: 'legumes', fa: 'خشکبار و حبوبات', en: 'Legumes & dried goods' },
  { key: 'other', fa: 'سایر', en: 'Other' },
];

/** Rough section mapping by food key/name — used only for grouping. */
export function sectionForFood(foodKey: string | null, nameFa: string): MarketSection {
  const k = (foodKey ?? '').toLowerCase();
  const n = nameFa;
  if (/(sangak|lavash|barbari|taftoon|bread|نان)/.test(k + ' ' + n)) return 'bakery';
  if (/(kabab|chicken|meat|fish|egg|مرغ|کباب|گوشت|ماهی|تخم)/.test(k + ' ' + n)) return 'protein';
  if (/(mast|doogh|paneer|milk|cheese|ماست|دوغ|پنیر|شیر)/.test(k + ' ' + n)) return 'dairy';
  if (/(salad|vegetable|fruit|سبزی|میوه|سالاد|خیار|گوجه)/.test(k + ' ' + n)) return 'produce';
  if (/(adas|lentil|bean|nut|عدس|لوبیا|نخود|گردو|بادام|پسته)/.test(k + ' ' + n)) return 'legumes';
  if (/(chelo|rice|برنج|چلو)/.test(k + ' ' + n)) return 'legumes';
  return 'other';
}

export interface DayMealPlan {
  date: string; // YYYY-MM-DD
  meals: Record<MealGroup, PlannedFood[]>;
  skipped: MealGroup[];
  redistributed: boolean;
}

const PLAN_KEY = 'fitai.mealPlan';
const SHOP_CHECKED_KEY = 'fitai.shoppingChecked';

function emptyPlan(date: string): DayMealPlan {
  return { date, meals: { breakfast: [], lunch: [], dinner: [], snack: [] }, skipped: [], redistributed: false };
}

function readPlans(): DayMealPlan[] {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as DayMealPlan[]) : [];
  } catch {
    return [];
  }
}

function writePlans(plans: DayMealPlan[]): void {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
  } catch {
    /* ignore */
  }
}

export function getDayMealPlan(date: string): DayMealPlan {
  return readPlans().find((p) => p.date === date) ?? emptyPlan(date);
}

export function saveDayMealPlan(plan: DayMealPlan): void {
  const all = readPlans().filter((p) => p.date !== plan.date);
  all.push(plan);
  writePlans(all);
}

export function addFoodToMeal(date: string, group: MealGroup, food: Omit<PlannedFood, 'section'>): DayMealPlan {
  const plan = getDayMealPlan(date);
  plan.meals[group] = [
    ...plan.meals[group],
    { ...food, section: sectionForFood(food.foodKey, food.nameFa) },
  ];
  plan.redistributed = false;
  saveDayMealPlan(plan);
  return plan;
}

export function removeFoodFromMeal(date: string, group: MealGroup, index: number): DayMealPlan {
  const plan = getDayMealPlan(date);
  plan.meals[group] = plan.meals[group].filter((_, i) => i !== index);
  plan.redistributed = false;
  saveDayMealPlan(plan);
  return plan;
}

export function mealKcal(foods: PlannedFood[]): number {
  return foods.reduce((n, f) => n + f.kcal, 0);
}

export function dayPlanKcal(plan: DayMealPlan): number {
  return (Object.keys(plan.meals) as MealGroup[]).reduce((n, g) => n + mealKcal(plan.meals[g]), 0);
}

/**
 * Redistribute a skipped meal's calories over the remaining meals.
 * Returns the new plan plus a plain explanation. Quantities scale
 * proportionally; the day total is unchanged (within rounding).
 */
export function redistributeSkippedMeal(
  plan: DayMealPlan,
  skipped: MealGroup,
): { plan: DayMealPlan; explanationFa: string; explanationEn: string } {
  const remaining = (Object.keys(plan.meals) as MealGroup[]).filter((g) => g !== skipped && !plan.skipped.includes(g));
  const skippedKcal = mealKcal(plan.meals[skipped]);
  const remainingKcal = remaining.reduce((n, g) => n + mealKcal(plan.meals[g]), 0);
  const next: DayMealPlan = {
    ...plan,
    meals: { ...plan.meals, [skipped]: [] },
    skipped: [...new Set([...plan.skipped, skipped])],
    redistributed: true,
  };
  if (remaining.length > 0 && remainingKcal > 0 && skippedKcal > 0) {
    const factor = (remainingKcal + skippedKcal) / remainingKcal;
    for (const g of remaining) {
      next.meals[g] = next.meals[g].map((f) => ({
        ...f,
        qty: Math.round(f.qty * factor * 2) / 2,
        grams: Math.round(f.grams * factor),
        kcal: Math.round(f.kcal * factor),
      }));
    }
  }
  saveDayMealPlan(next);
  return {
    plan: next,
    explanationFa: `چون وعده‌ی ${MEAL_GROUPS.find((m) => m.key === skipped)?.fa ?? ''} امروز فرصت نشد، کالری برآوردی آن بین وعده‌های باقی‌مانده تقسیم شد تا مجموع روز همان بماند — نه اینکه حذف شده باشد.`,
    explanationEn: `Because today's ${skipped} meal is not possible, its estimated calories were spread over the remaining meals so the day total stays the same — not deleted.`,
  };
}

export function unskipMeal(plan: DayMealPlan, group: MealGroup): DayMealPlan {
  const next: DayMealPlan = { ...plan, skipped: plan.skipped.filter((g) => g !== group), redistributed: false };
  saveDayMealPlan(next);
  return next;
}

export interface ShoppingItem {
  key: string;
  nameFa: string;
  nameEn: string;
  qty: number;
  unitFa: string;
  unitEn: string;
  section: MarketSection;
}

/** Shopping list from the day plan, falling back to today's food log. */
export function buildShoppingList(date: string): ShoppingItem[] {
  const plan = getDayMealPlan(date);
  const byKey = new Map<string, ShoppingItem>();
  const add = (nameFa: string, nameEn: string, qty: number, unitFa: string, unitEn: string, section: MarketSection, key: string) => {
    const cur = byKey.get(key);
    if (cur && cur.unitFa === unitFa) {
      cur.qty = Math.round((cur.qty + qty) * 2) / 2;
    } else if (!cur) {
      byKey.set(key, { key, nameFa, nameEn, qty, unitFa, unitEn, section });
    } else {
      byKey.set(`${key}-${unitFa}`, { key: `${key}-${unitFa}`, nameFa, nameEn, qty, unitFa, unitEn, section });
    }
  };
  let fromPlan = false;
  for (const g of Object.keys(plan.meals) as MealGroup[]) {
    if (plan.skipped.includes(g)) continue;
    for (const f of plan.meals[g]) {
      fromPlan = true;
      add(f.nameFa, f.nameEn, f.qty, f.unitFa, f.unitEn, f.section, f.foodKey ?? f.nameFa);
    }
  }
  if (!fromPlan) {
    const log: FoodLogEntry[] = getTodayFoodLog();
    for (const e of log) {
      add(e.nameFa, e.nameEn, e.qty, e.unitFa, e.unitEn, sectionForFood(e.foodKey, e.nameFa), e.foodKey ?? e.nameFa);
    }
  }
  return [...byKey.values()].sort((a, b) => a.section.localeCompare(b.section) || a.nameFa.localeCompare(b.nameFa));
}

/* ----------------- full-day plan, substitutes, exclusions ----------------- */

/** Broad food family used ONLY to pick same-family substitutes. */
export type FoodFamily =
  | 'bread' | 'rice' | 'stew' | 'kebab' | 'poultry' | 'meat'
  | 'dairy' | 'fruit' | 'vegetable' | 'legume' | 'nut' | 'drink' | 'other';

export function familyForFood(foodKey: string | null, nameFa: string): FoodFamily {
  const k = (foodKey ?? '').toLowerCase();
  const n = nameFa;
  if (/(nan-|bread|نان)/.test(k + ' ' + n)) return 'bread';
  if (/(chelo|kateh|polo|rice|برنج|چلو|پلو)/.test(k + ' ' + n)) return 'rice';
  if (/(khoresh|ghormeh|fesenjan|gheimeh|ash|abgoosht|dizi|haleem|خورشت|قورمه|فسنجان|قیمه|آش|آبگوشت|دیزی|حلیم)/.test(k + ' ' + n)) return 'stew';
  if (/(kebab|koobideh|barg|chenjeh|کباب|کوبیده|برگ|چنجه)/.test(k + ' ' + n)) return 'kebab';
  if (/(chicken|joojeh|turkey|مرغ|جوجه|بوقلمون)/.test(k + ' ' + n)) return 'poultry';
  if (/(beef|lamb|گوشت)/.test(k + ' ' + n)) return 'meat';
  if (/(mast|doogh|paneer|milk|cheese|ماست|دوغ|پنیر|شیر|کشک|خامه|کره)/.test(k + ' ' + n)) return 'dairy';
  if (/(apple|banana|orange|grape|melon|peach|pear|plum|cherry|strawberry|kiwi|mango|pomegranate|fig|date|سیب|موز|پرتقال|انگور|هندوانه|طالبی|هلو|گلابی|آلو|گیلاس|توت|کیوی|انبه|انار|انجیر|خرما)/.test(k + ' ' + n)) return 'fruit';
  if (/(salad|cucumber|tomato|lettuce|spinach|carrot|onion|eggplant|zucchini|pepper|broccoli|cauliflower|mushroom|corn|green-bean|سالاد|خیار|گوجه|کاهو|اسفناج|هویج|پیاز|بادمجان|کدو|فلفل|بروکلی|گل|قارچ|ذرت)/.test(k + ' ' + n)) return 'vegetable';
  if (/(lentil|chickpea|bean|عدس|لوبیا|نخود|ماش|لپه|بلغور|کینوا)/.test(k + ' ' + n)) return 'legume';
  if (/(walnut|almond|pistachio|hazelnut|cashew|peanut|seed|گردو|بادام|پسته|فندق|تخمه|ارده)/.test(k + ' ' + n)) return 'nut';
  if (/(water|tea|coffee|juice|soda|doogh|آب|چای|قهوه|نوشابه)/.test(k + ' ' + n)) return 'drink';
  return 'other';
}

/**
 * Unlimited substitutes for a planned food: every other database food
 * in the same family, minus the food itself and minus anything the
 * user's allergy/dislike filter removes. Sorted by Persian name.
 */
export function substitutesFor(
  foodKey: string | null,
  nameFa: string,
  ex: FoodExclusions = getExclusions(),
): typeof FOOD_DB {
  const family = familyForFood(foodKey, nameFa);
  return FOOD_DB.filter((f) => {
    if (foodKey && f.key === foodKey) return false;
    if (familyForFood(f.key, f.nameFa) !== family) return false;
    if (isFoodExcluded(f.key, f.nameFa, ex)) return false;
    return true;
  }).sort((a, b) => a.nameFa.localeCompare(b.nameFa));
}

/** Swap one planned row for a substitute, keeping the row's quantity. */
export function substituteInMeal(
  date: string,
  group: MealGroup,
  index: number,
  substituteKey: string,
): DayMealPlan | null {
  const plan = getDayMealPlan(date);
  const row = plan.meals[group][index];
  const sub = FOOD_DB.find((f) => f.key === substituteKey);
  if (!row || !sub) return null;
  plan.meals[group] = plan.meals[group].map((f, i) =>
    i === index
      ? {
          ...f,
          foodKey: sub.key,
          nameFa: sub.nameFa,
          nameEn: sub.nameEn,
          unitFa: sub.unitFa,
          unitEn: sub.unitEn,
          grams: Math.round(sub.gramsPerUnit * f.qty),
          kcal: Math.round(sub.kcalPerUnit * f.qty),
          section: sectionForFood(sub.key, sub.nameFa),
        }
      : f,
  );
  plan.redistributed = false;
  saveDayMealPlan(plan);
  return plan;
}

interface DefaultMealItem {
  key: string;
  qty: number;
}

/** Original full-day composition from the local database (exact units). */
const DEFAULT_DAY: Record<MealGroup, DefaultMealItem[]> = {
  breakfast: [
    { key: 'nan-sangak', qty: 1 },
    { key: 'paneer', qty: 1 },
    { key: 'egg', qty: 2 },
    { key: 'tea', qty: 1 },
  ],
  lunch: [
    { key: 'chelo-sade', qty: 1 },
    { key: 'ghormeh-sabzi', qty: 1 },
    { key: 'salad-shirazi', qty: 1 },
  ],
  dinner: [
    { key: 'chicken-breast', qty: 1 },
    { key: 'nan-lavash', qty: 1 },
    { key: 'mast-khiar', qty: 1 },
  ],
  snack: [
    { key: 'apple', qty: 1 },
    { key: 'walnut', qty: 1 },
  ],
};

export interface DefaultPlanResult {
  plan: DayMealPlan;
  replaced: Array<{ meal: MealGroup; from: string; to: string }>;
  dropped: Array<{ meal: MealGroup; name: string }>;
}

/**
 * Fill today's EMPTY meals with the default full-day plan. Meals that
 * already have foods are left untouched. Excluded foods are replaced
 * with the first non-excluded same-family substitute, or dropped
 * with a note when no substitute exists. Nothing is prescribed: all
 * calories stay general estimates.
 */
export function buildDefaultDayPlan(
  date: string,
  ex: FoodExclusions = getExclusions(),
): DefaultPlanResult {
  const plan = getDayMealPlan(date);
  const replaced: DefaultPlanResult['replaced'] = [];
  const dropped: DefaultPlanResult['dropped'] = [];
  for (const group of Object.keys(DEFAULT_DAY) as MealGroup[]) {
    if (plan.meals[group].length > 0 || plan.skipped.includes(group)) continue;
    for (const item of DEFAULT_DAY[group]) {
      const entry = FOOD_DB.find((f) => f.key === item.key);
      if (!entry) continue;
      if (!isFoodExcluded(entry.key, entry.nameFa, ex)) {
        plan.meals[group].push({
          foodKey: entry.key,
          nameFa: entry.nameFa,
          nameEn: entry.nameEn,
          qty: item.qty,
          unitFa: entry.unitFa,
          unitEn: entry.unitEn,
          grams: Math.round(entry.gramsPerUnit * item.qty),
          kcal: Math.round(entry.kcalPerUnit * item.qty),
          section: sectionForFood(entry.key, entry.nameFa),
        });
        continue;
      }
      const sub = substitutesFor(entry.key, entry.nameFa, ex)[0];
      if (sub) {
        replaced.push({ meal: group, from: entry.nameFa, to: sub.nameFa });
        plan.meals[group].push({
          foodKey: sub.key,
          nameFa: sub.nameFa,
          nameEn: sub.nameEn,
          qty: item.qty,
          unitFa: sub.unitFa,
          unitEn: sub.unitEn,
          grams: Math.round(sub.gramsPerUnit * item.qty),
          kcal: Math.round(sub.kcalPerUnit * item.qty),
          section: sectionForFood(sub.key, sub.nameFa),
        });
      } else {
        dropped.push({ meal: group, name: entry.nameFa });
      }
    }
  }
  plan.redistributed = false;
  saveDayMealPlan(plan);
  return { plan, replaced, dropped };
}

export function getShoppingChecked(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SHOP_CHECKED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export function setShoppingChecked(key: string, checked: boolean): void {
  try {
    const map = getShoppingChecked();
    map[key] = checked;
    localStorage.setItem(SHOP_CHECKED_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}
