/**
 * Musclepro — voice food logging (later phase, now in scope).
 *
 * The user speaks what they ate — typically ONE complete voice before
 * sleep covering the day, with extra voice entries (evening + night)
 * allowed and accumulating — and the app turns it into food items.
 * Dinner may be announced BEFORE eating it (prospective logging).
 *
 * Honesty rules in the UI itself:
 * - If live Persian speech recognition is unavailable in this browser,
 *   the user types/pastes the spoken text instead, and the screen says
 *   so plainly ("متن ویس" mode) — the parsing is identical either way.
 * - The summary is EDITABLE: correct any parsed item, remove it, or
 *   add a missing item before confirming. Nothing is saved until the
 *   user presses confirm. Calories are general estimates only.
 * - Anything the parser cannot match is shown as "تشخیص داده نشد"
 *   for correction — never silently dropped, never guessed.
 */

import { useMemo, useRef, useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { FOOD_DB, type FoodDBItem } from '../lib/foodDB';
import {
  createSpeechRecognizer,
  parseVoiceText,
  speechRecognitionAvailable,
  type VoiceFoodItem,
} from '../lib/voiceFood';
import { addFoodLogEntry, getTodayFoodLog } from '../lib/food';

const KEYS = {
  fa: {
    title: 'ثبت غذا با ویس',
    subtitle: 'معمولاً یک ویس کامل قبل از خواب برای کل روز کافی است؛ اگر عصر اعلام کردی و شب هم خواستی، دوباره با ویس اعلام کن — به مجموع همان روز اضافه می‌شود. شام را حتی قبل از خوردن هم می‌توانی با ویس بگویی.',
    record: 'ضبط ویس',
    listening: 'در حال گوش‌دادن…',
    stop: 'پایان ضبط',
    textMode: 'متن ویس (مرورگرت تشخیص گفتار فارسی ندارد — متن را بنویس یا بچسبان)',
    textPlaceholder: 'مثلاً: صبح نان و پنیر و دو عدد تخم‌مرغ، ناهار دو سیخ کباب کوبیده با چلو، سه لیوان آب',
    parse: 'تشخیص غذاها',
    summary: 'خلاصه‌ی ویس — قبل از تأیید، اصلاح یا اضافه کن',
    total: 'مجموع کالری برآوردی',
    water: 'لیوان آب',
    confirm: 'تأیید و ثبت',
    cancel: 'بی‌خیال',
    editQty: 'مقدار',
    remove: 'حذف',
    addMissing: 'افزودن مورد جاافتاده',
    add: 'افزودن',
    unmatched: 'تشخیص داده نشد — اصلاح کن یا اضافه کن:',
    estimateNote: 'همه‌ی کالری‌ها برآورد عمومی‌اند، نه توصیه‌ی شخصی و نه تشخیص. اگر شام را قبل از خوردن اعلام کردی و بعد عوض شد، همین‌جا اصلاحش کن.',
    saved: 'ثبت شد.',
    sttNote: 'تشخیص گفتار زنده در این مرورگر در دسترس است.',
    sttUnavailable: 'تشخیص گفتار زنده در این مرورگر در دسترس نیست — از حالت متن ویس استفاده کن.',
  },
  en: {
    title: 'Log food by voice',
    subtitle: 'Usually one complete voice before sleep covers the day; if you logged in the evening and want to log again at night, voice again — it adds to the same day total. You can even announce dinner before eating it.',
    record: 'Record voice',
    listening: 'Listening…',
    stop: 'Stop recording',
    textMode: 'Voice text (your browser has no Persian speech recognition — type or paste the text)',
    textPlaceholder: 'e.g. breakfast bread and cheese and two eggs, lunch two skewers of koobideh with rice, three glasses of water',
    parse: 'Detect foods',
    summary: 'Voice summary — correct or add before confirming',
    total: 'Estimated total calories',
    water: 'glasses of water',
    confirm: 'Confirm and save',
    cancel: 'Cancel',
    editQty: 'Amount',
    remove: 'Remove',
    addMissing: 'Add a missing item',
    add: 'Add',
    unmatched: 'Not recognised — correct or add:',
    estimateNote: 'All calories are general estimates, not personal advice or a diagnosis. If you announced dinner before eating and it changed, correct it here.',
    saved: 'Saved.',
    sttNote: 'Live speech recognition is available in this browser.',
    sttUnavailable: 'Live speech recognition is not available in this browser — use voice-text mode.',
  },
} as const;

function sourcesFromDB(): Array<{
  key: string;
  nameFa: string;
  nameEn: string;
  unitFa: string;
  unitEn: string;
  gramsPerUnit: number;
  kcalPerUnit: number;
  aliasesFa?: string[];
}> {
  return FOOD_DB.map((f: FoodDBItem) => ({
    key: f.key,
    nameFa: f.nameFa,
    nameEn: f.nameEn,
    unitFa: f.unitFa,
    unitEn: f.unitEn,
    gramsPerUnit: f.gramsPerUnit,
    kcalPerUnit: f.kcalPerUnit,
    aliasesFa: f.aliasesFa,
  }));
}

export default function VoiceFoodLog(): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);
  const sttAvailable = useMemo(() => speechRecognitionAvailable(), []);
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [items, setItems] = useState<VoiceFoodItem[] | null>(null);
  const [water, setWater] = useState(0);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [addName, setAddName] = useState('');
  const [addKcal, setAddKcal] = useState(150);
  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer>>(null);

  const handleParse = () => {
    const result = parseVoiceText(text, sourcesFromDB());
    setItems(result.items);
    setWater(result.waterGlasses);
    setUnmatched(result.unmatchedText);
    setSaved(false);
  };

  const handleRecord = () => {
    if (listening) {
      recognizerRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = createSpeechRecognizer(
      (spoken) => {
        setText((prev) => (prev ? `${prev} ${spoken}` : spoken));
        setListening(false);
      },
      () => setListening(false),
    );
    if (!rec) return;
    recognizerRef.current = rec;
    rec.start();
    setListening(true);
  };

  const totalKcal = items ? items.reduce((n, it) => n + it.kcal, 0) : 0;

  const handleConfirm = () => {
    if (!items) return;
    for (const it of items) {
      if (it.confidence === 'unmatched') continue;
      addFoodLogEntry({
        foodKey: it.foodKey,
        nameFa: it.nameFa,
        nameEn: it.nameEn,
        qty: it.qty,
        unitFa: it.unitFa,
        unitEn: it.unitEn,
        grams: it.grams,
        kcal: it.kcal,
      });
    }
    if (water > 0) {
      addFoodLogEntry({
        foodKey: 'water',
        nameFa: 'آب',
        nameEn: 'Water',
        qty: water,
        unitFa: 'لیوان',
        unitEn: 'glass',
        grams: water * 250,
        kcal: 0,
      });
    }
    setSaved(true);
    setItems(null);
    setUnmatched([]);
    setText('');
    void getTodayFoodLog;
  };

  const updateItem = (index: number, patch: Partial<VoiceFoodItem>) => {
    if (!items) return;
    setItems(items.map((it, i) => (i === index ? { ...it, ...patch, kcal: Math.round((patch.qty ?? it.qty) * (it.grams > 0 && it.qty > 0 ? it.kcal / it.qty : 0)) || it.kcal } : it)));
  };

  return (
    <section className="card" id="voice-food-log" data-voice-food-log>
      <h3 className="card-title">{L.title}</h3>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>{L.subtitle}</p>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>
        {sttAvailable ? L.sttNote : L.sttUnavailable}
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <button type="button" className="btn-primary" onClick={handleRecord} disabled={!sttAvailable}>
          {listening ? L.listening : L.record}
        </button>
        {listening && (
          <button type="button" className="chip" onClick={handleRecord}>{L.stop}</button>
        )}
      </div>

      <label className="card-meta" style={{ display: 'block', marginBottom: 4 }}>{L.textMode}</label>
      <textarea
        className="input"
        style={{ width: '100%', minHeight: 72, marginBottom: 12 }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={L.textPlaceholder}
        dir={lang === 'fa' ? 'rtl' : 'ltr'}
      />
      <button type="button" className="btn-primary" onClick={handleParse} disabled={!text.trim()}>
        {L.parse}
      </button>

      {saved && <p className="card-meta" style={{ marginTop: 12 }}>{L.saved}</p>}

      {items && (
        <div style={{ marginTop: 16 }}>
          <h4 className="card-title" style={{ fontSize: 'var(--text-base)' }}>{L.summary}</h4>
          <p className="card-meta">
            {L.total}: {fmt(totalKcal)} · {water > 0 ? `${fmt(water)} ${L.water}` : ''}
          </p>
          {items.length === 0 && <p className="card-meta">{L.unmatched}</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {items.map((it, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ flex: 1 }}>{it.nameFa} — {fmt(it.qty)} {it.unitFa} · {fmt(it.kcal)} kcal</span>
                <label className="card-meta">
                  {L.editQty}
                  <input
                    className="input"
                    type="number"
                    min={0.5}
                    step={0.5}
                    style={{ width: 72, marginInlineStart: 4 }}
                    value={it.qty}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!Number.isNaN(v) && v > 0) updateItem(i, { qty: v });
                    }}
                  />
                </label>
                <button type="button" className="chip" onClick={() => setItems(items.filter((_, j) => j !== i))}>
                  {L.remove}
                </button>
              </div>
            ))}
          </div>

          {unmatched.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p className="card-meta">{L.unmatched}</p>
              <ul className="card-meta" style={{ margin: '4px 0' }}>
                {unmatched.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
            <input
              className="input"
              style={{ flex: 1, minWidth: 140 }}
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              placeholder={L.addMissing}
            />
            <input
              className="input"
              type="number"
              min={0}
              style={{ width: 90 }}
              value={addKcal}
              onChange={(e) => setAddKcal(parseFloat(e.target.value) || 0)}
            />
            <button
              type="button"
              className="chip"
              onClick={() => {
                const name = addName.trim();
                if (!name) return;
                setItems([
                  ...(items ?? []),
                  { foodKey: null, nameFa: name, nameEn: name, qty: 1, unitFa: 'واحد', unitEn: 'unit', grams: 100, kcal: addKcal, confidence: 'custom', raw: name },
                ]);
                setAddName('');
              }}
            >
              {L.add}
            </button>
          </div>

          <p className="card-meta" style={{ marginTop: 12 }}>{L.estimateNote}</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" className="btn-primary" onClick={handleConfirm} disabled={items.length === 0 && water === 0}>
              {L.confirm}
            </button>
            <button type="button" className="chip" onClick={() => { setItems(null); setUnmatched([]); }}>
              {L.cancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
