/**
 * Musclepro — full-day meal plan + redistribution + substitutes +
 * allergy/dislike filter (original implementation).
 *
 * The user can build a complete day (breakfast / lunch / dinner /
 * snack) with exact ingredient amounts from the local food database,
 * swap any item for an unlimited list of same-family substitutes,
 * and set an allergy/dislike filter once that actually removes
 * excluded foods from new plans and from substitute lists. When a
 * meal is not possible today, its estimated calories spread over the
 * remaining meals with a plain explanation of WHY. Nothing is
 * prescribed and nothing is diagnosed: all calories are general
 * estimates.
 */

import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { FOOD_DB } from '../lib/foodDB';
import { localDateString } from '../lib/food';
import { getExclusions, isFoodExcluded, setExclusions } from '../lib/foodExtended';
import {
  addFoodToMeal,
  buildDefaultDayPlan,
  dayPlanKcal,
  getDayMealPlan,
  mealKcal,
  MEAL_GROUPS,
  redistributeSkippedMeal,
  removeFoodFromMeal,
  substituteInMeal,
  substitutesFor,
  unskipMeal,
  type MealGroup,
} from '../lib/mealPlan';

const KEYS = {
  fa: {
    title: 'برنامه‌ی غذایی روز',
    subtitle: 'وعده‌های امروز را از پایگاه غذا بچین، یا با یک لمس برنامه‌ی کامل روز را بساز؛ هر غذا را می‌توانی با جایگزین هم‌خانواده عوض کنی، و فیلتر آلرژی/عدم علاقه، غذاهای حذف‌شده را از برنامه و جایگزین‌ها بیرون می‌کند.',
    pickFood: 'غذا',
    add: 'افزودن به وعده',
    total: 'مجموع روز (برآوردی)',
    skip: 'امروز این وعده فرصت نمی‌شود',
    unskip: 'بازگرداندن وعده',
    empty: 'هنوز چیزی در این وعده نیست.',
    estimateNote: 'همه‌ی کالری‌ها برآورد عمومی‌اند، نه توصیه‌ی شخصی و نه تشخیص.',
    buildDay: 'ساختن برنامه‌ی کامل روز',
    buildNote: 'وعده‌های خالی با ترکیب پیش‌فرض از پایگاه غذا پر می‌شوند؛ وعده‌هایی که غذا دارند دست نمی‌خورند.',
    replacedNote: 'به‌خاطر فیلتر، این غذاها جایگزین شدند',
    droppedNote: 'به‌خاطر فیلتر، این غذاها حذف شدند (جایگزینی نبود)',
    substitute: 'جایگزین',
    substitutesTitle: 'جایگزین‌های هم‌خانواده (نامحدود)',
    substitutesEmpty: 'جایگزین دیگری در این خانواده نیست.',
    chooseSubstitute: 'انتخاب جایگزین',
    exclusionsTitle: 'فیلتر آلرژی / عدم علاقه',
    exclusionsNote: 'غذاهایی که اینجا انتخاب می‌کنی، از برنامه‌ی روزِ تازه و از فهرست جایگزین‌ها حذف می‌شوند. این فیلتر فقط روی دستگاه خودت ذخیره می‌شود.',
    exclusionsSaved: 'فیلتر ذخیره شد.',
    exclusionsKeyword: 'کلمه‌ی کلیدی برای حذف (مثلاً بادام)',
    exclusionsAddKeyword: 'افزودن کلمه',
    exclusionsClear: 'پاک‌کردن فیلتر',
    excludedCount: 'غذای حذف‌شده از فهرست افزودن',
  },
  en: {
    title: 'Day meal plan',
    subtitle: 'Build today’s meals from the food database, or generate the full day in one tap; any item can be swapped for an unlimited list of same-family substitutes, and the allergy/dislike filter removes excluded foods from new plans and substitutes.',
    pickFood: 'Food',
    add: 'Add to meal',
    total: 'Day total (estimated)',
    skip: 'This meal is not possible today',
    unskip: 'Restore meal',
    empty: 'Nothing in this meal yet.',
    estimateNote: 'All calories are general estimates, not personal advice or a diagnosis.',
    buildDay: 'Build the full day plan',
    buildNote: 'Empty meals are filled with a default composition from the food database; meals that already have foods are left untouched.',
    replacedNote: 'Replaced because of the filter',
    droppedNote: 'Dropped because of the filter (no substitute)',
    substitute: 'Substitute',
    substitutesTitle: 'Same-family substitutes (unlimited)',
    substitutesEmpty: 'No other substitute in this family.',
    chooseSubstitute: 'Choose substitute',
    exclusionsTitle: 'Allergy / dislike filter',
    exclusionsNote: 'Foods you pick here are removed from newly built day plans and from substitute lists. The filter is stored only on your device.',
    exclusionsSaved: 'Filter saved.',
    exclusionsKeyword: 'Keyword to exclude (e.g. almond)',
    exclusionsAddKeyword: 'Add keyword',
    exclusionsClear: 'Clear filter',
    excludedCount: 'foods hidden from the add list',
  },
} as const;

