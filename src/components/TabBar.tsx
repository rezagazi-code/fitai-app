/**
 * اپ هوشمند بدنسازی — bottom tab navigation (5 tabs).
 * Original design, inspired by the genre's standard pattern.
 */
import type { ReactElement } from 'react';
import { useLang } from '../lib/i18n';

export type TabId = 'home' | 'workouts' | 'log' | 'progress' | 'profile';

interface TabBarProps {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

function Icon({ children }: { children: ReactElement }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const HomeIcon = () => (
  <Icon>
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </>
  </Icon>
);

const PlanIcon = () => (
  <Icon>
    <>
      <rect x="4" y="4" width="16" height="17" rx="2.5" />
      <path d="M8 2.8v3.4M16 2.8v3.4M8 11.5l2.6 2.6L16.5 8" />
    </>
  </Icon>
);

const PlusIcon = () => (
  <Icon>
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  </Icon>
);

const ChartIcon = () => (
  <Icon>
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8.5 16v-5M13 16V8M17.5 16v-3" />
    </>
  </Icon>
);

const UserIcon = () => (
  <Icon>
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c1.4-3.4 4-5 7-5s5.6 1.6 7 5" />
    </>
  </Icon>
);

export default function TabBar({ active, onSelect }: TabBarProps): ReactElement {
  const { t } = useLang();

  const sideTabs: Array<{ id: TabId; label: string; icon: ReactElement }> = [
    { id: 'home', label: t('shell.home'), icon: <HomeIcon /> },
    { id: 'workouts', label: t('shell.workouts'), icon: <PlanIcon /> },
    { id: 'progress', label: t('shell.progress'), icon: <ChartIcon /> },
    { id: 'profile', label: t('shell.profile'), icon: <UserIcon /> },
  ];

  const left = sideTabs.slice(0, 2);
  const right = sideTabs.slice(2);

  const renderItem = (tab: { id: TabId; label: string; icon: ReactElement }) => (
    <button
      key={tab.id}
      type="button"
      className={`tabbar-item${active === tab.id ? ' tabbar-item--active' : ''}`}
      onClick={() => onSelect(tab.id)}
      aria-label={tab.label}
      aria-current={active === tab.id ? 'page' : undefined}
    >
      {tab.icon}
      <span>{tab.label}</span>
    </button>
  );

  return (
    <nav className="tabbar" aria-label="main">
      {left.map(renderItem)}
      <button
        type="button"
        className={`tabbar-center${active === 'log' ? ' tabbar-center--active' : ''}`}
        onClick={() => onSelect('log')}
        aria-label={t('shell.log')}
        aria-current={active === 'log' ? 'page' : undefined}
      >
        <PlusIcon />
        <span>{t('shell.log')}</span>
      </button>
      {right.map(renderItem)}
    </nav>
  );
}
