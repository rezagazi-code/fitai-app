/**
 * اپ هوشمند بدنسازی — next-block offer card (Home).
 *
 * Shown only when a 4-week block has ended (or its deload week has
 * started) and the offer for that block was neither accepted nor
 * dismissed. The athlete sees what changed and why BEFORE anything
 * changes: accept saves + activates the progressed program (old
 * records stay), keep-old dismisses the offer for this block only.
 * The rest explanation sits inside the card, above the buttons, so
 * it is read before the new program is handed over — never after.
 */
import { useMemo, useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { getSessions, type WorkoutProgram } from '../lib/store';
import {
  acceptNextBlockOffer,
  buildNextBlockOffer,
  dismissNextBlockOffer,
  getDueBlock,
} from '../lib/nextBlock';
import { getSchedule } from '../lib/schedule';
import RestNote from './RestNote';

const TEXT = {
  fa: {
    title: 'بلوک بعد آماده است',
    intro:
      'بلوک ۴ هفته‌ای‌ات تمام شد. بر اساس تمرین‌هایی که واقعاً ثبت کردی، برنامه‌ی پیشرفت‌کرده‌ی بعدی ساخته شده است — وزنه‌ها و تکرارها از عملکرد خودت جلو رفته‌اند، نه از یک قالب آماده.',
    noProgressTitle: 'بلوک تمام شد، ولی پیشرفتی ثبت نشده است',
    noProgressBody:
      'در این بلوک داده‌ی تمرینی کافی برای ساختن برنامه‌ی پیشرفت‌کرده پیدا نشد (جلسه‌ای ثبت نشده یا تغییری دیده نشده). با پذیرش، همین ساختار با یک بلوک تازه شروع می‌شود و رکوردهایت سر جایشان می‌مانند؛ یا می‌توانی همین برنامه‌ی فعلی را نگه داری.',
    changedLabel: 'چه چیزی تغییر کرد',
    progressLabel: 'پیشرفت وزنه/تکرار',
    swapLabel: 'جایگزین به‌علت توقف پیشرفت',
    moreChanges: (n: string) => `و ${n} تغییر دیگر`,
    accept: 'دریافت برنامه جدید',
    keepOld: 'همین برنامه فعلی بماند',
    acceptedNote: 'برنامه‌ی جدید فعال شد — بلوک تازه از همین هفته شروع می‌شود.',
  },
  en: {
    title: 'Your next block is ready',
    intro:
      'Your 4-week block is done. Based on the training you actually logged, a progressed next program was built — weights and reps moved forward from your own performance, not from a fixed template.',
    noProgressTitle: 'Block done, but no progress was recorded',
    noProgressBody:
      'Not enough training data was found in this block to build a progressed program (no sessions logged, or no change seen). Accepting restarts the same structure in a fresh block and keeps your records; or keep the current program.',
    changedLabel: 'What changed',
    progressLabel: 'Weight/rep progression',
    swapLabel: 'Swap after a plateau',
    moreChanges: (n: string) => `and ${n} more changes`,
    accept: 'Get the new program',
    keepOld: 'Keep the current program',
    acceptedNote: 'New program activated — the fresh block starts this week.',
  },
} as const;

export default function NextBlockOffer({
  program,
  onAccepted,
  forceOpen,
}: {
  program: WorkoutProgram;
  onAccepted: () => void;
  /**
   * On-demand open (Home "برنامه ماه بعد" action): bypass the week-4
   * due gate and preview the next block for the CURRENT block, using
   * the same builder, rest summary and RestNote. Nothing is applied
   * on open; accept uses the same path; keep writes NO dismiss state
   * (so the week-4 offer is never suppressed by a peek).
   */
  forceOpen?: boolean;
}): ReactElement | null {
  const { lang } = useLang();
  const t = TEXT[lang === 'fa' ? 'fa' : 'en'];
  const digits = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US');
  const [done, setDone] = useState<null | 'accepted' | 'kept'>(null);

  const offer = useMemo(() => {
    const sessions = getSessions();
    if (forceOpen) {
      const current = getSchedule(program, new Date(), sessions).blockNumber;
      return { due: current, offer: buildNextBlockOffer(program, current, sessions) };
    }
    const due = getDueBlock(program, new Date(), sessions);
    if (due == null) return null;
    return { due, offer: buildNextBlockOffer(program, due, sessions) };
  }, [program, forceOpen]);

  if (done === 'accepted') {
    return (
      <section className="card" data-next-block="accepted">
        <p className="card-meta">{t.acceptedNote}</p>
      </section>
    );
  }
  if (done === 'kept' || !offer || !offer.offer) return null;

  const { due, offer: next } = offer;
  const shown = next.changes.slice(0, 8);
  const remaining = next.changes.length - shown.length;

  return (
    <section className="card" data-next-block="offer">
      <h2 className="card-title">{next.changes.length > 0 ? t.title : t.noProgressTitle}</h2>
      <p className="card-meta">{next.changes.length > 0 ? t.intro : t.noProgressBody}</p>
      <RestNote
        summary={{
          avgSec: next.restAvgSec,
          minSec: next.restMinSec,
          maxSec: next.restMaxSec,
        }}
      />
      {shown.length > 0 && (
        <>
          <p className="card-meta" style={{ marginTop: 12 }}>
            {t.changedLabel} ({digits.format(next.changes.length)}):
          </p>
          <ul style={{ margin: '8px 0', paddingInlineStart: 20 }}>
            {shown.map((c) => (
              <li key={`${c.oldExerciseKey}->${c.exerciseKey}`} className="card-meta">
                {c.reason === 'plateau-swap' ? t.swapLabel : t.progressLabel}: {c.nameFa} — {c.oldLabelFa} → {c.newLabelFa}
              </li>
            ))}
          </ul>
          {remaining > 0 && <p className="card-meta">{t.moreChanges(digits.format(remaining))}</p>}
        </>
      )}
      <button
        type="button"
        className="btn-primary btn-shine"
        style={{ width: '100%', marginTop: 12 }}
        onClick={() => {
          acceptNextBlockOffer(program, next);
          setDone('accepted');
          onAccepted();
        }}
      >
        {t.accept}
      </button>
      <button
        type="button"
        className="btn-ghost"
        style={{ width: '100%', marginTop: 8 }}
        onClick={() => {
          // On-demand peek must not dismiss the real week-4 offer.
          if (!forceOpen) dismissNextBlockOffer(program, due);
          setDone('kept');
        }}
      >
        {t.keepOld}
      </button>
    </section>
  );
}
