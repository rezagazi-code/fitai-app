/**
 * Musclepro — meal-by-meal food diary (replaces the stacked food log
 * as the primary food UI in the Log tab).
 *
 * Why a diary, not a flat list: users skipped the old stacked form
 * (search + chips + nutrients + barcode + recent + saved + photo in
 * one scroll). The diary shows today as four meals — صبحانه / ناهار /
 * شام / میان‌وعده — each with its own entries and calorie subtotal,
 * plus a day total. Repeats cost one tap, never retyping:
 * - "افزودن سریع" chips (recent + most frequent foods) add 1 real
 *   unit instantly to the picked meal.
 * - Per-meal search across the local food database adds 1 unit of the
 *   chosen food to that meal; quantity is then adjustable with −/+.
 * Entries logged before meals existed (old entries, voice entries)
 * appear under "سایر" and can be moved into a meal with one select.
 * Every calorie figure is labelled a general estimate. The voice
 * flow stays one button away (it scrolls to the voice section).
 * Advanced tools (barcode, nutrient detail, saved meals, photo) live
 * in the collapsed "ابزارهای بیشتر" section under the diary — nothing
 * was removed, it is just no longer in the way.
 */

import { useMemo, useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import {
  IRANIAN_FOODS,
  addFoodLogEntry,
  getFoodLog,
  getTodayFoodLog,
  removeFoodLogEntry,
  setFoodLogEntryMeal,
  updateFoodLogEntryQty,
  type FoodLogEntry,
  type MealKey,
} from '../lib/food';
import { FOOD_DB, searchFoodDB } from '../lib/foodDB';

const MEALS: Array<{ key: MealKey; fa: string; en: string }> = [
  { key: 'breakfast', fa: 'صبحانه', en: 'Breakfast' },
  { key: 'lunch', fa: 'ناهار', en: 'Lunch' },
  { key: 'dinner', fa: 'شام', en: 'Dinner' },
  { key: 'snack', fa: 'میان‌وعده', en: 'Snack' },
];

interface QuickSource {
  id: string;
  foodKey: string | null;
  nameFa: string;
  nameEn: string;
  unitFa: string;
  unitEn: string;
  gramsPerUnit: number;
  kcalPerUnit: number;
}

function defaultMealByHour(): MealKey {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 22) return 'dinner';
  return 'snack';
}

/** Merged local catalog: full database first, Iranian list fills gaps. */
function catalog(): QuickSource[] {
  const seen = new Set<string>();
  const out: QuickSource[] = [];
  for (const f of FOOD_DB) {
    seen.add(f.nameFa);
    out.push({
      id: `db:${f.key}`,
      foodKey: f.key,
      nameFa: f.nameFa,
      nameEn: f.nameEn,
      unitFa: f.unitFa,
      unitEn: f.unitEn,
      gramsPerUnit: f.gramsPerUnit,
      kcalPerUnit: f.kcalPerUnit,
    });
  }
  for (const f of IRANIAN_FOODS) {
    if (seen.has(f.nameFa)) continue;
    seen.add(f.nameFa);
    out.push({
      id: `ir:${f.key}`,
      foodKey: f.key,
      nameFa: f.nameFa,
      nameEn: f.nameEn,
      unitFa: f.unitFa,
      unitEn: f.unitEn,
      gramsPerUnit: f.gramsPerUnit,
      kcalPerUnit: f.kcalPerUnit,
    });
  }
  return out;
}

function searchCatalog(query: string): QuickSource[] {
  const q = query.trim();
  if (!q) return [];
  const dbHits = new Set(searchFoodDB(q).map((f) => f.nameFa));
  return catalog().filter(
    (f) =>
      dbHits.has(f.nameFa) ||
      f.nameFa.includes(q) ||
      f.nameEn.toLowerCase().includes(q.toLowerCase()),
  );
}

