/**
 * اپ هوشمند بدنسازی — Log tab placeholder.
 * The session/logger agent will FULLY REWRITE this file. Keep tiny.
 */
import type { ReactElement } from 'react';
import { useLang } from '../lib/i18n';

export default function LogTab(): ReactElement {
  const { t } = useLang();
  return (
    <section className="card">
      <h2 className="card-title">{t('shell.log')}</h2>
      <p className="stub-note">{t('shell.comingSoon')}</p>
    </section>
  );
}
