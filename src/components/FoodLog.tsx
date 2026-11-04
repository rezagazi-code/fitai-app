/**
 * اپ هوشمند بدنسازی — Iranian food log (local-first) + food depth.
 *
 * Everyday Iranian foods in REAL units (سیخ، کاسه، کف دست، نان) or
 * grams, plus: search across the full local food database, a
 * per-food nutrient view, barcode entry + lookup (locally saved
 * barcodes only — no camera scan is claimed), recent foods and
 * saved meals for one-tap re-add, and today's total. No account, no
 * server, no target or diagnosis: totals are only what was recorded,
 * and every calorie figure is labelled a general estimate.
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
import { FOOD_DB, searchFoodDB, type FoodDBEntry } from '../lib/foodDB';
import {
  getRecentFoods,
  getSavedMeals,
  lookupBarcode,
  readdRecentFood,
  readdSavedMeal,
  removeSavedMeal,
  saveCustomFood,
  saveMeal,
  type CustomFood,
  type RecentFood,
  type SavedMeal,
} from '../lib/foodExtended';
import NutrientPanel from './NutrientPanel';

const KEYS = {
  fa: {
    title: 'ثبت غذا',
    subtitle: 'غذای ایرانی با واحد واقعی — سیخ، کاسه، کف دست، نان — یا گرم. اعداد، برآورد عمومی‌اند.',
    pickFood: 'غذا را انتخاب کن',
    searchDb: 'جست‌وجو در پایگاه غذا (۱۳۴ غذا)',
    searchPlaceholder: 'مثلاً سینه مرغ، قورمه سبزی…',
    select: 'انتخاب',
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
    barcodeTitle: 'بارکد غذا',
    barcodeNote: 'کد بارکد را دستی وارد کن. اسکن با دوربین در این نسخه نیست؛ برای اسکن زنده، افزونه‌ای لازم است که روی گوشی تست شود. جست‌وجو فقط در غذاهای ذخیره‌شده‌ی خودت انجام می‌شود — بارکدهای کارخانه‌ای در پایگاه محلی نیستند.',
    barcodePlaceholder: 'مثلاً 6261234567890',
    barcodeSearch: 'جست‌وجوی بارکد',
    barcodeHit: 'این بارکد قبلاً با این غذا ذخیره شده است.',
    barcodeMiss: 'این بارکد در پایگاه محلی نیست. مشخصات غذا را وارد کن تا با همین بارکد ذخیره شود و دفعه‌ی بعد با یک جست‌وجو پیدا شود.',
    barcodeAdd: 'افزودن با همین بارکد',
    barcodeSave: 'ذخیره‌ی غذا با این بارکد',
    manualName: 'نام غذا',
    manualUnit: 'واحد (مثلاً بسته، عدد)',
    manualGrams: 'گرم برای یک واحد',
    manualKcal: 'کالری برای یک واحد',
    manualProtein: 'پروتئین (گرم، اختیاری)',
    manualCarbs: 'کربوهیدرات (گرم، اختیاری)',
    manualFat: 'چربی (گرم، اختیاری)',
    recentTitle: 'غذاهای اخیر — افزودن دوباره با یک لمس',
    recentEmpty: 'هنوز غذایی در تاریخچه نیست؛ بعد از اولین ثبت، اینجا می‌آید.',
    readd: 'افزودن دوباره',
    savedTitle: 'وعده‌های ذخیره‌شده',
    savedEmpty: 'هنوز وعده‌ای ذخیره نشده است.',
    saveMealName: 'نام وعده (مثلاً صبحانه‌ی همیشگی)',
    saveMeal: 'ذخیره‌ی وعده‌ی امروز',
    readdMeal: 'افزودن همه‌ی وعده',
  },
  en: {
    title: 'Food log',
    subtitle: 'Iranian foods in real units — skewer, bowl, palm, bread — or grams. Figures are general estimates.',
    pickFood: 'Pick a food',
    searchDb: 'Search the food database (134 foods)',
    searchPlaceholder: 'e.g. chicken breast, ghormeh sabzi…',
    select: 'Select',
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
    barcodeTitle: 'Food barcode',
    barcodeNote: 'Type the barcode by hand. Camera scanning is not in this version; a live scanner needs a device-tested plugin. Lookup only covers foods you saved yourself — factory barcodes are not in the local database.',
    barcodePlaceholder: 'e.g. 6261234567890',
    barcodeSearch: 'Search barcode',
    barcodeHit: 'This barcode was previously saved with this food.',
    barcodeMiss: 'This barcode is not in the local database. Enter the food’s details to save it under this barcode, so next time one search finds it.',
    barcodeAdd: 'Add with this barcode',
    barcodeSave: 'Save food with this barcode',
    manualName: 'Food name',
    manualUnit: 'Unit (e.g. pack, piece)',
    manualGrams: 'Grams per unit',
    manualKcal: 'Kcal per unit',
    manualProtein: 'Protein (g, optional)',
    manualCarbs: 'Carbs (g, optional)',
    manualFat: 'Fat (g, optional)',
    recentTitle: 'Recent foods — one-tap re-add',
    recentEmpty: 'No food history yet; after your first log, it appears here.',
    readd: 'Re-add',
    savedTitle: 'Saved meals',
    savedEmpty: 'No saved meals yet.',
    saveMealName: 'Meal name (e.g. usual breakfast)',
    saveMeal: 'Save today’s meal',
    readdMeal: 'Add whole meal',
  },
} as const;

export default function FoodLog(): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const fa = lang === 'fa';
  const fmt = (n: number) => new Intl.NumberFormat(fa ? 'fa-IR' : 'en-US').format(n);

  const [foodKey, setFoodKey] = useState<string>(IRANIAN_FOODS[0].key);
  const [dbKey, setDbKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'unit' | 'grams' | 'custom'>('unit');
  const [qty, setQty] = useState(1);
  const [grams, setGrams] = useState(100);
  const [customName, setCustomName] = useState('');
  const [customKcal100, setCustomKcal100] = useState(150);
  const [entries, setEntries] = useState(() => getTodayFoodLog());
  const [total, setTotal] = useState(() => todayFoodKcal());
  const [recent, setRecent] = useState<RecentFood[]>(() => getRecentFoods());
  const [meals, setMeals] = useState<SavedMeal[]>(() => getSavedMeals());
  const [mealName, setMealName] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  // Barcode state.
  const [barcode, setBarcode] = useState('');
  const [barcodeState, setBarcodeState] = useState<'idle' | 'hit' | 'miss'>('idle');
  const [barcodeFood, setBarcodeFood] = useState<CustomFood | null>(null);
  const [manualName, setManualName] = useState('');
  const [manualUnit, setManualUnit] = useState('');
  const [manualGrams, setManualGrams] = useState(100);
  const [manualKcal, setManualKcal] = useState(150);
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

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

  // Effective selected food: database selection wins over the legacy chip.
  const dbEntry: FoodDBEntry | undefined = dbKey ? FOOD_DB.find((f) => f.key === dbKey) : undefined;
  const legacy = IRANIAN_FOODS.find((f) => f.key === foodKey) ?? IRANIAN_FOODS[0];
  const food = dbEntry ?? legacy;
  const previewKcal =
    mode === 'unit'
      ? kcalForUnits(food, qty)
      : mode === 'grams'
        ? kcalForGrams(food, grams)
        : Math.round((customKcal100 / 100) * grams);
  const searchResults = search.trim() ? searchFoodDB(search).slice(0, 12) : [];

  const refresh = () => {
    setEntries(getTodayFoodLog());
    setTotal(todayFoodKcal());
    setRecent(getRecentFoods());
    setMeals(getSavedMeals());
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

  const runBarcodeSearch = () => {
    const found = lookupBarcode(barcode);
    setBarcodeFood(found);
    setBarcodeState(found ? 'hit' : 'miss');
    if (!found) setManualName('');
  };

  const saveBarcodeFood = () => {
    const name = manualName.trim();
    const unit = manualUnit.trim();
    if (!barcode.trim() || !name || !unit || manualGrams <= 0 || manualKcal < 0) return;
    const parseOpt = (v: string) => {
      const n = parseFloat(v);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    const saved = saveCustomFood({
      barcode: barcode.trim(),
      nameFa: name,
      nameEn: name,
      unitFa: unit,
      unitEn: unit,
      gramsPerUnit: manualGrams,
      kcalPerUnit: manualKcal,
      proteinG: parseOpt(manualProtein),
      carbsG: parseOpt(manualCarbs),
      fatG: parseOpt(manualFat),
    });
    const found = saved.find((f) => f.barcode.replace(/[\s-]/g, '') === barcode.replace(/[\s-]/g, '')) ?? null;
    setBarcodeFood(found);
    setBarcodeState(found ? 'hit' : 'miss');
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
            className={`chip${foodKey === f.key && mode !== 'custom' && !dbKey ? ' chip--active' : ''}`}
            aria-pressed={foodKey === f.key && mode !== 'custom' && !dbKey}
            onClick={() => {
              setFoodKey(f.key);
              setDbKey(null);
              setMode('unit');
            }}
          >
            {fa ? f.nameFa : f.nameEn}
          </button>
        ))}
      </div>

      <label className="card-meta" style={{ display: 'block', marginBottom: 4 }}>{L.searchDb}</label>
      <input
        className="input"
        type="text"
        value={search}
        placeholder={L.searchPlaceholder}
        aria-label={L.searchDb}
        data-food-search
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 8 }}
      />
      {search.trim() !== '' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }} data-food-search-results>
          {searchResults.length === 0 ? (
            <p className="card-meta" style={{ margin: 0 }}>{fa ? 'چیزی پیدا نشد.' : 'Nothing found.'}</p>
          ) : (
            searchResults.map((f) => (
              <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <span>
                  {fa ? f.nameFa : f.nameEn} — {fa ? f.unitFa : f.unitEn} · {fmt(f.kcalPerUnit)} {L.kcal}
                </span>
                <button
                  type="button"
                  className="chip"
                  data-food-search-pick={f.key}
                  onClick={() => {
                    setDbKey(f.key);
                    setMode('unit');
                  }}
                >
                  {L.select}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }} role="group" aria-label={L.unit}>
        <button type="button" className={`chip${mode === 'unit' ? ' chip--active' : ''}`} onClick={() => setMode('unit')}>
          {fa ? food.unitFa : food.unitEn}
        </button>
        <button type="button" className={`chip${mode === 'grams' ? ' chip--active' : ''}`} onClick={() => setMode('grams')}>
          {L.grams}
        </button>
        <button type="button" className={`chip${mode === 'custom' ? ' chip--active' : ''}`} onClick={() => setMode('custom')}>
          {fa ? 'غذای دلخواه' : 'Custom'}
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
          <span className="card-meta">{L.qty} ({fa ? food.unitFa : food.unitEn})</span>
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

      {mode !== 'custom' && (
        <NutrientPanel foodKey={food.key} nameFa={food.nameFa} nameEn={food.nameEn} qty={mode === 'unit' ? qty : 1} />
      )}

      {/* Barcode entry + lookup (locally saved foods only; no camera claim). */}
      <div style={{ marginTop: 16 }} data-barcode-section>
        <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{L.barcodeTitle}</p>
        <p className="card-meta" style={{ margin: '0 0 8px' }}>{L.barcodeNote}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            value={barcode}
            placeholder={L.barcodePlaceholder}
            aria-label={L.barcodeTitle}
            data-barcode-input
            onChange={(e) => setBarcode(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <button type="button" className="chip" data-barcode-search onClick={runBarcodeSearch}>
            {L.barcodeSearch}
          </button>
        </div>
        {barcodeState === 'hit' && barcodeFood && (
          <div data-barcode-hit style={{ marginTop: 8 }}>
            <p className="card-meta" style={{ margin: '0 0 6px' }}>
              {L.barcodeHit} {fa ? barcodeFood.nameFa : barcodeFood.nameEn} — {fmt(barcodeFood.kcalPerUnit)} {L.kcal} / {fa ? barcodeFood.unitFa : barcodeFood.unitEn}
            </p>
            <button
              type="button"
              className="btn-primary"
              data-barcode-add
              onClick={() => {
                addFoodLogEntry({
                  foodKey: null,
                  nameFa: barcodeFood.nameFa,
                  nameEn: barcodeFood.nameEn,
                  qty: 1,
                  unitFa: barcodeFood.unitFa,
                  unitEn: barcodeFood.unitEn,
                  grams: barcodeFood.gramsPerUnit,
                  kcal: barcodeFood.kcalPerUnit,
                });
                refresh();
              }}
            >
              {L.barcodeAdd}
            </button>
          </div>
        )}
        {barcodeState === 'miss' && (
          <div data-barcode-miss data-barcode-manual style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p className="card-meta" style={{ margin: 0 }}>{L.barcodeMiss}</p>
            <input className="input" type="text" value={manualName} placeholder={L.manualName} aria-label={L.manualName} data-barcode-name onChange={(e) => setManualName(e.target.value)} />
            <input className="input" type="text" value={manualUnit} placeholder={L.manualUnit} aria-label={L.manualUnit} data-barcode-unit onChange={(e) => setManualUnit(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="input" type="number" min={0} value={manualGrams} placeholder={L.manualGrams} aria-label={L.manualGrams} data-barcode-grams onChange={(e) => setManualGrams(Math.max(0, parseInt(e.target.value, 10) || 0))} style={{ flex: 1, minWidth: 120 }} />
              <input className="input" type="number" min={0} value={manualKcal} placeholder={L.manualKcal} aria-label={L.manualKcal} data-barcode-kcal onChange={(e) => setManualKcal(Math.max(0, parseInt(e.target.value, 10) || 0))} style={{ flex: 1, minWidth: 120 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="input" type="number" min={0} value={manualProtein} placeholder={L.manualProtein} aria-label={L.manualProtein} onChange={(e) => setManualProtein(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
              <input className="input" type="number" min={0} value={manualCarbs} placeholder={L.manualCarbs} aria-label={L.manualCarbs} onChange={(e) => setManualCarbs(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
              <input className="input" type="number" min={0} value={manualFat} placeholder={L.manualFat} aria-label={L.manualFat} onChange={(e) => setManualFat(e.target.value)} style={{ flex: 1, minWidth: 120 }} />
            </div>
            <button type="button" className="btn-primary" data-barcode-save onClick={saveBarcodeFood}>
              {L.barcodeSave}
            </button>
          </div>
        )}
      </div>

      {/* Recent foods — one-tap re-add. */}
      <div style={{ marginTop: 16 }} data-recent-section>
        <p style={{ margin: '0 0 8px', fontWeight: 700 }}>{L.recentTitle}</p>
        {recent.length === 0 ? (
          <p className="card-meta" style={{ margin: 0 }}>{L.recentEmpty}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map((r) => (
              <div key={r.foodKey ?? r.nameFa} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                <span data-recent-food={r.foodKey ?? r.nameFa}>
                  {fa ? r.nameFa : r.nameEn} — {fmt(r.qty)} {fa ? r.unitFa : r.unitEn} · {fmt(r.kcal)} {L.kcal}
                </span>
                <button
                  type="button"
                  className="chip"
                  data-recent-readd
                  onClick={() => {
                    readdRecentFood(r);
                    refresh();
                  }}
                >
                  {L.readd}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved meals — one-tap whole-meal re-add. */}
      <div style={{ marginTop: 16 }} data-saved-section>
        <p style={{ margin: '0 0 8px', fontWeight: 700 }}>{L.savedTitle}</p>
        {meals.length === 0 ? (
          <p className="card-meta" style={{ margin: 0 }}>{L.savedEmpty}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {meals.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <span data-saved-meal={m.id}>
                  {fa ? m.nameFa : m.nameEn} — {m.items.length} {fa ? 'غذا' : 'items'} · {fmt(m.items.reduce((n, it) => n + it.kcal, 0))} {L.kcal}
                </span>
                <span style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="chip"
                    data-saved-readd
                    onClick={() => {
                      readdSavedMeal(m);
                      refresh();
                    }}
                  >
                    {L.readdMeal}
                  </button>
                  <button
                    type="button"
                    className="chip"
                    data-saved-remove
                    onClick={() => {
                      removeSavedMeal(m.id);
                      refresh();
                    }}
                  >
                    {L.remove}
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            className="input"
            type="text"
            value={mealName}
            placeholder={L.saveMealName}
            aria-label={L.saveMealName}
            data-save-meal-name
            onChange={(e) => setMealName(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <button
            type="button"
            className="chip"
            data-save-meal
            onClick={() => {
              const saved = saveMeal(
                mealName,
                entries.map((e) => ({
                  foodKey: e.foodKey,
                  nameFa: e.nameFa,
                  nameEn: e.nameEn,
                  qty: e.qty,
                  unitFa: e.unitFa,
                  unitEn: e.unitEn,
                  grams: e.grams,
                  kcal: e.kcal,
                })),
              );
              if (saved) {
                setMealName('');
                refresh();
              }
            }}
          >
            {L.saveMeal}
          </button>
        </div>
      </div>

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
                  <span data-log-entry>
                    {fa ? e.nameFa : e.nameEn} — {fmt(e.qty)} {fa ? e.unitFa : e.unitEn}
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
