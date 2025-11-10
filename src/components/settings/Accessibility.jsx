import React from 'react';
import { settingsStore } from '../../state/settingsStore';

function useSettingsSelector(selector) {
  const [state, setState] = React.useState(() => selector(settingsStore.get()));
  React.useEffect(() => settingsStore.subscribe((s) => setState(selector(s))), [selector]);
  return state;
}

export default function AccessibilitySettings() {
  const a11y = useSettingsSelector((s) => s.accessibility);
  const [draft, setDraft] = React.useState(a11y);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => { setDraft(a11y); setDirty(false); }, [a11y]);

  function onChange(field, value) {
    setDraft({ ...draft, [field]: value });
    setDirty(true);
  }

  function handleSave() {
    settingsStore.updateSection('accessibility', draft);
    setDirty(false);
  }

  function handleReset() {
    const def = settingsStore.DEFAULTS.accessibility;
    setDraft(def);
    settingsStore.updateSection('accessibility', def);
    setDirty(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Accessibility</h2>
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
          <span className="text-sm text-gray-700">Font scale</span>
          <input
            type="number"
            min="0.8"
            max="1.6"
            step="0.05"
            value={draft.fontScale}
            onChange={(e) => onChange('fontScale', parseFloat(e.target.value) || 1)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
        </label>
        <label className="flex items-center justify-between p-3 border rounded-md">
          <span className="text-sm text-gray-800">Reduced motion</span>
          <input
            type="checkbox"
            checked={!!draft.reducedMotion}
            onChange={(e) => onChange('reducedMotion', e.target.checked)}
            className="h-4 w-4"
          />
        </label>
        <label className="flex items-center justify-between p-3 border rounded-md">
          <span className="text-sm text-gray-800">High contrast</span>
          <input
            type="checkbox"
            checked={!!draft.highContrast}
            onChange={(e) => onChange('highContrast', e.target.checked)}
            className="h-4 w-4"
          />
        </label>
      </div>
    </div>
  );
}


