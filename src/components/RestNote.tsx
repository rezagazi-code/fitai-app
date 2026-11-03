/**
 * اپ هوشمند بدنسازی — rest explanation, shown BEFORE a program is
 * handed to the athlete (onboarding review and the monthly
 * next-block prompt). Plain words, general fitness terms only —
 * never a medical diagnosis, never a personal prescription.
 *
 * The rests themselves are not invented here: they come from the
 * program scheme (goal, level, compound vs isolation, role/volume).
 * This component only explains them.
 */
import type { ReactElement } from 'react';
import { useLang } from '../lib/i18n';

export interface RestSummary {
  avgSec: number;
  minSec: number;
  maxSec: number;
}

const TEXT = {
  fa: {
    title: 'پیش از دریافت برنامه، درباره استراحت‌ها',
    body1:
      'اگر در برنامه‌ات استراحت‌های زیادی می‌بینی، دلیلش وضعیت فعلی بدنت است: سطح آمادگی، تجربه و ریکاوری‌ات در حال حاضر. استراحت‌ها بر اساس هدف، سطح، نوع حرکت (ترکیبی یا تک‌عضله‌ای)، حجم تمرین و پیشرفتت تنظیم شده‌اند؛ حرکت‌های سنگین و ترکیبی استراحت بیشتری می‌خواهند تا بتوانی با فرم خوب ادامه بدهی.',
    body2:
      'هرچه جلوتر بروی و آمادگی و ریکاوری‌ات بهتر شود، در بلوک‌های بعد می‌توانی استراحت‌ها را کمتر کنی و وزنه‌ها را بیشتر کنی. عجله برای کم‌کردن استراحت، فرم را خراب می‌کند — پیشرفت، پله‌پله اتفاق می‌افتد.',
    summary: (avg: string, min: string, max: string) =>
      `در این برنامه، استراحت میانگین ${avg} ثانیه است (بین ${min} تا ${max} ثانیه)؛ حرکت‌های سنگین‌تر استراحت بیشتری دارند.`,
    disclaimer: 'این توضیح عمومی درباره تناسب اندام است، نه تشخیص پزشکی.',
  },
  en: {
    title: 'Before you receive your program: about rests',
    body1:
      'If your program has a lot of rests, that is because of your current body condition: your present fitness level, experience, and recovery. Rests are set by your goal, level, movement type (compound or isolation), training volume, and progress; heavier compound movements need longer rests so you can continue with good form.',
    body2:
      'As you progress and your fitness and recovery improve, later blocks can shorten your rests and add load. Rushing to cut rests breaks form — progress happens step by step.',
    summary: (avg: string, min: string, max: string) =>
      `In this program, the average rest is ${avg} seconds (from ${min} to ${max} seconds); heavier movements rest longer.`,
    disclaimer: 'This is general fitness information, not a medical diagnosis.',
  },
} as const;

export default function RestNote({ summary }: { summary?: RestSummary }): ReactElement {
  const { lang } = useLang();
  const t = TEXT[lang === 'fa' ? 'fa' : 'en'];
  const digits = new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US');
  return (
    <section className="card" data-rest-note>
      <h2 className="card-title">{t.title}</h2>
      <p className="card-meta">{t.body1}</p>
      <p className="card-meta">{t.body2}</p>
      {summary && (
        <p className="card-meta">
          {t.summary(digits.format(summary.avgSec), digits.format(summary.minSec), digits.format(summary.maxSec))}
        </p>
      )}
      <p className="card-meta">{t.disclaimer}</p>
    </section>
  );
}
