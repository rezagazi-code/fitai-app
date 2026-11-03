/**
 * اپ هوشمند بدنسازی — Iranian food log (first-priority, local-first).
 *
 * Renders inside the centre "ثبت" tab. The user picks an everyday
 * Iranian food, logs it in its REAL unit (سیخ، کاسه، کف دست، نان) or
 * in grams, and sees today's total. No account, no server, no target
 * or diagnosis: totals are only what was recorded, and every calorie
 * figure is labelled a general estimate.
 */
import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import {
  IRANIAN_FOODS,
  addFoodLogEntry,
  getTodayFoodLog,
  kcalForGrams,
  kcalForUnits,
  removeFoodLogEntry,
  todayFoodKcal,
} from '../lib/food';

const KEYS = {
  fa: {
    title: 'ثبت غذا',
    subtitle: 'غذای ایرانی با واحد واقعی — سیخ، کاسه، کف دست، نان — یا گرم. اعداد، برآورد عمومی‌اند.',
    pickFood: 'غذا را انتخاب کن',
    unit: 'واحد',
    grams: 'گرم',
    qty: 'مقدار',
    log: 'ثبت غذا',
    customName: 'غذای دلخواه (نام)',
    customKcal: 'کالری برآوردی برای ۱۰۰ گرم',
    todayTotal: 'مجموع امروز',
    kcal: 'کالری',
    empty: 'امروز هنوز چیزی ثبت نشده است.',
    remove: 'حذف',
    estimateNote: 'همه‌ی کالری‌ها برآورد عمومی‌اند، نه توصیه‌ی شخصی و نه تشخیص.',
    photo: 'عکس غذا (اختیاری — فقط یادآوری، کالری را عوض نمی‌کند)',
    photoRemove: 'حذف عکس',
    photoNote: 'عکس قبل از ثبت نشان داده می‌شود و می‌توانی حذفش کنی؛ عکس، کالری را تعیین نمی‌کند.',
  },
  en: {
    title: 'Food log',
    subtitle: 'Iranian foods in real units — skewer, bowl, palm, bread — or grams. Figures are general estimates.',
    pickFood: 'Pick a food',
    unit: 'Unit',
    grams: 'Grams',
    qty: 'Amount',
    log: 'Log food',
    customName: 'Custom food (name)',
    customKcal: 'Estimated kcal per 100 g',
    todayTotal: "Today's total",
    kcal: 'kcal',
    empty: 'Nothing logged today yet.',
    remove: 'Remove',
    estimateNote: 'All calories are general estimates, not personal advice or a diagnosis.',
    photo: 'Meal photo (optional — a reminder only, it does not change calories)',
    photoRemove: 'Remove photo',
    photoNote: 'The photo is shown before saving and can be removed; a photo never determines calories.',
  },
} as const;

