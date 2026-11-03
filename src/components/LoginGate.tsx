/**
 * اپ هوشمند بدنسازی — login entry screen (TESTING version).
 *
 * Final login (later, not now) wants first name + last name + phone
 * number, required. For testing now, the three fields are shown but
 * pressing the login button alone enters the app: no validation, no
 * SMS, no backend, no server auth — the app stays local-first while
 * the backend decision is still open. The test-mode note on the
 * screen says exactly that, so nobody mistakes this for real auth.
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
    testNote:
      'نسخه آزمایشی: برای ورود، فشردن دکمه «ورود» کافی است — اعتبارسنجی و ورود واقعی بعداً اضافه می‌شود.',
  },
  en: {
    title: 'Sign in to Musclepro',
    subtitle: 'Enter your first name, last name, and phone number',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone number',
    login: 'Sign in',
    testNote:
      'Test version: pressing “Sign in” is enough to enter — validation and real sign-in come later.',
  },
} as const;

export interface LoginProfile {
  firstName: string;
  lastName: string;
  phone: string;
}

export default function LoginGate({
  onEnter,
}: {
  onEnter: (profile: LoginProfile) => void;
}): ReactElement {
  const { lang } = useLang();
  const t = TEXT[lang === 'fa' ? 'fa' : 'en'];
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

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
        <button
          type="button"
          className="btn-primary btn-shine"
          style={{ width: '100%', marginTop: 20 }}
          onClick={() => onEnter({ firstName, lastName, phone })}
        >
          {t.login}
        </button>
        <p className="card-meta" style={{ marginTop: 12 }}>
          {t.testNote}
        </p>
      </section>
    </div>
  );
}
