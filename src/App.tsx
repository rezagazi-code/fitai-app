import { useCallback, useEffect, useState } from 'react';
import { LangProvider } from './lib/i18n';
import { ensureReminderScheduled } from './lib/reminder';
import { initPressBurst } from './lib/pressBurst';
import TabBar, { type TabId } from './components/TabBar';
import HomeTab from './tabs/HomeTab';
import WorkoutsTab from './tabs/WorkoutsTab';
import LogTab from './tabs/LogTab';
import ProgressTab from './tabs/ProgressTab';
import ProfileTab from './tabs/ProfileTab';
import OnboardingWizard from './onboarding/OnboardingWizard';
import CoachRequestSheet, { type CoachDraft } from './components/CoachRequestSheet';
import WorkoutSession, { type PlanDay } from './session/WorkoutSession';
import LoginGate, { type LoginProfile } from './components/LoginGate';
import { getActiveProgram } from './lib/store';
import { getPendingRequest } from './lib/coachLoop';
import { nextPlanDay, todayPlanDay } from './session/launch';
import './styles/shell.css';

function readLoginEntered(): boolean {
  try {
    return localStorage.getItem('fitai.loginEntered') === '1';
  } catch {
    return false;
  }
}

function Shell() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  /** Home week-chip deep-link: which FourWeekPlan week to open. The
   * seq is a nonce so a second tap on the same week re-opens it even
   * if the tab never unmounted (WorkoutsTab keys on it). Null = a
   * plain tab visit: the 4-week view stays collapsed as before. */
  const [weekRequest, setWeekRequest] = useState<{ week: number; seq: number } | null>(null);
  const [sessionDay, setSessionDay] = useState<PlanDay | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  /** Coach loop (2026-11-06, share-code transport): the wizard can run
   * in request mode — finishing hands the answers + draft to the
   * request sheet instead of activating a local program. */
  const [wizardRequestMode, setWizardRequestMode] = useState(false);
  const [coachDraft, setCoachDraft] = useState<CoachDraft | null>(null);
  /** Re-open the pending request (view code / paste response). */
  const [coachPendingOpen, setCoachPendingOpen] = useState(false);
  // REAL local-profile login gate: first name + last name + phone
  // are REQUIRED (validated inside LoginGate). No SMS, no backend, no
  // server auth yet — the profile is stored locally only, and the
  // gate says so honestly on screen.
  const [loginEntered, setLoginEntered] = useState<boolean>(readLoginEntered);
  const handleLoginEnter = (profile: LoginProfile): void => {
    try {
      localStorage.setItem('fitai.loginProfile', JSON.stringify(profile));
      localStorage.setItem('fitai.loginEntered', '1');
    } catch {
      /* storage unavailable — still enter for this session */
    }
    setLoginEntered(true);
  };
  /** Bumped after onboarding/session so tabs re-read the store. */
  const [seq, setSeq] = useState(0);
  const refresh = useCallback(() => setSeq((s) => s + 1), []);

  const openOnboarding = useCallback(() => setOnboardingOpen(true), []);

  /** Trainee asks the coach for a program: wizard in request mode. */
  const openCoachRequestWizard = useCallback(() => {
    setWizardRequestMode(true);
    setOnboardingOpen(true);
  }, []);

  // Daily local reminder: (re)scheduled on every app start from stored
  // settings. Best-effort and silent — never blocks the UI.
  useEffect(() => {
    void ensureReminderScheduled();
  }, []);

  // JS-driven press burst (see lib/pressBurst): the :active-only ring
  // never plays on a real quick tap, so pointerdown drives a full
  // ~600ms burst in the button's own color. One document listener
  // covers every tab, including buttons mounted later.
  useEffect(() => initPressBurst(), []);

  const openTodaySession = useCallback(() => {
    const program = getActiveProgram();
    // Rest day used to open NOTHING (silent dead button on the Programs
    // card): fall back to the next scheduled session, exactly like the
    // quick-onboarding finish and the rest card's early start. Only a
    // missing program opens onboarding.
    const day = todayPlanDay(program) ?? nextPlanDay(program);
    if (day) setSessionDay(day);
    else if (!program) setOnboardingOpen(true);
  }, []);

  /** Make-up / early start: the next scheduled session (rest card). */
  const openNextSession = useCallback(() => {
    const day = nextPlanDay(getActiveProgram());
    if (day) setSessionDay(day);
  }, []);

  if (!loginEntered) {
    return (
      <div className="fitai-root shell">
        <main className="shell-content">
          <LoginGate onEnter={handleLoginEnter} />
        </main>
      </div>
    );
  }

  return (
    <div className="fitai-root shell">
      <main className="shell-content">
        {activeTab === 'home' && (
          <HomeTab
            key={`home-${seq}`}
            onStartNextSession={openNextSession}
            onBuildProgram={openOnboarding}
            onGoToPrograms={() => {
              setWeekRequest(null);
              setActiveTab('workouts');
            }}
            onOpenWeek={(w) => {
              setWeekRequest({ week: w, seq: Date.now() });
              setActiveTab('workouts');
            }}
          />
        )}
        {activeTab === 'workouts' && (
          <WorkoutsTab
            key={`workouts-${weekRequest?.seq ?? 0}`}
            onBuildProgram={openOnboarding}
            onStartWorkout={openTodaySession}
            onRequestCoachProgram={openCoachRequestWizard}
            onViewPendingRequest={() => setCoachPendingOpen(true)}
            refreshToken={seq}
            weekRequest={weekRequest}
          />
        )}
        {activeTab === 'log' && (
          <LogTab
            key={`log-${seq}`}
            onStartWorkout={openTodaySession}
            onStartNextSession={openNextSession}
            onBuildProgram={openOnboarding}
          />
        )}
        {activeTab === 'progress' && <ProgressTab key={`progress-${seq}`} />}
        {activeTab === 'profile' && <ProfileTab />}
      </main>
      <TabBar
        active={activeTab}
        onSelect={(id) => {
          // A plain visit to Programs opens the 4-week view collapsed;
          // only a Home week-chip tap carries a week request.
          if (id === 'workouts') setWeekRequest(null);
          setActiveTab(id);
        }}
      />

      {onboardingOpen && (
        <OnboardingWizard
          requestMode={wizardRequestMode}
          onCoachRequest={(engine, answers, plan) => {
            setCoachDraft({ engine, answers, plan });
            setOnboardingOpen(false);
            setWizardRequestMode(false);
          }}
          onDone={(quick) => {
            setOnboardingOpen(false);
            setWizardRequestMode(false);
            refresh();
            // Quick path: land straight on a first set, ~2 minutes
            // after starting — no detour through the home tab. On a
            // rest day there is no "today" session, so the next
            // scheduled session opens instead (same as the rest card).
            if (quick) {
              const program = getActiveProgram();
              const day = todayPlanDay(program) ?? nextPlanDay(program);
              if (day) setSessionDay(day);
            }
          }}
        />
      )}
      {coachDraft && (
        <CoachRequestSheet
          draft={coachDraft}
          onClose={() => setCoachDraft(null)}
          onApplied={() => {
            setCoachDraft(null);
            refresh();
          }}
        />
      )}
      {coachPendingOpen && (
        <CoachRequestSheet
          pending={getPendingRequest()}
          onClose={() => setCoachPendingOpen(false)}
          onApplied={() => {
            setCoachPendingOpen(false);
            refresh();
          }}
        />
      )}
      {sessionDay && (
        <WorkoutSession
          planDay={sessionDay}
          onFinish={() => {
            setSessionDay(null);
            refresh();
          }}
          onCancel={() => setSessionDay(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <Shell />
    </LangProvider>
  );
}
