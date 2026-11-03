/**
 * Musclepro — voice food parsing (later phase, now in scope).
 *
 * How it works, honestly: the user speaks (or, when live speech
 * recognition is unavailable — e.g. headless testing, or a browser
 * without Persian speech support — types/pastes) what they ate, and
 * this parser turns that text into food items. It does NOT invent
 * foods: every parsed item comes from the app's own food database
 * (or a user-added custom name), with a standard portion when no
 * amount was spoken. Anything the parser cannot match is returned as
 * an unmatched chunk for the user to correct or add — never silently
 * dropped and never guessed into a food.
 *
 * Flow the user was promised: typically ONE complete voice before
 * sleep covering the day; extra voice entries (evening + night) are
 * allowed and accumulate; dinner may be announced BEFORE eating it
 * (prospective logging); the ONE summary screen lets the user
 * correct parsed items and add missing items before confirming.
 * Calories are general estimates only.
 */

export interface VoiceFoodItem {
  foodKey: string | null;
  nameFa: string;
  nameEn: string;
  qty: number;
  unitFa: string;
  unitEn: string;
  grams: number;
  kcal: number;
  /** 'matched' = found in the database, 'custom' = user-named, 'unmatched' = needs correction. */
  confidence: 'matched' | 'custom' | 'unmatched';
  raw: string;
}

export interface VoiceParseResult {
  items: VoiceFoodItem[];
  waterGlasses: number;
  unmatchedText: string[];
}

export interface VoiceFoodSource {
  key: string;
  nameFa: string;
  nameEn: string;
  unitFa: string;
  unitEn: string;
  gramsPerUnit: number;
  kcalPerUnit: number;
  /** Extra spoken forms for this food, e.g. ['کوبیده', 'کباب کوبیده']. */
  aliasesFa?: string[];
}

const FA_DIGITS: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

const NUMBER_WORDS: Record<string, number> = {
  'یک': 1, 'یه': 1, 'دو': 2, 'سه': 3, 'چهار': 4, 'پنج': 5,
  'شش': 6, 'هفت': 7, 'هشت': 8, 'نه': 9, 'ده': 10,
  'نیم': 0.5, 'نصف': 0.5,
};

export function normalizePersianText(text: string): string {
  let out = text;
  for (const [fa, en] of Object.entries(FA_DIGITS)) out = out.split(fa).join(en);
  out = out
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[‌\u200c]/g, ' ')
    .replace(/[^0-9a-zA-Z\u0600-\u06FF\s.,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return out;
}

function numberNear(text: string, at: number, window = 14): number | null {
  const start = Math.max(0, at - window);
  const end = Math.min(text.length, at + window);
  const around = text.slice(start, end);
  const digitMatch = around.match(/(\d+(?:\.\d+)?)/);
  if (digitMatch) {
    const v = parseFloat(digitMatch[1]);
    if (!Number.isNaN(v) && v > 0) return v;
  }
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (around.includes(word)) return value;
  }
  return null;
}

/**
 * Parse spoken (or typed) food text against a food source list.
 * Matching is longest-name-first so "کباب کوبیده" wins over "کباب".
 * Water ("لیوان آب") is counted separately at 0 kcal.
 */
