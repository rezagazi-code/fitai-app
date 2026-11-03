/**
 * Musclepro — market shopping list (second-priority dossier item).
 *
 * Built from today's meal plan (or, when there is no plan, from
 * today's food log) and grouped by market section — bakery, protein,
 * vegetables & fruit, dairy, legumes & dried goods, other — with calm
 * checkboxes. No prices and no ordering: this is a reminder list on
 * the user's own phone, and it never claims to buy anything.
 */

import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { localDateString } from '../lib/food';
import {
  buildShoppingList,
  getShoppingChecked,
  MARKET_SECTIONS,
  setShoppingChecked,
} from '../lib/mealPlan';

const KEYS = {
  fa: {
    title: 'لیست خرید بازاری',
    subtitle: 'از روی برنامه‌ی غذایی امروز (یا اگر برنامه‌ای نیست، از روی غذاهای ثبت‌شده‌ی امروز) ساخته می‌شود — با تیک آرام، بدون قیمت و بدون سفارش.',
    empty: 'هنوز چیزی برای خرید نیست — اول یک وعده بچین یا غذایی ثبت کن.',
    bought: 'خریده شد',
  },
  en: {
    title: 'Market shopping list',
    subtitle: 'Built from today’s meal plan (or, without a plan, from today’s food log) — with calm checkboxes, no prices, no ordering.',
    empty: 'Nothing to buy yet — build a meal or log a food first.',
    bought: 'Bought',
  },
} as const;

export default function ShoppingListPanel(): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);
  const [checked, setChecked] = useState<Record<string, boolean>>(() => getShoppingChecked());
  const items = buildShoppingList(localDateString());

  if (items.length === 0) {
    return (
      <section className="card" data-shopping-list>
        <h3 className="card-title">{L.title}</h3>
        <p className="card-meta" style={{ margin: 0 }}>{L.empty}</p>
      </section>
    );
  }

  return (
    <section className="card" data-shopping-list>
      <h3 className="card-title">{L.title}</h3>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>{L.subtitle}</p>
      {MARKET_SECTIONS.map((section) => {
        const sectionItems = items.filter((it) => it.section === section.key);
        if (sectionItems.length === 0) return null;
        return (
          <div key={section.key} style={{ marginTop: 12 }}>
            <strong>{lang === 'fa' ? section.fa : section.en}</strong>
            <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sectionItems.map((it) => (
                <li key={it.key}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={!!checked[it.key]}
                      onChange={(e) => {
                        setShoppingChecked(it.key, e.target.checked);
                        setChecked({ ...checked, [it.key]: e.target.checked });
                      }}
                    />
                    <span style={{ textDecoration: checked[it.key] ? 'line-through' : 'none', opacity: checked[it.key] ? 0.6 : 1 }}>
                      {lang === 'fa' ? it.nameFa : it.nameEn} — {fmt(it.qty)} {lang === 'fa' ? it.unitFa : it.unitEn}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
