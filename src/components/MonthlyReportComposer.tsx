/**
 * اپ هوشمند بدنسازی — trainee's monthly report for the coach.
 *
 * Compiles the last 30 days (finished sessions, done sets, volume,
 * PRs, latest measurement) + the trainee's own free-text needs
 * («احتیاجات») into one share code for the coach. Nothing here is a
 * diagnosis and nothing prescribes anything — it reports what was
 * logged and what the trainee says they need, in their own words.
 * Local bilingual strings (same contract as ProfileTab).
 */
import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { getExercise } from '../lib/exercises';
import {
  compileMonthlyReport,
  encodeCoachCode,
  getLoginIdentity,
  getSentMonthly,
  saveSentMonthly,
  whatsappShareUrl,
} from '../lib/coachLoop';

const K = {
  fa: {
    title: 'گزارش ماهانه برای مربی',
    sub: 'پیشرفت ۳۰ روز گذشته + احتیاجاتت را در یک کد برای مربی می‌فرستی؛ او هر ماه این را می‌بیند.',
    sessions: 'جلسات کامل‌شده',
    sets: 'ست‌های انجام‌شده',
    volume: 'حجم کل (کیلوگرم)',
    prs: 'رکوردهای شخصی',
    latestWeight: 'آخرین وزن',
    noSessions: 'هنوز جلسه‌ای در ۳۰ روز گذشته ثبت نشده است.',
    needsLabel: 'احتیاجات تو (متن آزاد)',
    needsPh: 'مثلاً: برای ماه بعد برنامه‌ی سنگین‌تر می‌خواهم / زانویم هنوز درد می‌کند / ...',
    makeCode: 'ساختن کد گزارش ماهانه',
    yourCode: 'کد گزارش ماهانه',
    codeHint: 'این کد را با واتس‌اپ برای مربی بفرست.',
    copy: 'کپی کد',
    copied: 'کپی شد',
    whatsapp: 'ارسال با واتس‌اپ',
    nameMissing: 'اول از پروفایل ورود، نام و نام خانوادگی را کامل کن.',
    sentOn: 'آخرین گزارش فرستاده شده',
  },
  en: {
    title: 'Monthly report for the coach',
    sub: 'Your last 30 days of progress + your needs go to the coach in one code; they see this every month.',
    sessions: 'Finished sessions',
    sets: 'Sets done',
    volume: 'Total volume (kg)',
    prs: 'Personal records',
    latestWeight: 'Latest weight',
    noSessions: 'No sessions logged in the last 30 days yet.',
    needsLabel: 'Your needs (free text)',
    needsPh: 'e.g. I want a heavier program next month / my knee still hurts / …',
    makeCode: 'Create monthly report code',
    yourCode: 'Monthly report code',
    codeHint: 'Send this code to your coach on WhatsApp.',
    copy: 'Copy code',
    copied: 'Copied',
    whatsapp: 'Send via WhatsApp',
    nameMissing: 'First complete your first and last name in the login profile.',
    sentOn: 'Last report sent',
  },
} as const;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

export default function MonthlyReportComposer(): ReactElement {
  const { lang } = useLang();
  const k = K[lang];
  const [needs, setNeeds] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<ReturnType<typeof compileMonthlyReport> | null>(null);
  const sent = getSentMonthly();
  const identity = getLoginIdentity();

  const makeCode = (): void => {
    if (!identity) return;
    const report = compileMonthlyReport(identity, needs);
    saveSentMonthly(report);
    setPreview(report);
    setCode(encodeCoachCode(report));
  };

  const onCopy = async (): Promise<void> => {
    if (!code) return;
    if (await copyText(code)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className="card" data-monthly-report>
      <h2 className="card-title">{k.title}</h2>
      <p className="card-meta" style={{ margin: '0 0 12px' }}>{k.sub}</p>
      {!identity && <p className="card-meta" style={{ margin: '0 0 12px' }}>{k.nameMissing}</p>}
      <label style={{ fontSize: 'var(--text-tiny)', color: 'var(--text-muted)' }}>{k.needsLabel}</label>
      <textarea
        className="input"
        value={needs}
        onChange={(e) => setNeeds(e.target.value)}
        placeholder={k.needsPh}
        rows={3}
        style={{ width: '100%', resize: 'vertical', marginTop: 4 }}
        aria-label={k.needsLabel}
      />
      <button
        type="button"
        className="btn-primary"
        style={{ width: '100%', marginTop: 8 }}
        onClick={makeCode}
        disabled={!identity}
        data-monthly-make-code
      >
        {k.makeCode}
      </button>
      {preview && (
        <div style={{ marginTop: 12 }}>
          <p className="card-meta" style={{ margin: '0 0 4px' }}>
            {k.sessions}: {preview.sessionsCompleted} · {k.sets}: {preview.setsDone} · {k.volume}:{' '}
            {preview.totalVolumeKg}
          </p>
          {preview.prs.length > 0 && (
            <p className="card-meta" style={{ margin: '0 0 4px' }}>
              {k.prs}:{' '}
              {preview.prs
                .map((p) => `${getExercise(p.exerciseKey)?.nameFa ?? p.exerciseKey} ${p.bestWeightKg}kg × ${p.bestReps}`)
                .join(' · ')}
            </p>
          )}
          {preview.latestMeasurement?.weightKg != null && (
            <p className="card-meta" style={{ margin: '0 0 4px' }}>
              {k.latestWeight}: {preview.latestMeasurement.weightKg} kg
            </p>
          )}
          {preview.sessionsCompleted === 0 && (
            <p className="card-meta" style={{ margin: '0 0 4px' }}>{k.noSessions}</p>
          )}
        </div>
      )}
      {code && (
        <div style={{ marginTop: 12 }} data-monthly-code>
          <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{k.yourCode}</p>
          <textarea
            className="input"
            readOnly
            data-coach-code
            value={code}
            rows={4}
            dir="ltr"
            style={{ width: '100%', resize: 'vertical', fontSize: '0.75rem' }}
            aria-label={k.yourCode}
          />
          <p className="card-meta" style={{ margin: '6px 0 8px' }}>{k.codeHint}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onCopy}>
              {copied ? k.copied : k.copy}
            </button>
            <a
              className="btn-primary"
              style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
              href={whatsappShareUrl(`${lang === 'fa' ? 'گزارش ماهانه — ماسل پرو:' : 'Monthly report — Musclepro:'}\n${code}`)}
              target="_blank"
              rel="noreferrer"
            >
              {k.whatsapp}
            </a>
          </div>
        </div>
      )}
      {sent && !code && (
        <p className="card-meta" style={{ margin: '12px 0 0' }}>
          {k.sentOn}: {sent.month}
        </p>
      )}
    </section>
  );
}
