import { useCallback, useEffect, useState } from 'react';
import { LangProvider } from './lib/i18n';
import { ensureReminderScheduled } from './lib/reminder';
import TabBar, { type TabId } from './components/TabBar';
import HomeTab from './tabs/HomeTab';
import WorkoutsTab from './tabs/WorkoutsTab';
import type { MuscleGroup } from './lib/exercises';
import LogTab from './tabs/LogTab';
import ProgressTab from './tabs/ProgressTab';
import ProfileTab from './tabs/ProfileTab';
import OnboardingWizard from './onboarding/OnboardingWizard';
import WorkoutSession, { type PlanDay } from './session/WorkoutSession';
import LoginGate, { type LoginProfile } from './components/LoginGate';
import { getActiveProgram } from './lib/store';
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
  const [workoutsMuscle, setWorkoutsMuscle] = useState<MuscleGroup | 'all'>('all');
  const [sessionDay, setSessionDay] = useState<PlanDay | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
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

  // Daily local reminder: (re)scheduled on every app start from stored
  // settings. Best-effort and silent — never blocks the UI.
  useEffect(() => {
    void ensureReminderScheduled();
  }, []);

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
            onGoToPrograms={() => setActiveTab('workouts')}
            onBodyMapMuscle={(m) => {
              setWorkoutsMuscle(m);
              setActiveTab('workouts');
            }}
          />
        )}
        {activeTab === 'workouts' && (
          <WorkoutsTab
            onBuildProgram={openOnboarding}
            onStartWorkout={openTodaySession}
            initialMuscle={workoutsMuscle}
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
          // A plain tab visit opens the library unfiltered; only a
          // body-map tap carries a muscle filter (set above).
          if (id !== 'workouts') setWorkoutsMuscle('all');
          setActiveTab(id);
        }}
      />

      {onboardingOpen && (
        <OnboardingWizard
          onDone={(quick) => {
            setOnboardingOpen(false);
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