export default function FoodLog(): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);

  const [foodKey, setFoodKey] = useState<string>(IRANIAN_FOODS[0].key);
  const [mode, setMode] = useState<'unit' | 'grams' | 'custom'>('unit');
  const [qty, setQty] = useState(1);
  const [grams, setGrams] = useState(100);
  const [customName, setCustomName] = useState('');
  const [customKcal100, setCustomKcal100] = useState(150);
  const [entries, setEntries] = useState(() => getTodayFoodLog());
  const [total, setTotal] = useState(() => todayFoodKcal());
  // Meal photo, reviewed BEFORE save: picked → downscaled → previewed;
  // the user can remove it before pressing log. Capped so localStorage
  // never balloons: max 800px side, JPEG, and dropped if still >150KB.
  const [photo, setPhoto] = useState<string | null>(null);

  const handlePhotoFile = (file: File | undefined) => {
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 800 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let q = 0.7;
      let data = canvas.toDataURL('image/jpeg', q);
      while (data.length > 150 * 1024 && q > 0.3) {
        q -= 0.1;
        data = canvas.toDataURL('image/jpeg', q);
      }
      if (data.length <= 200 * 1024) setPhoto(data);
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  const food = IRANIAN_FOODS.find((f) => f.key === foodKey) ?? IRANIAN_FOODS[0];
  const previewKcal =
    mode === 'unit'
      ? kcalForUnits(food, qty)
      : mode === 'grams'
        ? kcalForGrams(food, grams)
        : Math.round((customKcal100 / 100) * grams);

  const refresh = () => {
    setEntries(getTodayFoodLog());
    setTotal(todayFoodKcal());
  };

  const handleLog = () => {
    const photoDataUrl = photo ?? undefined;
    if (mode === 'custom') {
      const name = customName.trim();
      if (!name || grams <= 0) return;
      addFoodLogEntry({
        foodKey: null,
        nameFa: name,
        nameEn: name,
        qty: grams,
        unitFa: 'گرم',
        unitEn: 'g',
        grams,
        kcal: previewKcal,
        ...(photoDataUrl ? { photoDataUrl } : {}),
      });
    } else if (mode === 'unit') {
      if (qty <= 0) return;
      addFoodLogEntry({
        foodKey: food.key,
        nameFa: food.nameFa,
        nameEn: food.nameEn,
        qty,
        unitFa: food.unitFa,
        unitEn: food.unitEn,
        grams: Math.round(food.gramsPerUnit * qty),
        kcal: previewKcal,
        ...(photoDataUrl ? { photoDataUrl } : {}),
      });
    } else {
      if (grams <= 0) return;
      addFoodLogEntry({
        foodKey: food.key,
        nameFa: food.nameFa,
        nameEn: food.nameEn,
        qty: grams,
        unitFa: 'گرم',
        unitEn: 'g',
        grams,
        kcal: previewKcal,
        ...(photoDataUrl ? { photoDataUrl } : {}),
      });
    }
    setPhoto(null);
    refresh();
  };

  return (
    <section className="card" data-food-log>
      <h3 className="card-title">{L.title}</h3>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>{L.subtitle}</p>

      <label className="card-meta" style={{ display: 'block', marginBottom: 4 }}>{L.pickFood}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {IRANIAN_FOODS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`chip${foodKey === f.key && mode !== 'custom' ? ' chip--active' : ''}`}
            aria-pressed={foodKey === f.key && mode !== 'custom'}
            onClick={() => {
              setFoodKey(f.key);
              setMode('unit');
            }}
          >
            {lang === 'fa' ? f.nameFa : f.nameEn}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }} role="group" aria-label={L.unit}>
        <button type="button" className={`chip${mode === 'unit' ? ' chip--active' : ''}`} onClick={() => setMode('unit')}>
          {lang === 'fa' ? food.unitFa : food.unitEn}
        </button>
        <button type="button" className={`chip${mode === 'grams' ? ' chip--active' : ''}`} onClick={() => setMode('grams')}>
          {L.grams}
        </button>
        <button type="button" className={`chip${mode === 'custom' ? ' chip--active' : ''}`} onClick={() => setMode('custom')}>
          {lang === 'fa' ? 'غذای دلخواه' : 'Custom'}
        </button>
      </div>

      {mode === 'custom' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <input
            className="input"
            type="text"
            value={customName}
            placeholder={L.customName}
            aria-label={L.customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <label className="card-meta">
            {L.customKcal}
            <input
              className="input"
              style={{ marginTop: 4 }}
              type="number"
              min={0}
              value={customKcal100}
              onChange={(e) => setCustomKcal100(Math.max(0, parseInt(e.target.value, 10) || 0))}
            />
          </label>
        </div>
      )}

      {mode === 'unit' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span className="card-meta">{L.qty} ({lang === 'fa' ? food.unitFa : food.unitEn})</span>
          <button type="button" className="chip" aria-label="decrease" onClick={() => setQty((q) => Math.max(0.5, q - 0.5))}>−</button>
          <strong style={{ minWidth: '3rem', textAlign: 'center' }}>{fmt(qty)}</strong>
          <button type="button" className="chip" aria-label="increase" onClick={() => setQty((q) => q + 0.5)}>+</button>
          <span className="card-meta">≈ {fmt(previewKcal)} {L.kcal}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span className="card-meta">{L.grams}</span>
          <input
            className="input"
            style={{ maxWidth: '8rem' }}
            type="number"
            min={0}
            value={grams}
            onChange={(e) => setGrams(Math.max(0, parseInt(e.target.value, 10) || 0))}
          />
          <span className="card-meta">≈ {fmt(previewKcal)} {L.kcal}</span>
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <label className="card-meta" style={{ display: 'block', marginBottom: 6 }}>
          {L.photo}
        </label>
        <input
          type="file"
          accept="image/*"
          aria-label={L.photo}
          onChange={(e) => handlePhotoFile(e.target.files?.[0])}
        />
        {photo && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={photo} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
            <button type="button" className="chip" onClick={() => setPhoto(null)}>
              {L.photoRemove}
            </button>
          </div>
        )}
        <p className="card-meta" style={{ marginTop: 6 }}>{L.photoNote}</p>
      </div>

      <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={handleLog}>
        {L.log} — {fmt(previewKcal)} {L.kcal}
      </button>

      <div style={{ marginTop: 16 }}>
        <p style={{ margin: '0 0 8px', fontWeight: 700 }}>
          {L.todayTotal}: {fmt(total)} {L.kcal}
        </p>
        {entries.length === 0 ? (
          <p className="card-meta" style={{ margin: 0 }}>{L.empty}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {entries.map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {e.photoDataUrl && (
                    <img src={e.photoDataUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                  )}
                  <span>
                    {lang === 'fa' ? e.nameFa : e.nameEn} — {fmt(e.qty)} {lang === 'fa' ? e.unitFa : e.unitEn}
                    <span className="card-meta"> · {fmt(e.kcal)} {L.kcal}</span>
                  </span>
                </span>
                <button
                  type="button"
                  className="chip"
                  onClick={() => {
                    removeFoodLogEntry(e.id);
                    refresh();
                  }}
                >
                  {L.remove}
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="card-meta" style={{ marginTop: 12 }}>{L.estimateNote}</p>
      </div>
    </section>
  );
}
