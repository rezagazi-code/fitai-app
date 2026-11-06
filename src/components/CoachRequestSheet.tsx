/**
 * اپ هوشمند بدنسازی — trainee side of the coach loop.
 *
 * After the wizard (same questions, same safety gate) the trainee
 * gets a share CODE for the coach instead of a local program. The
 * code travels over WhatsApp; the coach's answer comes back as a
 * response code pasted here. While a request is pending the trainee
 * sees a waiting status — never a fake program, never the demo
 * presented as a program.
 *
 * Local bilingual strings (same contract as ProfileTab: this file
 * owns its copy, i18n.tsx is untouched).
 */
import { useMemo, useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';
import type { UserProfile as WizardProfile, WorkoutPlan } from '../onboarding/OnboardingWizard';
import type { UserProfile as EngineProfile } from '../lib/program';
import {
  applyApprovedResponse,
  buildRequest,
  decodeCoachCode,
  encodeCoachCode,
  getLoginIdentity,
  getPendingRequest,
  savePendingRequest,
  whatsappShareUrl,
  type CoachRequestPayload,
  type DecodeError,
} from '../lib/coachLoop';

const K = {
  fa: {
    title: 'درخواست برنامه از مربی',
    pendingTitle: 'درخواست شما در انتظار بررسی مربی',
    subtitle: 'سوالات را جواب دادی و پیش‌نویس برنامه ساخته شد. کد زیر را برای مربی بفرست؛ وقتی جواب داد، کد پاسخ را همین‌جا وارد کن.',
    yourName: 'نام و نام خانوادگی شما',
    firstName: 'نام',
    lastName: 'نام خانوادگی',
    nameRequired: 'نام و نام خانوادگی را وارد کن — برنامه با اسم تو برای مربی می‌رود.',
    draft: 'پیش‌نویس برنامه',
    days: 'روز در هفته',
    exercises: 'حرکت',
    goal: 'هدف',
    level: 'سطح',
    levelBeginner: 'مبتدی',
    levelIntermediate: 'متوسط',
    levelAdvanced: 'پیشرفته',
    goalFatLoss: 'کاهش چربی',
    goalMuscle: 'عضله‌سازی',
    goalStrength: 'قدرت',
    goalFitness: 'تناسب عمومی',
    equipment: 'وسایل',
    injuries: 'آسیب‌ها',
    noInjuries: 'بدون آسیب',
    healthFlagged: 'هشدار سلامت: به یکی از پرسش‌های سلامت «بله» گفته‌ای — برنامه با کمترین شدت ساخته شده و مربی هم این هشدار را می‌بیند. پیش از تمرین سنگین با پزشک مشورت کن.',
    makeCode: 'ساختن کد درخواست',
    yourCode: 'کد درخواست شما',
    codeHint: 'این کد را با واتس‌اپ برای مربی بفرست. کد فقط روی همین گوشی ذخیره شده؛ سروری در کار نیست.',
    copy: 'کپی کد',
    copied: 'کپی شد',
    whatsapp: 'ارسال با واتس‌اپ',
    responseTitle: 'کد پاسخ مربی را وارد کن',
    responseHint: 'وقتی مربی برنامه را تأیید کرد، کد پاسخ را می‌فرستد. آن را اینجا بچسبان تا برنامه‌اش روی صفحه‌ی تو بنشیند.',
    pastePlaceholder: 'کد پاسخ را اینجا بچسبان…',
    apply: 'دریافت برنامه‌ی تأییدشده',
    applied: 'برنامه‌ی تأییدشده‌ی مربی فعال شد — همان چیزی که مربی تأیید یا ویرایش کرده بود.',
    rejected: 'مربی درخواست را رد کرد.',
    reason: 'دلیل',
    errEmpty: 'کدی وارد نشده است.',
    errNotCode: 'این یک کد معتبر نیست — کد با MP1. شروع می‌شود.',
    errBadCode: 'کد خراب است یا ناقص کپی شده؛ دوباره از مربی بگیر.',
    errBadShape: 'کد معتبر نیست.',
    errMismatch: 'این پاسخ مربوط به درخواست دیگری است.',
    errNotResponse: 'این کد درخواست است، نه پاسخ — کد پاسخ را از مربی بگیر.',
    close: 'بستن',
    sentOn: 'فرستاده شده',
  },
  en: {
    title: 'Request a program from your coach',
    pendingTitle: 'Your request is waiting for the coach',
    subtitle: 'You answered the questions and the draft is ready. Send the code below to your coach; when they reply, paste the response code right here.',
    yourName: 'Your first and last name',
    firstName: 'First name',
    lastName: 'Last name',
    nameRequired: 'Enter your first and last name — the program reaches the coach under your name.',
    draft: 'Draft program',
    days: 'days / week',
    exercises: 'exercises',
    goal: 'Goal',
    level: 'Level',
    levelBeginner: 'Beginner',
    levelIntermediate: 'Intermediate',
    levelAdvanced: 'Advanced',
    goalFatLoss: 'Fat loss',
    goalMuscle: 'Muscle building',
    goalStrength: 'Strength',
    goalFitness: 'General fitness',
    equipment: 'Equipment',
    injuries: 'Injuries',
    noInjuries: 'No injuries',
    healthFlagged: 'Health flag: you answered yes to a health question — the draft is built at the lowest intensity and the coach sees this flag too. Check with a clinician before hard training.',
    makeCode: 'Create request code',
    yourCode: 'Your request code',
    codeHint: 'Send this code to your coach on WhatsApp. The code lives only on this phone; there is no server.',
    copy: 'Copy code',
    copied: 'Copied',
    whatsapp: 'Send via WhatsApp',
    responseTitle: 'Paste the coach’s response code',
    responseHint: 'When the coach approves your program, they send a response code. Paste it here and their program lands on your page.',
    pastePlaceholder: 'Paste the response code here…',
    apply: 'Receive the approved program',
    applied: 'The coach’s approved program is now active — exactly what they approved or edited.',
    rejected: 'The coach declined the request.',
    reason: 'Reason',
    errEmpty: 'No code entered.',
    errNotCode: 'This is not a valid code — codes start with MP1.',
    errBadCode: 'The code is broken or copied incompletely; ask the coach to resend it.',
    errBadShape: 'This code is not valid.',
    errMismatch: 'This response belongs to a different request.',
    errNotResponse: 'That is a request code, not a response — ask the coach for the response code.',
    close: 'Close',
    sentOn: 'Sent on',
  },
} as const;

export interface CoachDraft {
  engine: EngineProfile;
  answers: WizardProfile;
  plan: WorkoutPlan;
}

interface CoachRequestSheetProps {
  /** Fresh draft from the wizard (request mode). */
  draft?: CoachDraft | null;
  /** Existing pending request (re-open from the Programs tab). */
  pending?: CoachRequestPayload | null;
  onClose: () => void;
  /** Called after an approved program lands, so the shell refreshes. */
  onApplied?: () => void;
}

const GOAL_KEY: Record<string, 'goalFatLoss' | 'goalMuscle' | 'goalStrength' | 'goalFitness'> = {
  'fat-loss': 'goalFatLoss',
  muscle: 'goalMuscle',
  strength: 'goalStrength',
  fitness: 'goalFitness',
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

export default function CoachRequestSheet({
  draft,
  pending,
  onClose,
  onApplied,
}: CoachRequestSheetProps): ReactElement {
  const { t, lang } = useLang();
  const k = K[lang];
  const identity = useMemo(() => getLoginIdentity(), []);
  const [firstName, setFirstName] = useState(identity?.firstName ?? '');
  const [lastName, setLastName] = useState(identity?.lastName ?? '');
  const [code, setCode] = useState<string | null>(
    pending ? encodeCoachCode(pending) : null,
  );
  const [copied, setCopied] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseMsg, setResponseMsg] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);
  const [nameError, setNameError] = useState(false);

  const storedPending = pending ?? getPendingRequest();
  const answers = draft?.answers ?? storedPending?.answers;
  const plan = draft?.plan;
  const totalExercises = plan ? plan.days.reduce((n, d) => n + d.exercises.length, 0) : 0;

  const makeCode = (): void => {
    if (!draft) return;
    if (firstName.trim() === '' || lastName.trim() === '') {
      setNameError(true);
      return;
    }
    setNameError(false);
    const req = buildRequest(
      { firstName: firstName.trim(), lastName: lastName.trim(), phone: identity?.phone ?? '' },
      draft.answers,
      draft.engine,
    );
    savePendingRequest(req);
    setCode(encodeCoachCode(req));
  };

  const onCopy = async (): Promise<void> => {
    if (!code) return;
    if (await copyText(code)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const applyResponse = (): void => {
    const decoded = decodeCoachCode(responseText);
    if (!decoded.ok) {
      const err: Record<DecodeError, string> = {
        empty: k.errEmpty,
        'not-a-code': k.errNotCode,
        'bad-code': k.errBadCode,
        'bad-shape': k.errBadShape,
      };
      setResponseMsg(err[decoded.error]);
      return;
    }
    if (decoded.payload.kind !== 'response') {
      setResponseMsg(k.errNotResponse);
      return;
    }
    const pendingReq = getPendingRequest();
    if (pendingReq && decoded.payload.requestId !== pendingReq.id) {
      setResponseMsg(k.errMismatch);
      return;
    }
    if (decoded.payload.status === 'rejected') {
      setResponseMsg(
        `${k.rejected}${decoded.payload.reason ? ` ${k.reason}: ${decoded.payload.reason}` : ''}`,
      );
      return;
    }
    const stored = applyApprovedResponse(decoded.payload);
    if (!stored) {
      setResponseMsg(k.errBadShape);
      return;
    }
    setApplied(true);
    setResponseMsg(k.applied);
    onApplied?.();
  };

  return (
    <div className="onbw-overlay fitai-root onbw-rtl" data-coach-sheet role="dialog" aria-modal="true" aria-label={k.title}>
      <div className="onbw-sheet">
        <div className="onbw-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="onbw-title" style={{ margin: 0 }}>{draft ? k.title : k.pendingTitle}</h2>
          <p className="card-meta" style={{ margin: 0 }}>{k.subtitle}</p>

          {answers && (
            <div className="card" style={{ margin: 0 }}>
              <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{k.draft}</p>
              <p className="card-meta" style={{ margin: '0 0 4px' }}>
                {k.goal}: {k[GOAL_KEY[answers.goal] ?? 'goalFitness']} · {k.level}:{' '}
                {k[LEVEL_KEY[answers.level] ?? 'levelBeginner']} · {answers.daysPerWeek} {k.days}
              </p>
              <p className="card-meta" style={{ margin: '0 0 4px' }}>
                {k.equipment}: {answers.equipment.map((e) => t(`lib.equipment.${e}`)).join(' · ')}
              </p>
              <p className="card-meta" style={{ margin: '0 0 4px' }}>
                {k.injuries}:{' '}
                {answers.injuries.filter((i) => i !== 'none').length > 0
                  ? answers.injuries.filter((i) => i !== 'none').join('، ')
                  : k.noInjuries}
              </p>
              {plan && (
                <p className="card-meta" style={{ margin: 0 }}>
                  {plan.days.length} {k.days} · {totalExercises} {k.exercises}
                </p>
              )}
              {(answers.healthFlags?.length ?? 0) > 0 && (
                <p className="card-meta" style={{ margin: '8px 0 0', color: '#f5b942' }}>
                  {k.healthFlagged}
                </p>
              )}
            </div>
          )}

          {draft && !code && (
            <>
              <div>
                <label style={{ fontSize: 'var(--text-tiny)', color: 'var(--text-muted)' }}>
                  {k.yourName}
                </label>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <input
                    className="input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={k.firstName}
                    aria-label={k.firstName}
                  />
                  <input
                    className="input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={k.lastName}
                    aria-label={k.lastName}
                  />
                </div>
                {nameError && (
                  <p className="card-meta" style={{ color: '#ff6b6b', margin: '4px 0 0' }}>
                    {k.nameRequired}
                  </p>
                )}
              </div>
              <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={makeCode}>
                {k.makeCode}
              </button>
            </>
          )}

          {code && (
            <div className="card" style={{ margin: 0 }} data-coach-request-code>
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
                  data-coach-whatsapp
                  style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
                  href={whatsappShareUrl(`${lang === 'fa' ? 'درخواست برنامه تمرینی — ماسل پرو:' : 'Training program request — Musclepro:'}\n${code}`)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {k.whatsapp}
                </a>
              </div>
              {storedPending && (
                <p className="card-meta" style={{ margin: '8px 0 0' }}>
                  {k.sentOn}: {new Date(storedPending.createdAt).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US')}
                </p>
              )}
            </div>
          )}

          {code && !applied && (
            <div className="card" style={{ margin: 0 }} data-coach-response-box>
              <p style={{ margin: '0 0 6px', fontWeight: 700 }}>{k.responseTitle}</p>
              <p className="card-meta" style={{ margin: '0 0 8px' }}>{k.responseHint}</p>
              <textarea
                className="input"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder={k.pastePlaceholder}
                rows={3}
                dir="ltr"
                data-coach-response
                style={{ width: '100%', resize: 'vertical', fontSize: '0.75rem' }}
                aria-label={k.responseTitle}
              />
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', marginTop: 8 }}
                onClick={applyResponse}
                data-coach-apply-response
              >
                {k.apply}
              </button>
              {responseMsg && (
                <p className="card-meta" style={{ margin: '8px 0 0' }} role="status">
                  {responseMsg}
                </p>
              )}
            </div>
          )}

          {applied && responseMsg && (
            <p className="card-meta" style={{ margin: 0, color: '#3aa8ff' }} role="status">
              {responseMsg}
            </p>
          )}

          <button type="button" className="btn-ghost" style={{ width: '100%' }} onClick={onClose}>
            {k.close}
          </button>
        </div>
      </div>
    </div>
  );
}
