/**
 * Musclepro — day meal plan, meal redistribution, market shopping list
 * (second-priority dossier items, original implementation).
 *
 * A day plan is a list of foods per meal group (breakfast / lunch /
 * dinner / snack) with quantities in real units. Calories are general
 * estimates only — the plan never prescribes a personal target and
 * never diagnoses anything.
 *
 * Redistribution (4eat idea, done honestly): if the user marks a meal
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
