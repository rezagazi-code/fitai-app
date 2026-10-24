/**
 * اپ هوشمند بدنسازی — Profile tab placeholder.
 * The profile agent will FULLY REWRITE this file. Keep tiny.
 */
import type { ReactElement } from 'react';
import { useLang } from '../lib/i18n';

export default function ProfileTab(): ReactElement {
  const { t } = useLang();
  return (
    <section className="card">
      <h2 className="card-title">{t('shell.profile')}</h2>
      <p className="stub-note">{t('shell.comingSoon')}</p>
    </section>
  );
}
