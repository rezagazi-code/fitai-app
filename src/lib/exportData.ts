/**
 * Musclepro — free data export (second-priority dossier item).
 *
 * The user can take ALL of their local data, any time, as one JSON
 * file — no lock-in, no paywall, no server. The export reads every
 * fitai.* localStorage key (plus the login profile, which is local
 * too) and offers it as a download. Nothing leaves the device except
 * through the file the user themselves saves.
 */

export interface DataExport {
  app: 'Musclepro';
  exportedAt: string;
  note: string;
  data: Record<string, unknown>;
}

export function buildDataExport(): DataExport {
  const data: Record<string, unknown> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('fitai.')) continue;
      try {
        data[key] = JSON.parse(localStorage.getItem(key) ?? 'null');
      } catch {
        data[key] = localStorage.getItem(key);
      }
    }
  } catch {
    /* storage unavailable — export what we have (empty) */
  }
  return {
    app: 'Musclepro',
    exportedAt: new Date().toISOString(),
    note: 'General export of your locally stored Musclepro data. Food calories are general estimates.',
    data,
  };
}

export function downloadDataExport(): void {
  const payload = buildDataExport();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `musclepro-export-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
