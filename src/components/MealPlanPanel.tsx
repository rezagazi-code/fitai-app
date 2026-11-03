/**
 * Musclepro — day meal plan + redistribution (second-priority).
 *
 * The user builds today's meals from the food database, sees each
 * meal's estimated calories and the day total, and — when a meal is
 * not possible today — redistributes it over the remaining meals with
 * a plain explanation of WHY the amounts changed. Nothing is hidden
 * and nothing is prescribed: all calories are general estimates.
 */

import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { FOOD_DB } from '../lib/foodDB';
import { localDateString } from '../lib/food';
import {
  addFoodToMeal,
  dayPlanKcal,
  getDayMealPlan,
  mealKcal,
  MEAL_GROUPS,
  redistributeSkippedMeal,
  removeFoodFromMeal,
  unskipMeal,
  type MealGroup,
} from '../lib/mealPlan';

const KEYS = {
  fa: {
    title: 'برنامه‌ی غذایی روز',
    subtitle: 'وعده‌های امروز را از پایگاه غذا بچین؛ اگر وعده‌ای امروز فرصت نشد، کالری برآوردی آن بین وعده‌های باقی‌مانده تقسیم می‌شود — با توضیح اینکه چرا.',
    pickFood: 'غذا',
    add: 'افزودن به وعده',
    total: 'مجموع روز (برآوردی)',
    skip: 'امروز این وعده فرصت نمی‌شود',
    unskip: 'بازگرداندن وعده',
    empty: 'هنوز چیزی در این وعده نیست.',
    estimateNote: 'همه‌ی کالری‌ها برآورد عمومی‌اند، نه توصیه‌ی شخصی و نه تشخیص.',
  },
  en: {
    title: 'Day meal plan',
    subtitle: 'Build today’s meals from the food database; if a meal is not possible today, its estimated calories are spread over the remaining meals — with an explanation of why.',
    pickFood: 'Food',
    add: 'Add to meal',
    total: 'Day total (estimated)',
    skip: 'This meal is not possible today',
    unskip: 'Restore meal',
    empty: 'Nothing in this meal yet.',
    estimateNote: 'All calories are general estimates, not personal advice or a diagnosis.',
  },
} as const;

export default function MealPlanPanel(): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);
  const today = localDateString();
  const [plan, setPlan] = useState(() => getDayMealPlan(today));
  const [explanation, setExplanation] = useState<string | null>(null);
  const [group, setGroup] = useState<MealGroup>('lunch');
  const [foodKey, setFoodKey] = useState(FOOD_DB[0]?.key ?? '');
  const [qty, setQty] = useState(1);

  const refresh = () => setPlan(getDayMealPlan(today));
  const food = FOOD_DB.find((f) => f.key === foodKey) ?? FOOD_DB[0];

  return (
    <section className="card" data-meal-plan>
      <h3 className="card-title">{L.title}</h3>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>{L.subtitle}</p>
      <p className="card-meta">
        {L.total}: {fmt(dayPlanKcal(plan))} kcal
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
        <select className="input" value={group} onChange={(e) => setGroup(e.target.value as MealGroup)}>
          {MEAL_GROUPS.map((m) => (
            <option key={m.key} value={m.key}>{lang === 'fa' ? m.fa : m.en}</option>
          ))}
        </select>
        <select className="input" style={{ flex: 1, minWidth: 160 }} value={foodKey} onChange={(e) => setFoodKey(e.target.value)}>
          {FOOD_DB.map((f) => (
            <option key={f.key} value={f.key}>
              {lang === 'fa' ? f.nameFa : f.nameEn} — {f.unitFa} · {f.kcalPerUnit} kcal
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
          onClick={() => {
            if (!food || qty <= 0) return;
            setPlan(addFoodToMeal(today, group, {
              foodKey: food.key,
              nameFa: food.nameFa,
              nameEn: food.nameEn,
              qty,
              unitFa: food.unitFa,
              unitEn: food.unitEn,
              grams: Math.round(food.gramsPerUnit * qty),
              kcal: Math.round(food.kcalPerUnit * qty),
            }));
          }}
        >
          {L.add}
        </button>
      </div>

      {MEAL_GROUPS.map((m) => {
        const foods = plan.meals[m.key];
        const skipped = plan.skipped.includes(m.key);
        return (
          <div key={m.key} style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <strong>{lang === 'fa' ? m.fa : m.en}</strong>
              <span className="card-meta">{fmt(mealKcal(foods))} kcal</span>
              {!skipped ? (
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    const { plan: next, explanationFa, explanationEn } = redistributeSkippedMeal(plan, m.key);
                    setPlan(next);
                    setExplanation(lang === 'fa' ? explanationFa : explanationEn);
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
                {foods.map((f, i) => (
                  <li key={i}>
                    {f.nameFa} — {fmt(f.qty)} {f.unitFa} · {fmt(f.kcal)} kcal{' '}
                    <button type="button" className="chip" onClick={() => setPlan(removeFoodFromMeal(today, m.key, i))}>
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {explanation && <p className="card-meta" style={{ marginTop: 12 }}>{explanation}</p>}
      <p className="card-meta" style={{ marginTop: 8 }}>{L.estimateNote}</p>
    </section>
  );
}
