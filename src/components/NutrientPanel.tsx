/**
 * Musclepro — per-food nutrient view (food depth, original UI).
 *
 * Shows what the LOCAL database actually records for a food: energy
 * and macros, scaled to the chosen quantity. A macro that is null in
 * the database renders as "not recorded" — never as zero and never
 * as a guess. Micronutrients are NOT in the local database at all,
 * so the panel says so plainly instead of inventing a table; a
 * complete micronutrient database is a server-phase job.
 * All figures are GENERAL ESTIMATES.
 */

import type { ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { resolveNutrients } from '../lib/foodExtended';

const KEYS = {
  fa: {
    title: 'جزئیات تغذیه‌ای',
    perUnit: 'برای هر واحد',
    forQty: 'برای مقدار انتخاب‌شده',
    protein: 'پروتئین',
    carbs: 'کربوهیدرات',
    fat: 'چربی',
    kcal: 'کالری',
    notRecorded: 'ثبت نشده',
    unknownMacros: 'درشت‌مغذی‌های این غذا در پایگاه محلی ثبت نشده‌اند؛ فقط کالری برآوردی از ثبت غذا در دست است.',
    microNote: 'ریزمغذی‌ها (فیبر، کلسیم، آهن، ویتامین‌ها و...) برای هیچ غذایی در پایگاه محلی ثبت نشده‌اند — این جدول ساخته نمی‌شود تا عددی جعل نشود. پایگاه کامل با ریزمغذی، در نسخه‌ی سروری می‌آید.',
    estimateNote: 'همه‌ی اعداد برآورد عمومی‌اند.',
    range: 'بازه‌ی برآوردی',
  },
  en: {
    title: 'Nutrition details',
    perUnit: 'Per unit',
    forQty: 'For the chosen amount',
    protein: 'Protein',
    carbs: 'Carbohydrate',
    fat: 'Fat',
    kcal: 'kcal',
    notRecorded: 'Not recorded',
    unknownMacros: 'This food’s macros are not recorded in the local database; only its estimated calories from the food log are available.',
    microNote: 'Micronutrients (fibre, calcium, iron, vitamins, …) are not recorded for any food in the local database — no table is invented here. A complete micronutrient database comes with the server version.',
    estimateNote: 'All figures are general estimates.',
    range: 'Estimated range',
  },
} as const;

interface NutrientPanelProps {
  foodKey: string | null;
  nameFa: string;
  nameEn: string;
  /** Quantity in the food's real unit (1 = one unit). */
  qty: number;
}

export default function NutrientPanel({ foodKey, nameFa, nameEn, qty }: NutrientPanelProps): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const fa = lang === 'fa';
  const fmt = (n: number) => new Intl.NumberFormat(fa ? 'fa-IR' : 'en-US').format(n);
  const info = resolveNutrients(foodKey, nameFa);
  const scale = (v: number | null) => (v === null ? null : Math.round(v * qty * 10) / 10);

  const rows: Array<{ key: string; label: string; value: string }> = [];
  if (info) {
    rows.push({ key: 'kcal', label: L.kcal, value: `${fmt(Math.round(info.entry.kcalPerUnit * qty))} ${L.kcal}` });
    rows.push({ key: 'protein', label: L.protein, value: scale(info.proteinG) === null ? L.notRecorded : `${fmt(scale(info.proteinG) ?? 0)} g` });
    rows.push({ key: 'carbs', label: L.carbs, value: scale(info.carbsG) === null ? L.notRecorded : `${fmt(scale(info.carbsG) ?? 0)} g` });
    rows.push({ key: 'fat', label: L.fat, value: scale(info.fatG) === null ? L.notRecorded : `${fmt(scale(info.fatG) ?? 0)} g` });
  }

  return (
    <div data-nutrient-panel data-food-key={foodKey ?? ''} style={{ marginTop: 12, padding: 12, border: '1px solid var(--line, #2a3550)', borderRadius: 12 }}>
      <p style={{ margin: '0 0 8px', fontWeight: 700 }}>
        {L.title} — {fa ? nameFa : nameEn} ({L.forQty}: {fmt(qty)})
      </p>
      {!info ? (
        <p className="card-meta" style={{ margin: 0 }}>{L.unknownMacros}</p>
      ) : (
        <ul style={{ margin: 0, paddingInlineStart: 18 }}>
          {rows.map((r) => (
            <li key={r.key} data-nutrient={r.key}>
              {r.label}: {r.value}
            </li>
          ))}
          <li>
            {L.perUnit}: {fmt(info.entry.gramsPerUnit)} g · {fmt(info.entry.kcalPerUnit)} {L.kcal}
            {info.entry.estimate && info.entry.rangeKcal ? ` · ${L.range}: ${fmt(info.entry.rangeKcal[0])}–${fmt(info.entry.rangeKcal[1])} ${L.kcal}` : ''}
          </li>
        </ul>
      )}
      <p className="card-meta" data-micronutrient-note style={{ margin: '8px 0 0' }}>{L.microNote}</p>
      <p className="card-meta" style={{ margin: '4px 0 0' }}>{L.estimateNote}</p>
    </div>
  );
}
