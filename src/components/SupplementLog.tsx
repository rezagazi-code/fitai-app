/**
 * اپ هوشمند بدنسازی — supplement / vitamin log section (Profile tab).
 *
 * Logging ONLY: the list shows what the user recorded taking — name,
 * the dose they typed, the scanned code if any, and the date. It never
 * recommends a product, never says the user needs anything, never
 * judges a dose, and never checks interactions. All data is local.
 */
import { useState, type ReactElement } from 'react';
import type { Lang } from '../lib/i18n';
import {
  deleteSupplementLog,
  getSupplementLog,
  type SupplementLogItem,
} from '../lib/supplements';
import SupplementScanner from './SupplementScanner';

interface Props {
  k: Record<string, string>;
  lang: Lang;
}

export default function SupplementLog({ k, lang }: Props): ReactElement {
  const [items, setItems] = useState<SupplementLogItem[]>(() => getSupplementLog());
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerManual, setScannerManual] = useState(false);

  const refresh = (): void => setItems(getSupplementLog());

  const dateFmt = new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <section className="card" data-supplement-log>
      <h2 className="card-title">{k.suppTitle}</h2>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>{k.suppNote}</p>
      {items.length === 0 ? (
        <p className="card-meta" style={{ margin: '0 0 12px' }}>{k.suppEmpty}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {items.map((item) => (
            <div
              key={item.id}
              data-supplement-item={item.id}
              style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}
            >
              <span style={{ fontSize: 'var(--text-body)', fontWeight: 700, display: 'flex', flexDirection: 'column' }}>
                <span>{item.name}</span>
                <span style={{ fontSize: '0.8125rem', opacity: 0.75, fontWeight: 400 }}>
                  {[item.dose, item.code ? `${k.suppCode}: ${item.code}` : '', dateFmt.format(new Date(item.addedAt))]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <button
                type="button"
                className="chip"
                onClick={() => {
                  deleteSupplementLog(item.id);
                  refresh();
                }}
              >
                {k.suppDelete}
              </button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setScannerManual(false);
            setScannerOpen(true);
          }}
        >
          {k.suppScan}
        </button>
        <button
          type="button"
          className="chip"
          onClick={() => {
            setScannerManual(true);
            setScannerOpen(true);
          }}
        >
          {k.suppManual}
        </button>
      </div>
      {scannerOpen && (
        <SupplementScanner
          k={k}
          initialManual={scannerManual}
          onSaved={refresh}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </section>
  );
}
