/**
 * Musclepro — continuity thread + month letter (second-priority).
 *
 * The thread is not a flame streak: one missed day never breaks it.
 * A week counts when the user trained at least once; the thread is
 * the run of kept weeks, and the weekly goal (3 sessions) is shown
 * as progress, not as a shaming pass/fail. The month letter is
 * generated ONLY from stored data — empty months say so plainly,
 * and no number is invented.
 */

import type { ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { getContinuity, getMonthLetter } from '../lib/continuity';

const KEYS = {
  fa: {
    title: 'رشته‌ی پیوستگی و نامه‌ی ماه',
    thread: 'رشته‌ی پیوستگی (هفته‌های پیاپی با حداقل یک تمرین)',
    longest: 'طولانی‌ترین رشته',
    weekGoal: 'هدف هفتگی: ۳ جلسه',
    thisWeek: 'این هفته',
    sessions: 'جلسه',
    monthTitle: 'نامه‌ی ماه',
    monthEmpty: 'این ماه هنوز تمرینی ثبت نشده است — نامه وقتی نوشته می‌شود که داده باشد.',
    monthBody: 'این ماه {sessions} جلسه تمرین کردی، {sets} ست انجام دادی و حجم کلی‌ات {volume} کیلوگرم بود. {prs} رکورد شخصی ثبت شد و در {foodDays} روز غذا ثبت کردی ({foodKcal} کالری برآوردی). {score} رشته‌ی پیوستگی‌ات {thread} هفته است — یک روز از دست‌رفته، رشته را نمی‌شکند؛ هفته‌ی بعد ادامه بده.',
    scorePart: 'امتیاز عمومی سلامت و چربی‌سوزی‌ات {score} از ۱۰۰ است. ',
    noScorePart: '',
  },
  en: {
    title: 'Continuity thread & month letter',
    thread: 'Continuity thread (consecutive weeks with at least one workout)',
    longest: 'Longest thread',
    weekGoal: 'Weekly goal: 3 sessions',
    thisWeek: 'This week',
    sessions: 'sessions',
    monthTitle: 'Month letter',
    monthEmpty: 'No workouts recorded this month yet — the letter is written when there is data.',
    monthBody: 'This month you trained {sessions} sessions, did {sets} sets, and lifted {volume} kg in total. You set {prs} personal records and logged food on {foodDays} days ({foodKcal} estimated kcal). {score} Your continuity thread is {thread} weeks — one missed day does not break it; keep going next week.',
    scorePart: 'Your general health & fat-burn score is {score} out of 100. ',
    noScorePart: '',
  },
} as const;

export default function ContinuityPanel(): ReactElement {
  const { lang } = useLang();
  const L = KEYS[lang === 'fa' ? 'fa' : 'en'];
  const fmt = (n: number) => new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);
  const cont = getContinuity();
  const month = getMonthLetter();
  const scorePart = month.healthScore !== null
    ? (lang === 'fa' ? L.scorePart : L.scorePart).replace('{score}', fmt(month.healthScore))
    : L.noScorePart;
  const body = L.monthBody
    .replace('{sessions}', fmt(month.sessions))
    .replace('{sets}', fmt(month.sets))
    .replace('{volume}', fmt(month.volumeKg))
    .replace('{prs}', fmt(month.prs))
    .replace('{foodDays}', fmt(month.foodDays))
    .replace('{foodKcal}', fmt(month.foodKcal))
    .replace('{score}', scorePart)
    .replace('{thread}', fmt(cont.threadWeeks));

  return (
    <section className="card" data-continuity-panel>
      <h3 className="card-title">{L.title}</h3>
      <p className="card-meta" style={{ margin: '0 0 4px' }}>
        {L.thread}: {fmt(cont.threadWeeks)} · {L.longest}: {fmt(cont.longestThread)}
      </p>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>
        {L.thisWeek}: {fmt(cont.thisWeekSessions)} / {fmt(cont.weeklyGoal)} {L.sessions} — {L.weekGoal}
      </p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }} aria-hidden="true">
        {cont.lastWeeks.map((kept, i) => (
          <span
            key={i}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: kept ? 'var(--accent-cyan, #00F0FF)' : 'rgba(255,255,255,0.12)',
              display: 'inline-block',
            }}
          />
        ))}
      </div>
      <h4 className="card-title" style={{ fontSize: 'var(--text-base)' }}>{L.monthTitle}</h4>
      {month.sessions === 0 && month.foodDays === 0 ? (
        <p className="card-meta" style={{ margin: 0 }}>{L.monthEmpty}</p>
      ) : (
        <p className="card-meta" style={{ margin: 0 }}>{body}</p>
      )}
    </section>
  );
}
