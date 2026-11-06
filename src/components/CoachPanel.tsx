/**
 * اپ هوشمند بدنسازی — coach panel (Reza's side of the loop).
 *
 * Lives inside the app, opened from Profile. The coach pastes a
 * trainee's request code (from WhatsApp), sees the trainee's FULL
 * name + answers + the regenerated draft, approves as-is or EDITS
 * it (sets / reps / rest / swap / remove / add — same values the
 * session board uses), or rejects with a reason. Approving produces
 * a response code for the trainee; what the coach approved is
 * exactly what lands — the response carries the full edited program,
 * the trainee never re-generates it.
 *
 * Monthly reports imported here show per trainee: progress + needs.
 * Everything is localStorage on this phone — no server, no accounts.
 * Local bilingual strings (same contract as ProfileTab).
 */
import { useMemo, useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import { EXERCISES, MUSCLE_LABELS, getExercise, type MuscleGroup } from '../lib/exercises';
import { getBannedExerciseKeys } from '../lib/banned';
import type { WorkoutPlan } from '../lib/program';
import {
  decodeCoachCode,
  draftFromRequest,
  encodeCoachCode,
  fullName,
  getInbox,
  getMonthlyInbox,
  saveInboxEntry,
  saveMonthlyInboxEntry,
  whatsappShareUrl,
  type CoachRequestPayload,
  type InboxEntry,
} from '../lib/coachLoop';

const K = {
  fa: {
    title: 'پنل مربی',
    back: 'بازگشت',
    localNote: 'درخواست‌ها و گزارش‌ها فقط روی همین گوشی ذخیره می‌شوند؛ سروری در کار نیست.',
    importTitle: 'وارد کردن کد',
    importHint: 'کد درخواست یا گزارش ماهانه‌ی شاگرد را اینجا بچسبان — می‌توانی کل پیام واتس‌اپ را بچسبانی.',
    pastePlaceholder: 'کد را اینجا بچسبان…',
    importBtn: 'وارد کردن',
    importedRequest: 'درخواست شاگرد وارد شد.',
    importedMonthly: 'گزارش ماهانه وارد شد.',
    errEmpty: 'کدی وارد نشده است.',
    errNotCode: 'این یک کد معتبر نیست — کد با MP1. شروع می‌شود.',
    errBadCode: 'کد خراب است یا ناقص کپی شده.',
    errBadShape: 'کد معتبر نیست.',
    errResponse: 'این کد پاسخ است، نه درخواست — کد پاسخ را شاگرد وارد می‌کند، نه مربی.',
    trainees: 'شاگردها',
    noTrainees: 'هنوز درخواستی وارد نشده — وقتی شاگردی کد فرستاد، آن را بالا بچسبان.',
    pending: 'در انتظار بررسی',
    approved: 'تأیید شده',
    rejected: 'رد شده',
    monthly: 'گزارش ماهانه',
    requests: 'درخواست‌ها',
    view: 'مشاهده',
    answers: 'پاسخ‌های شاگرد',
    goal: 'هدف',
    level: 'سطح',
    levelBeginner: 'مبتدی',
    levelIntermediate: 'متوسط',
    levelAdvanced: 'پیشرفته',
    goalFatLoss: 'کاهش چربی',
    goalMuscle: 'عضله‌سازی',
    goalStrength: 'قدرت',
    goalFitness: 'تناسب عمومی',
    days: 'روز در هفته',
    duration: 'طول جلسه',
    minutes: 'دقیقه',
    equipment: 'وسایل',
    injuries: 'آسیب‌ها',
    injuryNote: 'توضیح آسیب',
    noInjuries: 'بدون آسیب',
    healthFlag: 'هشدار سلامت',
    healthFlagNote: 'شاگرد به یکی از پرسش‌های سلامت «بله» گفته — پیش‌نویس با کمترین شدت ساخته شده است.',
    draft: 'پیش‌نویس برنامه (قابل ویرایش)',
    sets: 'ست',
    reps: 'تکرار',
    rest: 'استراحت (ثانیه)',
    swap: 'تعویض حرکت',
    remove: 'حذف',
    addExercise: 'اضافه کردن حرکت',
    add: 'اضافه کن',
    approve: 'تأیید و ارسال برای شاگرد',
    reject: 'رد کردن',
    rejectReason: 'دلیل رد (برای شاگرد فرستاده می‌شود)',
    rejectReasonPh: 'مثلاً: اول باید آسیب زانو بررسی شود',
    responseTitle: 'کد پاسخ برای شاگرد',
    responseHint: 'این کد را با واتس‌اپ برای شاگرد بفرست؛ وقتی آن را وارد کرد، همین برنامه — با ویرایش‌های تو — روی صفحه‌اش می‌نشیند.',
    copy: 'کپی کد',
    copied: 'کپی شد',
    whatsapp: 'ارسال با واتس‌اپ',
    decided: 'تصمیم گرفته شد',
    month: 'ماه',
    sessions: 'جلسات کامل‌شده',
    setsDone: 'ست‌های انجام‌شده',
    volume: 'حجم کل (کیلوگرم)',
    prs: 'رکوردهای جدید',
    latestWeight: 'آخرین وزن',
    needs: 'احتیاجات شاگرد',
    noMonthly: 'هنوز گزارش ماهانه‌ای برای این شاگرد نرسیده است.',
    noRequests: 'درخواستی نیست.',
  },
  en: {
    title: 'Coach panel',
    back: 'Back',
    localNote: 'Requests and reports live only on this phone; there is no server.',
    importTitle: 'Import a code',
    importHint: 'Paste a trainee’s request or monthly-report code here — you can paste the whole WhatsApp message.',
    pastePlaceholder: 'Paste the code here…',
    importBtn: 'Import',
    importedRequest: 'Trainee request imported.',
    importedMonthly: 'Monthly report imported.',
    errEmpty: 'No code entered.',
    errNotCode: 'This is not a valid code — codes start with MP1.',
    errBadCode: 'The code is broken or copied incompletely.',
    errBadShape: 'This code is not valid.',
    errResponse: 'That is a response code, not a request — the trainee enters responses, not the coach.',
    trainees: 'Trainees',
    noTrainees: 'No requests imported yet — when a trainee sends a code, paste it above.',
    pending: 'Waiting for review',
    approved: 'Approved',
    rejected: 'Rejected',
    monthly: 'Monthly report',
    requests: 'Requests',
    view: 'View',
    answers: 'Trainee’s answers',
    goal: 'Goal',
    level: 'Level',
    levelBeginner: 'Beginner',
    levelIntermediate: 'Intermediate',
    levelAdvanced: 'Advanced',
    goalFatLoss: 'Fat loss',
    goalMuscle: 'Muscle building',
    goalStrength: 'Strength',
    goalFitness: 'General fitness',
    days: 'days / week',
    duration: 'Session length',
    minutes: 'min',
    equipment: 'Equipment',
    injuries: 'Injuries',
    injuryNote: 'Injury note',
    noInjuries: 'No injuries',
    healthFlag: 'Health flag',
    healthFlagNote: 'The trainee answered yes to a health question — the draft is built at the lowest intensity.',
    draft: 'Draft program (editable)',
    sets: 'sets',
    reps: 'reps',
    rest: 'rest (sec)',
    swap: 'Swap exercise',
    remove: 'Remove',
    addExercise: 'Add exercise',
    add: 'Add',
    approve: 'Approve and send to trainee',
    reject: 'Reject',
    rejectReason: 'Rejection reason (sent to the trainee)',
    rejectReasonPh: 'e.g. the knee issue needs checking first',
    responseTitle: 'Response code for the trainee',
    responseHint: 'Send this code to the trainee on WhatsApp; when they enter it, this exact program — with your edits — lands on their page.',
    copy: 'Copy code',
    copied: 'Copied',
    whatsapp: 'Send via WhatsApp',
    decided: 'Decided',
    month: 'Month',
    sessions: 'Finished sessions',
    setsDone: 'Sets done',
    volume: 'Total volume (kg)',
    prs: 'New records',
    latestWeight: 'Latest weight',
    needs: 'Trainee’s needs',
    noMonthly: 'No monthly report from this trainee yet.',
    noRequests: 'No requests.',
  },
} as const;

const GOAL_KEY: Record<string, 'goalFatLoss' | 'goalMuscle' | 'goalStrength' | 'goalFitness'> = {
  'fat-loss': 'goalFatLoss',
  fatloss: 'goalFatLoss',
  muscle: 'goalMuscle',
  strength: 'goalStrength',
  fitness: 'goalFitness',
  general: 'goalFitness',
};

const LEVEL_KEY: Record<string, 'levelBeginner' | 'levelIntermediate' | 'levelAdvanced'> = {
  beginner: 'levelBeginner',
  intermediate: 'levelIntermediate',
  advanced: 'levelAdvanced',
};

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

function clonePlan(plan: WorkoutPlan): WorkoutPlan {
  return JSON.parse(JSON.stringify(plan)) as WorkoutPlan;
}

export default function CoachPanel({ onBack }: { onBack: () => void }): ReactElement {
  const { t, lang } = useLang();
  const k = K[lang];
  const [paste, setPaste] = useState('');
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [inbox, setInbox] = useState<InboxEntry[]>(() => getInbox());
  const [monthlyInbox, setMonthlyInbox] = useState(() => getMonthlyInbox());
  const [openTrainee, setOpenTrainee] = useState<string | null>(null);
  const [openRequestId, setOpenRequestId] = useState<string | null>(null);
  const [editPlan, setEditPlan] = useState<WorkoutPlan | null>(null);
  const [addDay, setAddDay] = useState<Record<number, string>>({});
  const [rejectReason, setRejectReason] = useState('');
  const [responseCode, setResponseCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const banned = useMemo(() => getBannedExerciseKeys(), []);

  const trainees = useMemo(() => {
    const names = new Map<string, { requests: InboxEntry[]; monthly: number }>();
    for (const e of inbox) {
      const name = fullName(e.request.trainee);
      const cur = names.get(name) ?? { requests: [], monthly: 0 };
      cur.requests.push(e);
      names.set(name, cur);
    }
    for (const m of monthlyInbox) {
      const name = fullName(m.report.trainee);
      const cur = names.get(name) ?? { requests: [], monthly: 0 };
      cur.monthly += 1;
      names.set(name, cur);
    }
    return [...names.entries()].map(([name, v]) => ({ name, ...v }));
  }, [inbox, monthlyInbox]);

  const openRequest = inbox.find((e) => e.request.id === openRequestId) ?? null;

  const doImport = (): void => {
    const decoded = decodeCoachCode(paste);
    if (!decoded.ok) {
      setImportMsg(
        decoded.error === 'empty'
          ? k.errEmpty
          : decoded.error === 'not-a-code'
            ? k.errNotCode
            : decoded.error === 'bad-code'
              ? k.errBadCode
              : k.errBadShape,
      );
      return;
    }
    if (decoded.payload.kind === 'response') {
      setImportMsg(k.errResponse);
      return;
    }
    if (decoded.payload.kind === 'monthly') {
      saveMonthlyInboxEntry({ report: decoded.payload, importedAt: new Date().toISOString() });
      setMonthlyInbox(getMonthlyInbox());
      setImportMsg(k.importedMonthly);
      setPaste('');
      return;
    }
    const req = decoded.payload as CoachRequestPayload;
    const existing = getInbox().find((e) => e.request.id === req.id);
    if (!existing) {
      saveInboxEntry({ request: req, importedAt: new Date().toISOString(), status: 'pending' });
      setInbox(getInbox());
    }
    setImportMsg(k.importedRequest);
    setPaste('');
    setOpenTrainee(fullName(req.trainee));
    setOpenRequestId(req.id);
    setEditPlan(clonePlan(draftFromRequest(req)));
    setResponseCode(null);
  };

  const openDetail = (entry: InboxEntry): void => {
    setOpenRequestId(entry.request.id);
    setEditPlan(clonePlan(draftFromRequest(entry.request)));
    setResponseCode(entry.responseCode ?? null);
    setRejectReason('');
  };

  const decide = (status: 'approved' | 'rejected'): void => {
    if (!openRequest || !editPlan) return;
    if (status === 'rejected' && rejectReason.trim() === '') return;
    const answers = openRequest.request.answers;
    const programName =
      lang === 'fa'
        ? `برنامه ${k[GOAL_KEY[answers.goal] ?? 'goalFitness']}`
        : `${k[GOAL_KEY[answers.goal] ?? 'goalFitness']} program`;
    const response = {
      v: 1 as const,
      kind: 'response' as const,
      requestId: openRequest.request.id,
      status,
      reason: status === 'rejected' ? rejectReason.trim() : undefined,
      program: status === 'approved' ? editPlan : undefined,
      programName: status === 'approved' ? programName : undefined,
      decidedAt: new Date().toISOString(),
    };
    const code = encodeCoachCode(response);
    const entry: InboxEntry = {
      ...openRequest,
      status,
      decidedAt: response.decidedAt,
      responseCode: code,
    };
    saveInboxEntry(entry);
    setInbox(getInbox());
    setResponseCode(code);
  };

  const onCopy = async (): Promise<void> => {
    if (!responseCode) return;
    if (await copyText(responseCode)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const updateRow = (
    dayIdx: number,
    exIdx: number,
    patch: Partial<{ sets: number; reps: string; restSeconds: number; exerciseKey: string }>,
  ): void => {
    setEditPlan((prev) => {
      if (!prev) return prev;
      const next = clonePlan(prev);
      Object.assign(next.days[dayIdx].exercises[exIdx], patch);
      return next;
    });
  };

  const removeRow = (dayIdx: number, exIdx: number): void => {
    setEditPlan((prev) => {
      if (!prev) return prev;
      const next = clonePlan(prev);
      next.days[dayIdx].exercises.splice(exIdx, 1);
      return next;
    });
  };

  const addRow = (dayIdx: number): void => {
    const key = addDay[dayIdx];
    if (!key) return;
    setEditPlan((prev) => {
      if (!prev) return prev;
      const next = clonePlan(prev);
      next.days[dayIdx].exercises.push({ exerciseKey: key, sets: 3, reps: '10', restSeconds: 90 });
      return next;
    });
  };

  const statusLabel = (s: InboxEntry['status']): string =>
    s === 'pending' ? k.pending : s === 'approved' ? k.approved : k.rejected;

  return (
    <div data-coach-panel style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" className="btn-ghost" onClick={onBack}>
          ← {k.back}
        </button>
        <h2 className="card-title" style={{ margin: 0 }}>{k.title}</h2>
      </div>
      <p className="card-meta" style={{ margin: 0 }}>{k.localNote}</p>

      {/* import */}
      <section className="card" style={{ margin: 0 }}>
        <h3 style={{ margin: '0 0 4px' }}>{k.importTitle}</h3>
        <p className="card-meta" style={{ margin: '0 0 8px' }}>{k.importHint}</p>
        <textarea
          className="input"
          value={paste}
          onChange={(e) => setPaste(e.target.value)}
          placeholder={k.pastePlaceholder}
          rows={3}
          dir="ltr"
          style={{ width: '100%', resize: 'vertical', fontSize: '0.75rem' }}
          aria-label={k.importTitle}
          data-coach-import-paste
        />
        <button
          type="button"
          className="btn-primary"
          style={{ width: '100%', marginTop: 8 }}
          onClick={doImport}
          data-coach-import-btn
        >
          {k.importBtn}
        </button>
        {importMsg && (
          <p className="card-meta" style={{ margin: '8px 0 0' }} role="status">
            {importMsg}
          </p>
        )}
      </section>

      {/* trainees */}
      <section className="card" style={{ margin: 0 }} data-coach-trainees>
        <h3 style={{ margin: '0 0 8px' }}>{k.trainees}</h3>
        {trainees.length === 0 && <p className="card-meta" style={{ margin: 0 }}>{k.noTrainees}</p>}
        {trainees.map((tr) => (
          <div key={tr.name} style={{ marginBottom: 12 }}>
            <button
              type="button"
              className="btn-ghost"
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}
              onClick={() => setOpenTrainee(openTrainee === tr.name ? null : tr.name)}
              data-coach-trainee={tr.name}
            >
              <span>{tr.name}</span>
              <span className="card-meta">
                {tr.requests.filter((r) => r.status === 'pending').length} {k.pending} ·{' '}
                {tr.monthly} {k.monthly}
              </span>
            </button>
            {openTrainee === tr.name && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {tr.requests.length === 0 && <p className="card-meta" style={{ margin: 0 }}>{k.noRequests}</p>}
                {tr.requests.map((e) => (
                  <div key={e.request.id} className="card" style={{ margin: 0 }}>
                    <p style={{ margin: '0 0 4px' }}>
                      {k.requests} · {new Date(e.request.createdAt).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US')} ·{' '}
                      <span style={{ color: e.status === 'pending' ? '#f5b942' : e.status === 'approved' ? '#3aa8ff' : '#ff6b6b' }}>
                        {statusLabel(e.status)}
                      </span>
                    </p>
                    <button type="button" className="btn-secondary" onClick={() => openDetail(e)}>
                      {k.view}
                    </button>
                  </div>
                ))}
                {monthlyInbox
                  .filter((m) => fullName(m.report.trainee) === tr.name)
                  .map((m) => (
                    <div key={m.report.id} className="card" style={{ margin: 0 }} data-coach-monthly={m.report.id}>
                      <p style={{ margin: '0 0 4px', fontWeight: 700 }}>
                        {k.monthly} · {m.report.month}
                      </p>
                      <p className="card-meta" style={{ margin: '0 0 4px' }}>
                        {k.sessions}: {m.report.sessionsCompleted} · {k.setsDone}: {m.report.setsDone} ·{' '}
                        {k.volume}: {m.report.totalVolumeKg}
                      </p>
                      {m.report.prs.length > 0 && (
                        <p className="card-meta" style={{ margin: '0 0 4px' }}>
                          {k.prs}:{' '}
                          {m.report.prs
                            .map((p) => `${getExercise(p.exerciseKey)?.nameFa ?? p.exerciseKey} ${p.bestWeightKg}kg × ${p.bestReps}`)
                            .join(' · ')}
                        </p>
                      )}
                      {m.report.latestMeasurement?.weightKg != null && (
                        <p className="card-meta" style={{ margin: '0 0 4px' }}>
                          {k.latestWeight}: {m.report.latestMeasurement.weightKg} kg
                        </p>
                      )}
                      <p style={{ margin: '4px 0 0' }}>
                        <strong>{k.needs}:</strong> {m.report.needs || '—'}
                      </p>
                    </div>
                  ))}
                {monthlyInbox.filter((m) => fullName(m.report.trainee) === tr.name).length === 0 && (
                  <p className="card-meta" style={{ margin: 0 }}>{k.noMonthly}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* request detail + editor */}
      {openRequest && editPlan && (
        <section className="card" style={{ margin: 0 }} data-coach-request-detail>
          <h3 style={{ margin: '0 0 4px' }}>
            {fullName(openRequest.request.trainee)} · {statusLabel(openRequest.status)}
          </h3>
          {(() => {
            const a = openRequest.request.answers;
            return (
              <div className="card" style={{ margin: '0 0 12px' }}>
                <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{k.answers}</p>
                <p className="card-meta" style={{ margin: '0 0 4px' }}>
                  {k.goal}: {k[GOAL_KEY[a.goal] ?? 'goalFitness']} · {k.level}:{' '}
                  {k[LEVEL_KEY[a.level] ?? 'levelBeginner']} · {a.daysPerWeek} {k.days}
                  {a.sessionMinutes ? ` · ${a.sessionMinutes} ${k.minutes}` : ''}
                </p>
                <p className="card-meta" style={{ margin: '0 0 4px' }}>
                  {k.equipment}: {a.equipment.map((e) => t(`lib.equipment.${e}`)).join(' · ')}
                </p>
                <p className="card-meta" style={{ margin: '0 0 4px' }}>
                  {k.injuries}:{' '}
                  {a.injuries.filter((i) => i !== 'none').length > 0
                    ? a.injuries.filter((i) => i !== 'none').join('، ')
                    : k.noInjuries}
                  {a.injuryNote ? ` — ${k.injuryNote}: ${a.injuryNote}` : ''}
                </p>
                {(a.healthFlags?.length ?? 0) > 0 && (
                  <p className="card-meta" style={{ margin: '8px 0 0', color: '#ff6b6b' }}>
                    ⚠ {k.healthFlag}: {(a.healthFlags ?? []).join('، ')} — {k.healthFlagNote}
                  </p>
                )}
              </div>
            );
          })()}

          <p style={{ margin: '0 0 8px', fontWeight: 700 }}>{k.draft}</p>
          {editPlan.days.map((day, di) => {
            const dayMuscles = [...new Set(day.exercises.map((e) => getExercise(e.exerciseKey)?.muscle).filter((m): m is MuscleGroup => !!m))];
            const addOptions = EXERCISES.filter(
              (e) => dayMuscles.includes(e.muscle) && !banned.includes(e.key),
            );
            return (
              <div key={di} style={{ marginBottom: 16 }}>
                <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
                  {lang === 'fa' ? day.nameFa : day.nameEn}
                </p>
                {day.exercises.map((ex, ei) => {
                  const info = getExercise(ex.exerciseKey);
                  const sameMuscle = EXERCISES.filter(
                    (e) => e.muscle === info?.muscle && !banned.includes(e.key),
                  );
                  return (
                    <div
                      key={`${ex.exerciseKey}-${ei}`}
                      className="card"
                      style={{ margin: '0 0 8px', padding: 10 }}
                      data-coach-edit-row={`${di}-${ei}`}
                    >
                      <p style={{ margin: '0 0 6px', fontWeight: 700 }}>
                        {info ? (lang === 'fa' ? info.nameFa : info.nameEn) : ex.exerciseKey}
                      </p>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.8rem' }}>
                          {k.sets}{' '}
                          <input
                            className="input"
                            type="number"
                            min={1}
                            max={10}
                            value={ex.sets}
                            onChange={(e) =>
                              updateRow(di, ei, { sets: Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)) })
                            }
                            style={{ width: 64 }}
                            aria-label={k.sets}
                          />
                        </label>
                        <label style={{ fontSize: '0.8rem' }}>
                          {k.reps}{' '}
                          <input
                            className="input"
                            value={ex.reps}
                            onChange={(e) => updateRow(di, ei, { reps: e.target.value })}
                            style={{ width: 76 }}
                            aria-label={k.reps}
                          />
                        </label>
                        <label style={{ fontSize: '0.8rem' }}>
                          {k.rest}{' '}
                          <input
                            className="input"
                            type="number"
                            min={30}
                            max={300}
                            step={15}
                            value={ex.restSeconds}
                            onChange={(e) =>
                              updateRow(di, ei, { restSeconds: Math.max(30, parseInt(e.target.value, 10) || 90) })
                            }
                            style={{ width: 76 }}
                            aria-label={k.rest}
                          />
                        </label>
                        <button type="button" className="btn-ghost" onClick={() => removeRow(di, ei)}>
                          {k.remove}
                        </button>
                      </div>
                      <label style={{ fontSize: '0.8rem', display: 'block', marginTop: 6 }}>
                        {k.swap}{' '}
                        <select
                          className="input"
                          value={ex.exerciseKey}
                          onChange={(e) => updateRow(di, ei, { exerciseKey: e.target.value })}
                          style={{ maxWidth: '100%' }}
                          aria-label={k.swap}
                        >
                          {sameMuscle.map((e) => (
                            <option key={e.key} value={e.key}>
                              {lang === 'fa' ? e.nameFa : e.nameEn}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', gap: 6 }}>
                  <select
                    className="input"
                    value={addDay[di] ?? ''}
                    onChange={(e) => setAddDay((prev) => ({ ...prev, [di]: e.target.value }))}
                    style={{ flex: 1 }}
                    aria-label={k.addExercise}
                  >
                    <option value="">{k.addExercise}</option>
                    {addOptions.map((e) => (
                      <option key={e.key} value={e.key}>
                        {lang === 'fa' ? e.nameFa : e.nameEn} ({MUSCLE_LABELS[e.muscle][lang]})
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-secondary" onClick={() => addRow(di)}>
                    {k.add}
                  </button>
                </div>
              </div>
            );
          })}

          {openRequest.status === 'pending' && (
            <>
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%' }}
                onClick={() => decide('approved')}
                data-coach-approve
              >
                {k.approve}
              </button>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 'var(--text-tiny)', color: 'var(--text-muted)' }}>
                  {k.rejectReason}
                </label>
                <input
                  className="input"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={k.rejectReasonPh}
                  style={{ width: '100%', marginTop: 4 }}
                />
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ width: '100%', marginTop: 8 }}
                  onClick={() => decide('rejected')}
                  disabled={rejectReason.trim() === ''}
                  data-coach-reject
                >
                  {k.reject}
                </button>
              </div>
            </>
          )}
          {openRequest.status !== 'pending' && (
            <p className="card-meta" style={{ margin: '8px 0 0' }}>
              {k.decided}
              {openRequest.decidedAt
                ? `: ${new Date(openRequest.decidedAt).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US')}`
                : ''}
            </p>
          )}

          {responseCode && (
            <div className="card" style={{ margin: '12px 0 0' }} data-coach-response-code>
              <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{k.responseTitle}</p>
              <textarea
                className="input"
                readOnly
                data-coach-response
                value={responseCode}
                rows={4}
                dir="ltr"
                style={{ width: '100%', resize: 'vertical', fontSize: '0.75rem' }}
                aria-label={k.responseTitle}
              />
              <p className="card-meta" style={{ margin: '6px 0 8px' }}>{k.responseHint}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={onCopy}>
                  {copied ? k.copied : k.copy}
                </button>
                <a
                  className="btn-primary"
                  style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
                  href={whatsappShareUrl(
                    `${lang === 'fa' ? 'پاسخ مربی — برنامه‌ی تأییدشده:' : 'Coach reply — approved program:'}\n${responseCode}`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  {k.whatsapp}
                </a>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