/** Recent (last occurrence) + frequent (most logged) foods from history. */
function quickLists(): { recent: QuickSource[]; frequent: QuickSource[] } {
  const all = getFoodLog();
  const byId = new Map<string, { src: QuickSource; last: number; count: number }>();
  all.forEach((e, i) => {
    const id = e.foodKey ?? `name:${e.nameFa}`;
    const perUnit = e.qty > 0 ? e.kcal / e.qty : e.kcal;
    const gramsPerUnit = e.qty > 0 ? e.grams / e.qty : 0;
    const cur = byId.get(id);
    if (cur) {
      cur.last = i;
      cur.count += 1;
    } else {
      byId.set(id, {
        src: {
          id,
          foodKey: e.foodKey,
          nameFa: e.nameFa,
          nameEn: e.nameEn,
          unitFa: e.unitFa,
          unitEn: e.unitEn,
          gramsPerUnit: Math.round(gramsPerUnit),
          kcalPerUnit: Math.round(perUnit),
        },
        last: i,
        count: 1,
      });
    }
  });
  const sorted = [...byId.values()];
  const recent = sorted.sort((a, b) => b.last - a.last).slice(0, 8).map((x) => x.src);
  const frequent = sorted
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .slice(0, 8)
    .map((x) => x.src);
  return { recent, frequent };
}

const KEYS = {
  fa: {
    title: 'دفتر غذای امروز',
    subtitle: 'وعده به وعده — هر عدد، برآورد عمومی است، نه توصیه‌ی شخصی.',
    dayTotal: 'مجموع امروز (برآوردی)',
    mealTotal: 'مجموع وعده (برآوردی)',
    quickTitle: 'افزودن سریع — یک لمس، بدون تایپ دوباره',
    quickMeal: 'به کدام وعده اضافه شود؟',
    recent: 'اخیر',
    frequent: 'پرتکرار',
    searchPlaceholder: 'جست‌وجوی غذا…',
    add: '＋',
    customName: 'غذای دلخواه (نام)',
    customKcal: 'کالری یک واحد (برآوردی)',
    customAdd: 'ثبت در وعده',
    otherTitle: 'سایر (بدون وعده — مثلاً از ویس)',
    otherHint: 'با همین انتخاب، به وعده‌اش منتقلش کن.',
    emptyMeal: 'هنوز چیزی در این وعده ثبت نشده است.',
    voice: 'ثبت با ویس',
    voiceHint: 'ویس را تایپ یا ضبط کن، خلاصه را اصلاح کن، بعد تأیید کن.',
    remove: 'حذف',
    estimateNote: 'همه‌ی کالری‌ها برآورد عمومی‌اند، نه توصیه‌ی شخصی و نه تشخیص.',
  },
  en: {
    title: "Today's food diary",
    subtitle: 'Meal by meal — every figure is a general estimate, not personal advice.',
    dayTotal: 'Day total (estimated)',
    mealTotal: 'Meal total (estimated)',
    quickTitle: 'Quick add — one tap, no retyping',
    quickMeal: 'Add to which meal?',
    recent: 'Recent',
    frequent: 'Frequent',
    searchPlaceholder: 'Search foods…',
    add: '＋',
    customName: 'Custom food (name)',
    customKcal: 'Kcal per unit (estimated)',
    customAdd: 'Add to meal',
    otherTitle: 'Other (no meal — e.g. from voice)',
    otherHint: 'Move it into a meal with this select.',
    emptyMeal: 'Nothing logged in this meal yet.',
    voice: 'Log by voice',
    voiceHint: 'Type or record the voice text, correct the summary, then confirm.',
    remove: 'Remove',
    estimateNote: 'All calories are general estimates, not personal advice or a diagnosis.',
  },
} as const;

