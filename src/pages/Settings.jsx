import React from 'react';
import GeneralSettings from '../components/settings/General';
import AppearanceSettings from '../components/settings/Appearance';
import NotificationsSettings from '../components/settings/Notifications';
import SchedulingSettings from '../components/settings/Scheduling';
import TaskDefaultsSettings from '../components/settings/TaskDefaults';
import CalendarSettings from '../components/settings/Calendar';
import DataPrivacySettings from '../components/settings/DataPrivacy';
import AccessibilitySettings from '../components/settings/Accessibility';
import { settingsStore } from '../state/settingsStore';

const SECTIONS = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'scheduling', label: 'Time & Scheduling' },
  { id: 'tasks', label: 'Task Defaults' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'data', label: 'Data & Privacy' },
  { id: 'accessibility', label: 'Accessibility' },
  { id: 'advanced', label: 'Advanced' },
];

function SectionPlaceholder({ title, description }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{title}</h2>
      {description ? (
        <p className="text-gray-600">{description}</p>
      ) : (
        <p className="text-gray-600">Controls for {title} will appear here.</p>
      )}
    </div>
  );
}

export default function Settings() {
  const [active, setActive] = React.useState(SECTIONS[0].id);

  // Load settings from backend on first mount (best-effort)
  React.useEffect(() => {
    settingsStore.loadFromServer();
  }, []);

  const renderContent = () => {
    switch (active) {
      case 'general':
        return <GeneralSettings />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'notifications':
        return <NotificationsSettings />;
      case 'scheduling':
        return <SchedulingSettings />;
      case 'tasks':
        return <TaskDefaultsSettings />;
      case 'calendar':
        return <CalendarSettings />;
      case 'data':
        return <DataPrivacySettings />;
      case 'accessibility':
        return <AccessibilitySettings />;
      case 'advanced':
        return (
          <SectionPlaceholder
            title="Advanced"
            description="Betas/feature flags and diagnostics toggle."
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pt-[72px]">
      <div className="flex flex-1">
        {/* Left nav */}
        <aside className="w-64 border-r border-gray-200 bg-white">
          <div className="px-4 py-4">
            <h1 className="text-lg font-semibold text-gray-800">Settings</h1>
          </div>
          <nav className="px-2 pb-4 space-y-1">
            {SECTIONS.map((s) => {
              const isActive = active === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors
                    ${isActive ? 'bg-neutral-900 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {s.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
