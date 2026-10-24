/**
 * اپ هوشمند بدنسازی — Progress tab placeholder.
 * The progress agent will FULLY REWRITE this file. Keep tiny.
 */
import type { ReactElement } from 'react';
import { useLang } from '../lib/i18n';

export default function ProgressTab(): ReactElement {
  const { t } = useLang();
  return (
    <section className="card">
      <h2 className="card-title">{t('shell.progress')}</h2>
      <p className="stub-note">{t('shell.comingSoon')}</p>
    </section>
  );
}
