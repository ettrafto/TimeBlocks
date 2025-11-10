import React from 'react';
import { settingsStore } from '../../state/settingsStore';

function useSettingsSelector(selector) {
  const [state, setState] = React.useState(() => selector(settingsStore.get()));
  React.useEffect(() => settingsStore.subscribe((s) => setState(selector(s))), [selector]);
  return state;
}

export default function CalendarSettings() {
  const calendar = useSettingsSelector((s) => s.calendar);
  const [dirty, setDirty] = React.useState(false);
  const [draft, setDraft] = React.useState(calendar);

  React.useEffect(() => { setDraft(calendar); setDirty(false); }, [calendar]);

  function onChange(field, value) {
    setDraft({ ...draft, [field]: value });
    setDirty(true);
  }

  async function handleSave() {
    settingsStore.updateSection('calendar', draft);
    await settingsStore.saveToServer();
    setDirty(false);
  }

  function handleReset() {
    const def = settingsStore.DEFAULTS.calendar;
    setDraft(def);
    settingsStore.updateSection('calendar', def);
    setDirty(false);
  }

  async function handleConnect() {
    // Placeholder UI only — integration deferred
    const next = { ...draft, provider: 'google', isConnected: true };
    setDraft(next);
    settingsStore.updateSection('calendar', next);
    await settingsStore.saveToServer();
    setDirty(false);
  }

  async function handleDisconnect() {
    const next = { ...draft, provider: null, isConnected: false, defaultCalendarId: null };
    setDraft(next);
    settingsStore.updateSection('calendar', next);
    await settingsStore.saveToServer();
    setDirty(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Calendar</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="px-3 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty}
            className={`px-3 py-2 text-sm rounded-md text-white ${dirty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'}`}
          >
            Save
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 border rounded-md">
          <div className="text-sm">
            <div className="text-gray-800">
              Google Calendar
              <span className={`ml-2 text-xs px-2 py-0.5 rounded ${draft.isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {draft.isConnected ? 'Connected' : 'Not connected'}
              </span>
            </div>
            <div className="text-gray-500">
              One-way sync (app → Google). OAuth wiring deferred.
            </div>
          </div>
          {!draft.isConnected ? (
            <button onClick={handleConnect} className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
              Connect Google
            </button>
          ) : (
            <button onClick={handleDisconnect} className="px-3 py-2 text-sm rounded-md bg-white text-red-600 border border-red-300 hover:bg-red-50">
              Disconnect
            </button>
          )}
        </div>

        {draft.isConnected && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="block">
              <span className="text-sm text-gray-700">Default calendar</span>
              <select
                value={draft.defaultCalendarId || ''}
                onChange={(e) => onChange('defaultCalendarId', e.target.value || null)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select after real connect</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm text-gray-700">Task → event mapping</span>
              <select
                value={draft.mapping}
                onChange={(e) => onChange('mapping', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="timed">Timed events</option>
                <option value="all_day">All-day events</option>
              </select>
            </label>

            <label className="block md:col-span-2">
              <span className="text-sm text-gray-700">Title template</span>
              <input
                type="text"
                value={draft.titleTemplate}
                onChange={(e) => onChange('titleTemplate', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder='e.g., "[Project] {name}"'
              />
            </label>

            <label className="flex items-center justify-between p-3 border rounded-md md:col-span-2">
              <span className="text-sm text-gray-800">Include completed tasks</span>
              <input
                type="checkbox"
                checked={!!draft.includeCompleted}
                onChange={(e) => onChange('includeCompleted', e.target.checked)}
                className="h-4 w-4"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}


