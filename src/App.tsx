import { useState } from 'react';
import { LangProvider } from './lib/i18n';
import TabBar, { type TabId } from './components/TabBar';
import HomeTab from './tabs/HomeTab';
import WorkoutsTab from './tabs/WorkoutsTab';
import LogTab from './tabs/LogTab';
import ProgressTab from './tabs/ProgressTab';
import ProfileTab from './tabs/ProfileTab';
import './styles/shell.css';

function Shell() {
  const [activeTab, setActiveTab] = useState<TabId>('home');

  return (
    <div className="fitai-root shell">
      <main className="shell-content">
        {activeTab === 'home' && <HomeTab onStartSession={() => setActiveTab('log')} />}
        {activeTab === 'workouts' && <WorkoutsTab />}
        {activeTab === 'log' && <LogTab />}
        {activeTab === 'progress' && <ProgressTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </main>
      <TabBar active={activeTab} onSelect={setActiveTab} />
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
