/**
 * اپ هوشمند بدنسازی — Iranian food log (first-priority, local-first).
 *
 * A small, original catalog of everyday Iranian foods with REAL units
 * (سیخ، کاسه، کف دست، نان) alongside grams — never forced decimal
 * grams. Calories are general public estimates ("برآوردی"), not a
 * personal target, diagnosis, or recommendation: the log only totals
 * what the user recorded today. Everything lives in localStorage;
 * there is no account, no server, and no network call.
 *
 * kcalPerUnit is an estimate for one real unit; gramsPerUnit lets the
 * same food be logged in grams (kcal scales proportionally). Custom
 * entries let the user log any food in grams with their own estimate.
 */

export interface FoodItem {
  key: string;
  nameFa: string;
  nameEn: string;
  unitFa: string;
  unitEn: string;
  gramsPerUnit: number;
  kcalPerUnit: number;
}

export const IRANIAN_FOODS: FoodItem[] = [
  { key: 'kabab-koobideh', nameFa: 'کباب کوبیده', nameEn: 'Kabab Koobideh', unitFa: 'سیخ', unitEn: 'skewer', gramsPerUnit: 100, kcalPerUnit: 250 },
  { key: 'joojeh-kabab', nameFa: 'جوجه کباب', nameEn: 'Joojeh Kabab', unitFa: 'سیخ', unitEn: 'skewer', gramsPerUnit: 120, kcalPerUnit: 200 },
  { key: 'chelo', nameFa: 'چلو (برنج پخته)', nameEn: 'Chelo (cooked rice)', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 200, kcalPerUnit: 260 },
  { key: 'khoresh-gheimeh', nameFa: 'خورشت قیمه', nameEn: 'Khoresh Gheimeh', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 250, kcalPerUnit: 300 },
  { key: 'khoresh-ghormeh', nameFa: 'خورشت قرمه‌سبزی', nameEn: 'Khoresh Ghormeh Sabzi', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 250, kcalPerUnit: 280 },
  { key: 'chicken-breast', nameFa: 'سینه مرغ', nameEn: 'Chicken breast', unitFa: 'کف دست', unitEn: 'palm', gramsPerUnit: 100, kcalPerUnit: 165 },
  { key: 'sangak', nameFa: 'نان سنگک', nameEn: 'Sangak bread', unitFa: 'نان', unitEn: 'bread', gramsPerUnit: 100, kcalPerUnit: 260 },
  { key: 'lavash', nameFa: 'نان لواش', nameEn: 'Lavash bread', unitFa: 'نان', unitEn: 'bread', gramsPerUnit: 50, kcalPerUnit: 140 },
  { key: 'mast', nameFa: 'ماست', nameEn: 'Yogurt', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 150, kcalPerUnit: 90 },
  { key: 'salad-shirazi', nameFa: 'سالاد شیرازی', nameEn: 'Salad Shirazi', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 150, kcalPerUnit: 60 },
  { key: 'egg', nameFa: 'تخم‌مرغ', nameEn: 'Egg', unitFa: 'عدد', unitEn: 'piece', gramsPerUnit: 50, kcalPerUnit: 70 },
  { key: 'adas-polo', nameFa: 'عدس‌پلو', nameEn: 'Adas Polo', unitFa: 'کاسه', unitEn: 'bowl', gramsPerUnit: 220, kcalPerUnit: 320 },
];

export function foodByKey(key: string): FoodItem | undefined {
  return IRANIAN_FOODS.find((f) => f.key === key);
}

/** kcal for a quantity in real units (estimate). */
export function kcalForUnits(food: FoodItem, qty: number): number {
  return Math.round(food.kcalPerUnit * qty);
}

/** kcal for a quantity in grams, scaled from the per-unit estimate. */
export function kcalForGrams(food: FoodItem, grams: number): number {
  if (food.gramsPerUnit <= 0) return 0;
  return Math.round((food.kcalPerUnit / food.gramsPerUnit) * grams);
}

/** Meal slot for the meal-by-meal diary. Absent = logged before meals
 * existed (e.g. old entries, voice entries) — shown under "other". */
export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLogEntry {
  id: string;
  date: string; // YYYY-MM-DD, local date
  meal?: MealKey;
  foodKey: string | null; // null = custom entry
  nameFa: string;
  nameEn: string;
  qty: number;
  unitFa: string;
  unitEn: string;
  grams: number;
  kcal: number;
  /**
   * Optional meal photo, downscaled (max 800px, JPEG) and capped in
   * size before storage — a reviewable memory of the meal, never a
   * source of invented nutrition data. The photo does not change the
   * calories; the user enters those.
   */
  photoDataUrl?: string;
}

const LOG_KEY = 'fitai.foodLog';

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `food-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

export function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readLog(): FoodLogEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(LOG_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FoodLogEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLog(entries: FoodLogEntry[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LOG_KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable — fail open */
  }
}

export function getFoodLog(): FoodLogEntry[] {
  return readLog();
}

export function getTodayFoodLog(): FoodLogEntry[] {
  const today = localDateString();
  return readLog().filter((e) => e.date === today);
}

export function addFoodLogEntry(entry: Omit<FoodLogEntry, 'id' | 'date'>, date = localDateString()): FoodLogEntry {
  const full: FoodLogEntry = { ...entry, id: uid(), date };
  writeLog([...readLog(), full]);
  return full;
}

export function removeFoodLogEntry(id: string): void {
  writeLog(readLog().filter((e) => e.id !== id));
}

/** Change an entry's quantity, rescaling its calories proportionally
 * from the stored per-unit value (never re-guessed from the catalog). */
export function updateFoodLogEntryQty(id: string, qty: number): void {
  if (!(qty > 0)) return;
  writeLog(readLog().map((e) => {
    if (e.id !== id) return e;
    const perUnit = e.qty > 0 ? e.kcal / e.qty : e.kcal;
    return { ...e, qty, kcal: Math.round(perUnit * qty), grams: Math.round((e.qty > 0 ? e.grams / e.qty : 0) * qty) };
  }));
}

/** Move an entry into a meal slot (e.g. a voice-logged item). */
export function setFoodLogEntryMeal(id: string, meal: MealKey): void {
  writeLog(readLog().map((e) => (e.id === id ? { ...e, meal } : e)));
}

export function todayFoodKcal(): number {
  return getTodayFoodLog().reduce((sum, e) => sum + e.kcal, 0);
}
