/**
 * Musclepro — food depth: barcode foods, recent foods, saved meals,
 * and allergy/dislike exclusions. All local-first, all original data.
 *
 * Honesty rules that shape this module:
 * - A barcode lookup only ever hits foods the USER saved with that
 *   barcode (custom foods) — the local food database carries no
 *   manufacturer barcodes, and inventing barcode → product mappings
 *   would be fake data. A miss offers manual entry, which then
 *   becomes a hit. Live camera scanning is NOT in this module: no
 *   untested native plugin is added and no scan is faked; the entry
 *   + lookup flow below is the honest, working part, and camera
 *   scanning stays a device-tested plugin task.
 * - A million-food database is NOT built here and must not be
 *   faked: the local database stays the curated 134-food set plus
 *   the user's own custom foods. A large database is a server-phase
 *   job (server-delivered table with the same entry shape).
 * - All calories are GENERAL ESTIMATES, never a personal diagnosis
 *   or prescription. Micronutrients are NOT in the local database:
 *   nutrient views must say "not recorded" for them, never invent
 *   values.
 */

import { FOOD_DB, type FoodDBEntry } from './foodDB';
import { addFoodLogEntry, getFoodLog, type FoodLogEntry } from './food';

/* ------------------------- custom barcoded foods ------------------------- */

export interface CustomFood {
  barcode: string; // digits as typed, spaces/dashes stripped on save
  nameFa: string;
  nameEn: string;
  unitFa: string;
  unitEn: string;
  gramsPerUnit: number;
  kcalPerUnit: number;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

const CUSTOM_KEY = 'fitai.customFoods';

export function normalizeBarcode(code: string): string {
  return code.replace(/[\s-]/g, '').trim();
}

function readCustomFoods(): CustomFood[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as CustomFood[]) : [];
  } catch {
    return [];
  }
}

export function getCustomFoods(): CustomFood[] {
  return readCustomFoods();
}

