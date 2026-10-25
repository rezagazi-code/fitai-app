import { useCallback, useState } from 'react';
import { LangProvider } from './lib/i18n';
import TabBar, { type TabId } from './components/TabBar';
import HomeTab from './tabs/HomeTab';
import WorkoutsTab from './tabs/WorkoutsTab';
import LogTab from './tabs/LogTab';
import ProgressTab from './tabs/ProgressTab';
import ProfileTab from './tabs/ProfileTab';
import OnboardingWizard from './onboarding/OnboardingWizard';
import WorkoutSession, { type PlanDay } from './session/WorkoutSession';
import { getActiveProgram } from './lib/store';
import { nextPlanDay, todayPlanDay } from './session/launch';
import './styles/shell.css';

function Shell() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [sessionDay, setSessionDay] = useState<PlanDay | null>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  /** Bumped after onboarding/session so tabs re-read the store. */
  const [seq, setSeq] = useState(0);
  const refresh = useCallback(() => setSeq((s) => s + 1), []);

  const openOnboarding = useCallback(() => setOnboardingOpen(true), []);

  const openTodaySession = useCallback(() => {
    const program = getActiveProgram();
    const day = todayPlanDay(program);
    if (day) setSessionDay(day);
    // Rest day with a program: no session to open — the rest card offers
    // the next session instead. Only a missing program opens onboarding.
    else if (!program) setOnboardingOpen(true);
  }, []);

  /** Make-up / early start: the next scheduled session (rest card). */
  const openNextSession = useCallback(() => {
    const day = nextPlanDay(getActiveProgram());
    if (day) setSessionDay(day);
  }, []);

  return (
    <div className="fitai-root shell">
      <main className="shell-content">
        {activeTab === 'home' && (
          <HomeTab
            key={`home-${seq}`}
            onStartWorkout={openTodaySession}
            onStartNextSession={openNextSession}
            onBuildProgram={openOnboarding}
          />
        )}
        {activeTab === 'workouts' && (
          <WorkoutsTab
            onBuildProgram={openOnboarding}
            onStartWorkout={openTodaySession}
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
      <TabBar active={activeTab} onSelect={setActiveTab} />

      {onboardingOpen && (
        <OnboardingWizard
          onDone={() => {
            setOnboardingOpen(false);
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
