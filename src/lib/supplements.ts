/**
 * اپ هوشمند بدنسازی — supplement / vitamin log (logging ONLY).
 *
 * The user records vitamins or supplements they ALREADY take — scanned
 * from a QR/barcode or entered by hand. This is a private log, nothing
 * more: it never recommends a product, never says the user needs
 * anything, never judges a dose as right or wrong, and never checks
 * interactions. There is no product database and no product lookup:
 * a scanned code is stored exactly as scanned, and the product name
 * (and optional dose) is typed by the user — nothing is ever
 * auto-filled from anywhere.
 *
 * Stored in localStorage only — no account, no server, no network.
 * Safe outside a browser (tests, SSR): every access is guarded.
 */

const KEY = 'fitai.supplements';

export interface SupplementLogItem {
  id: string;
  name: string;
  dose?: string;
  code?: string;
  source: 'scan' | 'manual';
  addedAt: string; // ISO timestamp
}

function readRaw(): SupplementLogItem[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is SupplementLogItem =>
        !!x &&
        typeof x === 'object' &&
        typeof (x as SupplementLogItem).id === 'string' &&
        typeof (x as SupplementLogItem).name === 'string' &&
        ((x as SupplementLogItem).source === 'scan' || (x as SupplementLogItem).source === 'manual') &&
        typeof (x as SupplementLogItem).addedAt === 'string',
    );
  } catch {
    return [];
  }
}

function writeRaw(items: SupplementLogItem[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable — fail open */
  }
}

/** Logged items, newest first. */
export function getSupplementLog(): SupplementLogItem[] {
  return readRaw().sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
}

export function addSupplementLog(
  item: Omit<SupplementLogItem, 'id' | 'addedAt'>,
): SupplementLogItem {
  const entry: SupplementLogItem = {
    ...item,
    name: item.name.trim(),
    dose: item.dose?.trim() || undefined,
    code: item.code?.trim() || undefined,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    addedAt: new Date().toISOString(),
  };
  const items = readRaw();
  items.push(entry);
  writeRaw(items);
  return entry;
}

export function deleteSupplementLog(id: string): void {
  writeRaw(readRaw().filter((x) => x.id !== id));
}