/** Save (or replace, by barcode) a user-entered barcoded food. */
export function saveCustomFood(food: CustomFood): CustomFood[] {
  const norm = normalizeBarcode(food.barcode);
  if (!norm) return readCustomFoods();
  const next = readCustomFoods().filter((f) => normalizeBarcode(f.barcode) !== norm);
  next.push({ ...food, barcode: norm });
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Lookup a barcode in the LOCAL database: user-saved foods only. */
export function lookupBarcode(code: string): CustomFood | null {
  const norm = normalizeBarcode(code);
  if (!norm) return null;
  return readCustomFoods().find((f) => normalizeBarcode(f.barcode) === norm) ?? null;
}

/* ------------------------------ recent foods ------------------------------ */

export interface RecentFood {
  foodKey: string | null;
  nameFa: string;
  nameEn: string;
  qty: number;
  unitFa: string;
  unitEn: string;
  grams: number;
  kcal: number;
}

/** Most-recent unique foods from the whole log history (not just today). */
export function getRecentFoods(limit = 8): RecentFood[] {
  const seen = new Set<string>();
  const out: RecentFood[] = [];
  const log = [...getFoodLog()].reverse(); // newest first
  for (const e of log) {
    const key = e.foodKey ?? `name:${e.nameFa}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      foodKey: e.foodKey,
      nameFa: e.nameFa,
      nameEn: e.nameEn,
      qty: e.qty,
      unitFa: e.unitFa,
      unitEn: e.unitEn,
      grams: e.grams,
      kcal: e.kcal,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** One-tap re-add of a recent food, with its last portion. */
export function readdRecentFood(food: RecentFood): FoodLogEntry {
  return addFoodLogEntry({
    foodKey: food.foodKey,
    nameFa: food.nameFa,
    nameEn: food.nameEn,
    qty: food.qty,
    unitFa: food.unitFa,
    unitEn: food.unitEn,
    grams: food.grams,
    kcal: food.kcal,
  });
}

/* ------------------------------- saved meals ------------------------------ */

export interface SavedMealItem {
  foodKey: string | null;
  nameFa: string;
  nameEn: string;
  qty: number;
  unitFa: string;
  unitEn: string;
  grams: number;
  kcal: number;
}

export interface SavedMeal {
  id: string;
  nameFa: string;
  nameEn: string;
  items: SavedMealItem[];
}

const SAVED_MEALS_KEY = 'fitai.savedMeals';

function readSavedMeals(): SavedMeal[] {
  try {
    const raw = localStorage.getItem(SAVED_MEALS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as SavedMeal[]) : [];
  } catch {
    return [];
  }
}

export function getSavedMeals(): SavedMeal[] {
  return readSavedMeals();
}

export function saveMeal(nameFa: string, items: SavedMealItem[]): SavedMeal | null {
  const name = nameFa.trim();
  if (!name || items.length === 0) return null;
  const meal: SavedMeal = {
    id: `meal-${Date.now()}-${Math.floor(Math.random() * 1e9)}`,
    nameFa: name,
    nameEn: name,
    items,
  };
  try {
    localStorage.setItem(SAVED_MEALS_KEY, JSON.stringify([...readSavedMeals(), meal]));
  } catch {
    /* ignore */
  }
  return meal;
}

export function removeSavedMeal(id: string): void {
  try {
    localStorage.setItem(SAVED_MEALS_KEY, JSON.stringify(readSavedMeals().filter((m) => m.id !== id)));
  } catch {
    /* ignore */
  }
}

/** One-tap re-add of a whole saved meal (each item logged today). */
export function readdSavedMeal(meal: SavedMeal): FoodLogEntry[] {
  return meal.items.map((it) =>
    addFoodLogEntry({
      foodKey: it.foodKey,
      nameFa: it.nameFa,
      nameEn: it.nameEn,
      qty: it.qty,
      unitFa: it.unitFa,
      unitEn: it.unitEn,
      grams: it.grams,
      kcal: it.kcal,
    }),
  );
}

/* ------------------------- allergy/dislike filter ------------------------- */

export interface FoodExclusions {
  foodKeys: string[];
  keywords: string[]; // free-text Persian substrings matched against nameFa
}

const EXCLUSIONS_KEY = 'fitai.foodExclusions';

export function getExclusions(): FoodExclusions {
  try {
    const raw = localStorage.getItem(EXCLUSIONS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === 'object') {
      const p = parsed as Partial<FoodExclusions>;
      return {
        foodKeys: Array.isArray(p.foodKeys) ? p.foodKeys : [],
        keywords: Array.isArray(p.keywords) ? p.keywords : [],
      };
    }
  } catch {
    /* ignore */
  }
  return { foodKeys: [], keywords: [] };
}

export function setExclusions(ex: FoodExclusions): void {
  try {
    localStorage.setItem(
      EXCLUSIONS_KEY,
      JSON.stringify({
        foodKeys: [...new Set(ex.foodKeys)],
        keywords: [...new Set(ex.keywords.map((k) => k.trim()).filter(Boolean))],
      }),
    );
  } catch {
    /* ignore */
  }
}

/** True when a food is removed by the user's exclusion filter. */
export function isFoodExcluded(foodKey: string | null, nameFa: string, ex: FoodExclusions = getExclusions()): boolean {
  if (foodKey && ex.foodKeys.includes(foodKey)) return true;
  return ex.keywords.some((k) => k !== '' && nameFa.includes(k));
}

/* ------------------------------ nutrient view ----------------------------- */

export interface NutrientInfo {
  entry: FoodDBEntry;
  /** Macros may be null in the DB — null means unknown, never zero. */
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
}

/**
 * Resolve a food to its database nutrient record. DB key first, then
 * exact Persian-name match. Returns null when the food is not in the
 * database — callers must then show macros as "not recorded", never
 * guess them from the calorie figure.
 */
export function resolveNutrients(foodKey: string | null, nameFa?: string): NutrientInfo | null {
  let entry: FoodDBEntry | undefined;
  if (foodKey) entry = FOOD_DB.find((f) => f.key === foodKey);
  if (!entry && nameFa) entry = FOOD_DB.find((f) => f.nameFa === nameFa);
  if (!entry) return null;
  return { entry, proteinG: entry.proteinG, carbsG: entry.carbsG, fatG: entry.fatG };
}
