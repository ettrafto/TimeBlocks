import React from 'react';
import { settingsStore } from '../../state/settingsStore';

function useSettingsSelector(selector) {
  const [state, setState] = React.useState(() => selector(settingsStore.get()));
  React.useEffect(() => settingsStore.subscribe((s) => setState(selector(s))), [selector]);
  return state;
}

export default function TaskDefaultsSettings() {
  const tasks = useSettingsSelector((s) => s.tasks);
  const [draft, setDraft] = React.useState(tasks);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => { setDraft(tasks); setDirty(false); }, [tasks]);

  function onChange(field, value) {
    setDraft({ ...draft, [field]: value });
    setDirty(true);
  }

  async function handleSave() {
    // Normalize labels
    const normalized = {
      ...draft,
      defaultLabels: (draft.defaultLabels || []).map((s) => String(s).trim()).filter(Boolean),
    };
    settingsStore.updateSection('tasks', normalized);
    await settingsStore.saveToServer();
    setDirty(false);
  }

  function handleReset() {
    const def = settingsStore.DEFAULTS.tasks;
    setDraft(def);
    settingsStore.updateSection('tasks', def);
    setDirty(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Task Defaults</h2>
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
          <span className="text-sm text-gray-700">Default project (optional)</span>
          <input
            type="text"
            value={draft.defaultProjectId || ''}
            onChange={(e) => onChange('defaultProjectId', e.target.value)}
            placeholder="Enter project id or name"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-700">Default priority</span>
          <select
            value={draft.defaultPriority}
            onChange={(e) => onChange('defaultPriority', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </select>
        </label>

        <label className="block md:col-span-2">
          <span className="text-sm text-gray-700">Default labels (comma separated)</span>
          <input
            type="text"
            value={(draft.defaultLabels || []).join(', ')}
            onChange={(e) => onChange('defaultLabels', e.target.value.split(',').map((s) => s.trim()))}
            placeholder="e.g., work, deep-focus"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <label className="flex items-center justify-between p-3 border rounded-md">
          <span className="text-sm text-gray-800">Subtasks block parent completion</span>
          <input
            type="checkbox"
            checked={!!draft.subtaskBlocksParent}
            onChange={(e) => onChange('subtaskBlocksParent', e.target.checked)}
            className="h-4 w-4"
          />
        </label>
        <label className="flex items-center justify-between p-3 border rounded-md">
          <span className="text-sm text-gray-800">Subtasks inherit due date</span>
          <input
            type="checkbox"
            checked={!!draft.inheritDueDate}
            onChange={(e) => onChange('inheritDueDate', e.target.checked)}
            className="h-4 w-4"
          />
        </label>
      </div>
    </div>
  );
}


