/**
 * Musclepro — login entry screen (REAL local profile version).
 *
 * First name + last name + phone number are REQUIRED to enter.
 * This is a LOCAL profile stored only on this device — no SMS, no
 * backend, no server sign-in yet. The screen says exactly that, so
 * nobody mistakes it for server authentication. Phone digits are
 * normalised from Persian/Arabic digits to Latin before validation;
 * an Iranian mobile is accepted as 09xxxxxxxxx (11 digits) or
 * 9xxxxxxxxx (10 digits). Empty or invalid fields do NOT enter.
 */
import { useState, type ReactElement } from 'react';
import { useLang } from '../lib/i18n';

const TEXT = {
  fa: {
    title: 'ورود به ماسل پرو',
    subtitle: 'نام، نام خانوادگی و شماره تلفن را وارد کن',
    firstName: 'نام',
    lastName: 'نام خانوادگی',
    phone: 'شماره تلفن',
    login: 'ورود',
    localNote:
      'پروفایل محلی: اطلاعاتت فقط روی همین گوشی ذخیره می‌شود و ورود سروری نیست — پیامک و حساب کاربری سروری هنوز ساخته نشده است.',
    errName: 'نام و نام خانوادگی را کامل وارد کن.',
    errPhone: 'شماره تلفن معتبر وارد کن (مثل ۰۹۱۲۳۴۵۶۷۸۹).',
  },
  en: {
    title: 'Sign in to Musclepro',
    subtitle: 'Enter your first name, last name, and phone number',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone number',
    login: 'Sign in',
    localNote:
      'Local profile: your details are stored only on this device and this is not server sign-in — no SMS and no server account yet.',
    errName: 'Please enter your full first and last name.',
    errPhone: 'Please enter a valid phone number (e.g. 09123456789).',
  },
} as const;

export interface LoginProfile {
  firstName: string;
  lastName: string;
  phone: string;
}

const FA_DIGITS: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

export function normalizePhoneDigits(raw: string): string {
  let out = raw;
  for (const [fa, en] of Object.entries(FA_DIGITS)) out = out.split(fa).join(en);
  return out.replace(/[^\d]/g, '');
}

/** Iranian mobile: 09xxxxxxxxx (11) or 9xxxxxxxxx (10). */
export function isValidPhone(raw: string): boolean {
  const digits = normalizePhoneDigits(raw);
  return /^09\d{9}$/.test(digits) || /^9\d{9}$/.test(digits);
}

function readStoredProfile(): LoginProfile {
  try {
    const raw = localStorage.getItem('fitai.loginProfile');
    if (!raw) return { firstName: '', lastName: '', phone: '' };
    const parsed = JSON.parse(raw) as Partial<LoginProfile>;
    return {
      firstName: typeof parsed.firstName === 'string' ? parsed.firstName : '',
      lastName: typeof parsed.lastName === 'string' ? parsed.lastName : '',
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
    };
  } catch {
    return { firstName: '', lastName: '', phone: '' };
  }
}

export default function LoginGate({
  onEnter,
}: {
  onEnter: (profile: LoginProfile) => void;
}): ReactElement {
  const { lang } = useLang();
  const t = TEXT[lang === 'fa' ? 'fa' : 'en'];
  const stored = readStoredProfile();
  const [firstName, setFirstName] = useState(stored.firstName);
  const [lastName, setLastName] = useState(stored.lastName);
  const [phone, setPhone] = useState(stored.phone);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError(t.errName);
      return;
    }
    if (!isValidPhone(phone)) {
      setError(t.errPhone);
      return;
    }
    setError(null);
    onEnter({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizePhoneDigits(phone),
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        justifyContent: 'center',
        minHeight: '70vh',
      }}
    >
      <section className="card" data-login-gate>
        <h1 className="card-title">{t.title}</h1>
        <p className="card-meta">{t.subtitle}</p>
        <label className="card-meta" style={{ display: 'block', marginTop: 12 }}>
          {t.firstName}
          <input
            className="input"
            style={{ width: '100%', marginTop: 4 }}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t.firstName}
            autoComplete="given-name"
          />
        </label>
        <label className="card-meta" style={{ display: 'block', marginTop: 12 }}>
          {t.lastName}
          <input
            className="input"
            style={{ width: '100%', marginTop: 4 }}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t.lastName}
            autoComplete="family-name"
          />
        </label>
        <label className="card-meta" style={{ display: 'block', marginTop: 12 }}>
          {t.phone}
          <input
            className="input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t.phone}
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            style={{ width: '100%', marginTop: 4, textAlign: 'left' }}
          />
        </label>
        {error ? (
          <p className="card-meta" role="alert" style={{ marginTop: 12, color: '#ff6b6b' }}>
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className="btn-primary btn-shine"
          style={{ width: '100%', marginTop: 20 }}
          onClick={submit}
        >
          {t.login}
        </button>
        <p className="card-meta" style={{ marginTop: 12 }}>
          {t.localNote}
        </p>
      </section>
    </div>
  );
}