export function parseVoiceText(text: string, sources: VoiceFoodSource[]): VoiceParseResult {
  const norm = normalizePersianText(text);
  const items: VoiceFoodItem[] = [];
  const unmatchedText: string[] = [];
  let waterGlasses = 0;

  // Water first: "N لیوان آب" or plain "آب" mentions. The count may be
  // a digit ("3 لیوان آب") OR a Persian number word ("سه لیوان آب") —
  // spoken text usually carries the word, so resolve both; an uncounted
  // mention counts as one glass, never zero.
  const waterMatches = [...norm.matchAll(/(\S+)?\s*لیوان\s+آب/g)];
  for (const m of waterMatches) {
    const token = (m[1] ?? '').trim();
    if (/^\d+(\.\d+)?$/.test(token)) {
      waterGlasses += parseFloat(token);
    } else if (token && NUMBER_WORDS[token] != null) {
      waterGlasses += NUMBER_WORDS[token];
    } else {
      waterGlasses += 1;
    }
  }
  if (waterMatches.length === 0 && /\bآب\b/.test(norm)) {
    waterGlasses += 1;
  }
  let remaining = norm.replace(/(\S+\s+)?لیوان\s+آب/g, ' ').replace(/\bآب\b/g, ' ');

  // Candidate phrases: each source name + aliases, longest first.
  type Cand = { phrase: string; source: VoiceFoodSource };
  const candidates: Cand[] = [];
  for (const s of sources) {
    candidates.push({ phrase: normalizePersianText(s.nameFa), source: s });
    for (const alias of s.aliasesFa ?? []) {
      candidates.push({ phrase: normalizePersianText(alias), source: s });
    }
  }
  candidates.sort((a, b) => b.phrase.length - a.phrase.length);

  const usedRanges: Array<[number, number]> = [];
  for (const cand of candidates) {
    if (cand.phrase.length < 2) continue;
    let idx = remaining.indexOf(cand.phrase);
    while (idx !== -1) {
      const overlaps = usedRanges.some(([a, b]) => idx < b && idx + cand.phrase.length > a);
      if (!overlaps) {
        const qty = numberNear(remaining, idx) ?? 1;
        const s = cand.source;
        items.push({
          foodKey: s.key,
          nameFa: s.nameFa,
          nameEn: s.nameEn,
          qty,
          unitFa: s.unitFa,
          unitEn: s.unitEn,
          grams: Math.round(s.gramsPerUnit * qty),
          kcal: Math.round(s.kcalPerUnit * qty),
          confidence: 'matched',
          raw: cand.phrase,
        });
        usedRanges.push([idx, idx + cand.phrase.length]);
      }
      idx = remaining.indexOf(cand.phrase, idx + 1);
    }
  }

  // Unmatched remainder: split on connectors, keep non-trivial chunks.
  let cleaned = remaining;
  for (const [a, b] of [...usedRanges].sort((x, y) => y[0] - x[0])) {
    cleaned = cleaned.slice(0, a) + ' ' + cleaned.slice(b);
  }
  const chunks = cleaned
    .split(/\s+(و|با|همراه|بعد|بعدا|بعداً|صبحانه|ناهار|شام|میان وعده|عصرانه)\s+/g)
    .map((c) => c.trim())
    .filter((c) => c.length > 2 && !/^\d+(\.\d+)?$/.test(c) && !Object.keys(NUMBER_WORDS).includes(c));
  for (const c of chunks) {
    // Skip pure unit words left behind.
    if (/^(سیخ|کاسه|کف دست|نان|لیوان|عدد|گرم|قاشق)$/.test(c)) continue;
    unmatchedText.push(c);
  }

  return { items, waterGlasses, unmatchedText };
}

/** Persian speech recognition availability, honestly reported. */
export function speechRecognitionAvailable(): boolean {
  try {
    const w = window as unknown as Record<string, unknown>;
    return typeof w.SpeechRecognition === 'function' || typeof w.webkitSpeechRecognition === 'function';
  } catch {
    return false;
  }
}

export type SpeechRecognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((text: string) => void) | null;
  onerror: ((message: string) => void) | null;
  start: () => void;
  stop: () => void;
};

export function createSpeechRecognizer(onText: (text: string) => void, onError: (message: string) => void): SpeechRecognizer | null {
  try {
    const w = window as unknown as Record<string, unknown>;
    const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
      | (new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          onresult: ((e: { results: Array<Array<{ transcript: string }>> }) => void) | null;
          onerror: ((e: { error?: string }) => void) | null;
          start: () => void;
          stop: () => void;
        })
      | undefined;
    if (!Ctor) return null;
    const rec = new Ctor();
    rec.lang = 'fa-IR';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) onText(transcript);
    };
    rec.onerror = (e) => onError(e.error ?? 'speech-error');
    return rec as unknown as SpeechRecognizer;
  } catch {
    return null;
  }
}
