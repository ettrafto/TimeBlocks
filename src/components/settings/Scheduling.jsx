import React from 'react';
import { settingsStore } from '../../state/settingsStore';

function useSettingsSelector(selector) {
  const [state, setState] = React.useState(() => selector(settingsStore.get()));
  React.useEffect(() => settingsStore.subscribe((s) => setState(selector(s))), [selector]);
  return state;
}

export default function SchedulingSettings() {
  const scheduling = useSettingsSelector((s) => s.scheduling);
  const [draft, setDraft] = React.useState(scheduling);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => { setDraft(scheduling); setDirty(false); }, [scheduling]);

  function onNum(field, value) {
    const v = Math.max(0, Number(value) || 0);
    const next = { ...draft, [field]: v };
    setDraft(next);
    setDirty(true);
  }

  async function handleSave() {
    settingsStore.updateSection('scheduling', draft);
    await settingsStore.saveToServer();
    setDirty(false);
  }

  function handleReset() {
    const def = settingsStore.DEFAULTS.scheduling;
    setDraft(def);
    settingsStore.updateSection('scheduling', def);
    setDirty(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Time & Scheduling</h2>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="block">
          <span className="text-sm text-gray-700">Default block length (minutes)</span>
          <input
            type="number"
            min="5"
            step="5"
            value={draft.defaultBlockMinutes}
            onChange={(e) => onNum('defaultBlockMinutes', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Buffer between blocks (minutes)</span>
          <input
            type="number"
            min="0"
            step="5"
            value={draft.bufferMinutes}
            onChange={(e) => onNum('bufferMinutes', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Max daily load (minutes)</span>
          <input
            type="number"
            min="0"
            step="15"
            value={draft.maxDailyMinutes}
            onChange={(e) => onNum('maxDailyMinutes', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Default reminder lead time (minutes)</span>
          <input
            type="number"
            min="0"
            step="5"
            value={draft.defaultReminderMinutes}
            onChange={(e) => onNum('defaultReminderMinutes', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </label>
      </div>
    </div>
  );
}