export default function MealDiary(): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);
  const [entries, setEntries] = useState<FoodLogEntry[]>(() => getTodayFoodLog());
  const [quickMeal, setQuickMeal] = useState<MealKey>(() => defaultMealByHour());
  const [queries, setQueries] = useState<Partial<Record<MealKey, string>>>({});
  const [customName, setCustomName] = useState('');
  const [customKcal, setCustomKcal] = useState(150);
  const { recent, frequent } = useMemo(() => quickLists(), [entries]);

  const refresh = () => setEntries(getTodayFoodLog());
  const dayTotal = entries.reduce((n, e) => n + e.kcal, 0);

  const addQuick = (src: QuickSource, meal: MealKey) => {
    addFoodLogEntry({
      foodKey: src.foodKey,
      nameFa: src.nameFa,
      nameEn: src.nameEn,
      qty: 1,
      unitFa: src.unitFa,
      unitEn: src.unitEn,
      grams: src.gramsPerUnit,
      kcal: src.kcalPerUnit,
      meal,
    });
    refresh();
  };

  const jumpToVoice = () => {
    document.getElementById('voice-food-log')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const entryRow = (e: FoodLogEntry) => (
    <div key={e.id} data-diary-entry={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ flex: 1, minWidth: 120 }}>
        {lang === 'fa' ? e.nameFa : e.nameEn}
        <span className="card-meta" style={{ display: 'block' }}>
          {fmt(e.qty)} {lang === 'fa' ? e.unitFa : e.unitEn} · {fmt(e.kcal)} kcal
        </span>
      </span>
      <button type="button" className="chip" data-diary-qty-minus={e.id} aria-label="minus" onClick={() => { updateFoodLogEntryQty(e.id, Math.max(0.5, e.qty - 0.5)); refresh(); }}>−</button>
      <button type="button" className="chip" data-diary-qty-plus={e.id} aria-label="plus" onClick={() => { updateFoodLogEntryQty(e.id, e.qty + 0.5); refresh(); }}>＋</button>
      <button type="button" className="chip" data-diary-remove={e.id} onClick={() => { removeFoodLogEntry(e.id); refresh(); }}>{L.remove}</button>
    </div>
  );

  const mealSection = (meal: MealKey, fa: string, en: string) => {
    const list = entries.filter((e) => e.meal === meal);
    const total = list.reduce((n, e) => n + e.kcal, 0);
    const q = queries[meal] ?? '';
    const results = searchCatalog(q).slice(0, 6);
    return (
      <section key={meal} data-meal-section={meal} style={{ marginTop: 16 }}>
        <h4 className="card-title" style={{ fontSize: 'var(--text-base)', margin: 0 }}>
          {lang === 'fa' ? fa : en}
          <span className="card-meta" style={{ marginInlineStart: 8 }}>
            {L.mealTotal}: {fmt(total)} kcal
          </span>
        </h4>
        {list.length === 0 ? (
          <p className="card-meta" style={{ margin: '6px 0' }}>{L.emptyMeal}</p>
        ) : (
          <div>{list.map(entryRow)}</div>
        )}
        <input
          className="input"
          data-diary-search={meal}
          style={{ width: '100%', marginTop: 8, minHeight: 44 }}
          value={q}
          onChange={(e) => setQueries((prev) => ({ ...prev, [meal]: e.target.value }))}
          placeholder={`${L.searchPlaceholder} (${lang === 'fa' ? fa : en})`}
        />
        {results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
            {results.map((f) => (
              <div key={f.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ flex: 1 }}>
                  {lang === 'fa' ? f.nameFa : f.nameEn}
                  <span className="card-meta"> · ۱ {lang === 'fa' ? f.unitFa : f.unitEn} ≈ {fmt(f.kcalPerUnit)} kcal</span>
                </span>
                <button type="button" className="btn-primary" data-diary-add-result={f.id} style={{ minHeight: 40, padding: '0 14px' }} onClick={() => addQuick(f, meal)}>
                  {L.add}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  const unassigned = entries.filter((e) => !e.meal);

  return (
    <section className="card" data-meal-diary>
      <h3 className="card-title">{L.title}</h3>
      <p className="card-meta" style={{ margin: '0 0 8px' }}>{L.subtitle}</p>
      <p style={{ margin: '0 0 12px', fontSize: 'var(--text-h2)', fontWeight: 700 }}>
        {L.dayTotal}: <span data-diary-day-total style={{ color: 'var(--accent-volt)' }}>{fmt(dayTotal)}</span> kcal
      </p>

      <div style={{ marginBottom: 4 }}>
        <p className="card-meta" style={{ margin: '0 0 6px' }}>{L.quickMeal}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {MEALS.map((m) => (
            <button
              key={m.key}
              type="button"
              data-quick-meal={m.key}
              className={quickMeal === m.key ? 'btn-primary' : 'chip'}
              style={{ minHeight: 40 }}
              onClick={() => setQuickMeal(m.key)}
            >
              {lang === 'fa' ? m.fa : m.en}
            </button>
          ))}
        </div>
        <p className="card-meta" style={{ margin: '0 0 6px' }}>{L.quickTitle}</p>
        {recent.length === 0 && frequent.length === 0 ? (
          <p className="card-meta">{L.emptyMeal}</p>
        ) : (
          <>
            <p className="card-meta" style={{ margin: '6px 0 4px' }}>{L.recent}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {recent.map((f) => (
                <button key={f.id} type="button" className="chip" data-recent-chip={f.id} style={{ minHeight: 40 }} onClick={() => addQuick(f, quickMeal)}>
                  {lang === 'fa' ? f.nameFa : f.nameEn} ＋
                </button>
              ))}
            </div>
            <p className="card-meta" style={{ margin: '10px 0 4px' }}>{L.frequent}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {frequent.map((f) => (
                <button key={f.id} type="button" className="chip" data-frequent-chip={f.id} style={{ minHeight: 40 }} onClick={() => addQuick(f, quickMeal)}>
                  {lang === 'fa' ? f.nameFa : f.nameEn} ＋
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {MEALS.map((m) => mealSection(m.key, m.fa, m.en))}

      {unassigned.length > 0 && (
        <section data-meal-section="other" style={{ marginTop: 16 }}>
          <h4 className="card-title" style={{ fontSize: 'var(--text-base)', margin: 0 }}>{L.otherTitle}</h4>
          <p className="card-meta" style={{ margin: '4px 0' }}>{L.otherHint}</p>
          {unassigned.map((e) => (
            <div key={e.id} data-diary-entry={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ flex: 1, minWidth: 120 }}>
                {lang === 'fa' ? e.nameFa : e.nameEn}
                <span className="card-meta" style={{ display: 'block' }}>
                  {fmt(e.qty)} {lang === 'fa' ? e.unitFa : e.unitEn} · {fmt(e.kcal)} kcal
                </span>
              </span>
              <select
                className="input"
                data-diary-assign={e.id}
                value=""
                style={{ minHeight: 40 }}
                onChange={(ev) => { const v = ev.target.value as MealKey; if (v) { setFoodLogEntryMeal(e.id, v); refresh(); } }}
              >
                <option value="">…</option>
                {MEALS.map((m) => (
                  <option key={m.key} value={m.key}>{lang === 'fa' ? m.fa : m.en}</option>
                ))}
              </select>
              <button type="button" className="chip" data-diary-remove={e.id} onClick={() => { removeFoodLogEntry(e.id); refresh(); }}>{L.remove}</button>
            </div>
          ))}
        </section>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
        <input
          className="input"
          style={{ flex: 1, minWidth: 140, minHeight: 44 }}
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={L.customName}
        />
        <input
          className="input"
          type="number"
          min={0}
          style={{ width: 110, minHeight: 44 }}
          value={customKcal}
          onChange={(e) => setCustomKcal(parseFloat(e.target.value) || 0)}
        />
        <button
          type="button"
          className="btn-primary"
          style={{ minHeight: 44 }}
          disabled={!customName.trim()}
          onClick={() => {
            addQuick({ id: 'custom', foodKey: null, nameFa: customName.trim(), nameEn: customName.trim(), unitFa: 'واحد', unitEn: 'unit', gramsPerUnit: 100, kcalPerUnit: customKcal }, quickMeal);
            setCustomName('');
          }}
        >
          {L.customAdd}
        </button>
      </div>

      <button type="button" className="btn-primary" data-voice-jump style={{ width: '100%', marginTop: 16, minHeight: 48 }} onClick={jumpToVoice}>
        {L.voice}
      </button>
      <p className="card-meta" style={{ margin: '6px 0 0' }}>{L.voiceHint}</p>
      <p className="card-meta" style={{ marginTop: 12 }}>{L.estimateNote}</p>
    </section>
  );
}