export default function MealPlanPanel(): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const fa = lang === 'fa';
  const fmt = (n: number) => new Intl.NumberFormat(fa ? 'fa-IR' : 'en-US').format(n);
  const today = localDateString();
  const [plan, setPlan] = useState(() => getDayMealPlan(today));
  const [explanation, setExplanation] = useState<string | null>(null);
  const [buildNote, setBuildNote] = useState<string | null>(null);
  const [group, setGroup] = useState<MealGroup>('lunch');
  const [foodKey, setFoodKey] = useState(FOOD_DB[0]?.key ?? '');
  const [qty, setQty] = useState(1);
  const [exclusions, setExclusionsState] = useState(() => getExclusions());
  const [keyword, setKeyword] = useState('');
  const [subOpen, setSubOpen] = useState<{ group: MealGroup; index: number } | null>(null);

  const refresh = () => setPlan(getDayMealPlan(today));
  const food = FOOD_DB.find((f) => f.key === foodKey) ?? FOOD_DB[0];
  const addableFoods = FOOD_DB.filter((f) => !isFoodExcluded(f.key, f.nameFa, exclusions));
  const excludedCount = FOOD_DB.length - addableFoods.length;

  const toggleExclusionKey = (key: string) => {
    const next = {
      ...exclusions,
      foodKeys: exclusions.foodKeys.includes(key)
        ? exclusions.foodKeys.filter((k) => k !== key)
        : [...exclusions.foodKeys, key],
    };
    setExclusions(next);
    setExclusionsState(next);
  };

  return (
    <section className="card" data-meal-plan>
      <h3 className="card-title">{L.title}</h3>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>{L.subtitle}</p>
      <p className="card-meta" data-plan-total>
        {L.total}: {fmt(dayPlanKcal(plan))} kcal
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <button
          type="button"
          className="btn-primary"
          data-build-day-plan
          onClick={() => {
            const { plan: next, replaced, dropped } = buildDefaultDayPlan(today, getExclusions());
            setPlan(next);
            const parts: string[] = [];
            if (replaced.length > 0) parts.push(`${L.replacedNote}: ${replaced.map((r) => `${r.from} → ${r.to}`).join('، ')}`);
            if (dropped.length > 0) parts.push(`${L.droppedNote}: ${dropped.map((d) => d.name).join('، ')}`);
            setBuildNote(parts.length > 0 ? parts.join(' — ') : null);
          }}
        >
          {L.buildDay}
        </button>
      </div>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>{L.buildNote}</p>
      {buildNote && <p className="card-meta" data-build-note style={{ margin: '0 0 12px' }}>{buildNote}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <select className="input" value={group} onChange={(e) => setGroup(e.target.value as MealGroup)}>
          {MEAL_GROUPS.map((m) => (
            <option key={m.key} value={m.key}>{fa ? m.fa : m.en}</option>
          ))}
        </select>
        <select className="input" style={{ flex: 1, minWidth: 160 }} value={addableFoods.some((f) => f.key === foodKey) ? foodKey : (addableFoods[0]?.key ?? '')} onChange={(e) => setFoodKey(e.target.value)}>
          {addableFoods.map((f) => (
            <option key={f.key} value={f.key}>
              {fa ? f.nameFa : f.nameEn} — {f.unitFa} · {f.kcalPerUnit} kcal
            </option>
          ))}
        </select>
        <input
          className="input"
          type="number"
          min={0.5}
          step={0.5}
          style={{ width: 80 }}
          value={qty}
          onChange={(e) => setQty(parseFloat(e.target.value) || 1)}
        />
        <button
          type="button"
          className="btn-primary"
          data-plan-add
          onClick={() => {
            const picked = FOOD_DB.find((f) => f.key === foodKey) ?? addableFoods[0];
            if (!picked || qty <= 0) return;
            setPlan(addFoodToMeal(today, group, {
              foodKey: picked.key,
              nameFa: picked.nameFa,
              nameEn: picked.nameEn,
              qty,
              unitFa: picked.unitFa,
              unitEn: picked.unitEn,
              grams: Math.round(picked.gramsPerUnit * qty),
              kcal: Math.round(picked.kcalPerUnit * qty),
            }));
          }}
        >
          {L.add}
        </button>
      </div>
      {excludedCount > 0 && (
        <p className="card-meta" style={{ margin: '0 0 12px' }}>
          {fmt(excludedCount)} {L.excludedCount}
        </p>
      )}

      {MEAL_GROUPS.map((m) => {
        const foods = plan.meals[m.key];
        const skipped = plan.skipped.includes(m.key);
        return (
          <div key={m.key} style={{ marginTop: 12 }} data-plan-meal={m.key}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>{fa ? m.fa : m.en}</strong>
              <span className="card-meta">{fmt(mealKcal(foods))} kcal</span>
              {!skipped ? (
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    const { plan: next, explanationFa, explanationEn } = redistributeSkippedMeal(plan, m.key);
                    setPlan(next);
                    setExplanation(fa ? explanationFa : explanationEn);
                  }}
                >
                  {L.skip}
                </button>
              ) : (
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    setPlan(unskipMeal(plan, m.key));
                    setExplanation(null);
                  }}
                >
                  {L.unskip}
                </button>
              )}
            </div>
            {skipped ? (
              <p className="card-meta" style={{ margin: '4px 0' }}>—</p>
            ) : foods.length === 0 ? (
              <p className="card-meta" style={{ margin: '4px 0' }}>{L.empty}</p>
            ) : (
              <ul className="card-meta" style={{ margin: '4px 0' }}>
                {foods.map((f, i) => {
                  const subs = substitutesFor(f.foodKey, f.nameFa, getExclusions());
                  const open = subOpen?.group === m.key && subOpen.index === i;
                  return (
                    <li key={i} data-plan-item={f.foodKey ?? f.nameFa}>
                      {f.nameFa} — {fmt(f.qty)} {f.unitFa} · {fmt(f.kcal)} kcal{' '}
                      <button type="button" className="chip" onClick={() => setPlan(removeFoodFromMeal(today, m.key, i))}>
                        ✕
                      </button>{' '}
                      <button
                        type="button"
                        className="chip"
                        data-substitute-open
                        onClick={() => setSubOpen(open ? null : { group: m.key, index: i })}
                      >
                        {L.substitute}
                      </button>
                      {open && (
                        <div data-substitutes style={{ marginTop: 6 }}>
                          <p className="card-meta" style={{ margin: '0 0 4px' }}>{L.substitutesTitle} ({fmt(subs.length)})</p>
                          {subs.length === 0 ? (
                            <p className="card-meta" style={{ margin: 0 }}>{L.substitutesEmpty}</p>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {subs.map((s) => (
                                <button
                                  key={s.key}
                                  type="button"
                                  className="chip"
                                  data-substitute-pick={s.key}
                                  onClick={() => {
                                    const next = substituteInMeal(today, m.key, i, s.key);
                                    if (next) setPlan(next);
                                    setSubOpen(null);
                                  }}
                                >
                                  {fa ? s.nameFa : s.nameEn}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}

      {/* Allergy / dislike filter: set once, applies to new plans + substitutes. */}
      <div style={{ marginTop: 16 }} data-exclusions-section>
        <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{L.exclusionsTitle}</p>
        <p className="card-meta" style={{ margin: '0 0 8px' }}>{L.exclusionsNote}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {FOOD_DB.map((f) => {
            const active = exclusions.foodKeys.includes(f.key);
            return (
              <button
                key={f.key}
                type="button"
                className={`chip${active ? ' chip--active' : ''}`}
                aria-pressed={active}
                data-exclusion-toggle={f.key}
                onClick={() => toggleExclusionKey(f.key)}
              >
                {fa ? f.nameFa : f.nameEn}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <input
            className="input"
            type="text"
            value={keyword}
            placeholder={L.exclusionsKeyword}
            aria-label={L.exclusionsKeyword}
            data-exclusion-keyword
            onChange={(e) => setKeyword(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <button
            type="button"
            className="chip"
            data-exclusion-add-keyword
            onClick={() => {
              const k = keyword.trim();
              if (!k) return;
              const next = { ...exclusions, keywords: [...new Set([...exclusions.keywords, k])] };
              setExclusions(next);
              setExclusionsState(next);
              setKeyword('');
            }}
          >
            {L.exclusionsAddKeyword}
          </button>
          <button
            type="button"
            className="chip"
            data-exclusion-clear
            onClick={() => {
              setExclusions({ foodKeys: [], keywords: [] });
              setExclusionsState({ foodKeys: [], keywords: [] });
            }}
          >
            {L.exclusionsClear}
          </button>
        </div>
        {exclusions.keywords.length > 0 && (
          <p className="card-meta" style={{ margin: 0 }}>
            {fa ? 'کلمات حذف‌شده: ' : 'Excluded keywords: '}{exclusions.keywords.join('، ')}
          </p>
        )}
      </div>

      {explanation && <p className="card-meta" style={{ marginTop: 12 }}>{explanation}</p>}
      <p className="card-meta" style={{ marginTop: 8 }}>{L.estimateNote}</p>
    </section>
  );
}
