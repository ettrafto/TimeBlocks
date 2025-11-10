import React from 'react';
import { settingsStore } from '../../state/settingsStore';
import { applyTheme } from '../../utils/theme';

function useSettingsSelector(selector) {
  const [state, setState] = React.useState(() => selector(settingsStore.get()));
  React.useEffect(() => settingsStore.subscribe((s) => setState(selector(s))), [selector]);
  return state;
}

export default function AppearanceSettings() {
  const appearance = useSettingsSelector((s) => s.appearance);
  const [draft, setDraft] = React.useState(appearance);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => { setDraft(appearance); setDirty(false); }, [appearance]);

  function onChange(field, value) {
    const next = { ...draft, [field]: value };
    setDraft(next);
    setDirty(true);
    if (field === 'theme') applyTheme(value); // instant apply
  }

  async function handleSave() {
    settingsStore.updateSection('appearance', draft);
    await settingsStore.saveToServer();
    setDirty(false);
  }

  function handleReset() {
    const def = settingsStore.DEFAULTS.appearance;
    setDraft(def);
    settingsStore.updateSection('appearance', def);
    applyTheme(def.theme);
    setDirty(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Appearance</h2>
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
          <span className="text-sm text-gray-700">Theme</span>
          <select
            value={draft.theme}
            onChange={(e) => onChange('theme', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="ocean">Ocean</option>
            <option value="forest">Forest</option>
            <option value="sunset">Sunset</option>
            <option value="slate">Slate</option>
            <option value="contrast">High Contrast</option>
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-700">Density</span>
          <select
            value={draft.density}
            onChange={(e) => onChange('density', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="comfortable">Comfortable</option>
            <option value="compact">Compact</option>
          </select>
        </label>
      </div>
    </div>
  );
}


