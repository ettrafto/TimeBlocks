import React from 'react';
import { settingsStore } from '../../state/settingsStore';

function useSettingsSelector(selector) {
  const [state, setState] = React.useState(() => selector(settingsStore.get()));
  React.useEffect(() => settingsStore.subscribe((s) => setState(selector(s))), [selector]);
  return state;
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between p-3 border rounded-md">
      <span className="text-sm text-gray-800">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}

export default function NotificationsSettings() {
  const notifications = useSettingsSelector((s) => s.notifications);
  const [draft, setDraft] = React.useState(notifications);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => { setDraft(notifications); setDirty(false); }, [notifications]);

  function update(path, value) {
    const next = { ...draft };
    let ref = next;
    for (let i = 0; i < path.length - 1; i++) ref = ref[path[i]];
    ref[path[path.length - 1]] = value;
    setDraft(next);
    setDirty(true);
  }

  async function handleSave() {
    settingsStore.updateSection('notifications', draft);
    await settingsStore.saveToServer();
    setDirty(false);
  }

  function handleReset() {
    const def = settingsStore.DEFAULTS.notifications;
    setDraft(def);
    settingsStore.updateSection('notifications', def);
    setDirty(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Notifications</h2>
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
        <h3 className="text-sm font-medium text-gray-700">Channels</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Toggle
            label="In-app"
            checked={draft.channels.inApp}
            onChange={(v) => update(['channels', 'inApp'], v)}
          />
          <Toggle
            label="Email"
            checked={draft.channels.email}
            onChange={(v) => update(['channels', 'email'], v)}
          />
          <Toggle
            label="Push"
            checked={draft.channels.push}
            onChange={(v) => update(['channels', 'push'], v)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Toggle label="Task assigned" checked={draft.types.assigned} onChange={(v) => update(['types', 'assigned'], v)} />
          <Toggle label="Due soon" checked={draft.types.dueSoon} onChange={(v) => update(['types', 'dueSoon'], v)} />
          <Toggle label="Overdue" checked={draft.types.overdue} onChange={(v) => update(['types', 'overdue'], v)} />
          <Toggle label="Comments/mentions" checked={draft.types.comments} onChange={(v) => update(['types', 'comments'], v)} />
          <Toggle label="Project changes" checked={draft.types.projectChanges} onChange={(v) => update(['types', 'projectChanges'], v)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <label className="block">
          <span className="text-sm text-gray-700">Quiet hours start</span>
          <input
            type="time"
            value={draft.quietHours?.start || ''}
            onChange={(e) => update(['quietHours'], { ...(draft.quietHours || {}), start: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Quiet hours end</span>
          <input
            type="time"
            value={draft.quietHours?.end || ''}
            onChange={(e) => update(['quietHours'], { ...(draft.quietHours || {}), end: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm text-gray-700">Digest</span>
          <select
            value={draft.digest}
            onChange={(e) => update(['digest'], e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="off">Off</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
      </div>
    </div>
  );
}


