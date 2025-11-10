import React from 'react';
import { settingsStore } from '../../state/settingsStore';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function useSettingsSelector(selector) {
  const [state, setState] = React.useState(() => selector(settingsStore.get()));
  React.useEffect(() => settingsStore.subscribe((s) => setState(selector(s))), [selector]);
  return state;
}

export default function GeneralSettings() {
  const general = useSettingsSelector((s) => s.general);
  const defaults = settingsStore.DEFAULTS.general;

  const [draft, setDraft] = React.useState(general);
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    setDraft(general);
    setDirty(false);
  }, [general]);

  function onChange(field, value) {
    const next = { ...draft, [field]: value };
    setDraft(next);
    setDirty(true);
  }

  function validateHours(start, end) {
    const toNum = (s) => {
      const [h, m] = String(s || '').split(':').map((n) => parseInt(n, 10));
      return (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0);
    };
    const sMin = toNum(start);
    const eMin = toNum(end);
    if (eMin <= sMin) {
      console.warn('[Settings/General] Invalid work hours, adjusting end to start+60', { start, end });
      const sh = Math.floor(sMin / 60);
      const eh = Math.min(23, sh + 1);
      return { start, end: `${String(eh).padStart(2,'0')}:00` };
    }
    return { start, end };
  }

  function toggleWorkDay(day) {
    const set = new Set(draft.workDays);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    onChange('workDays', Array.from(set));
  }

  async function handleSave() {
    const fixed = validateHours(draft.workHours.start, draft.workHours.end);
    const payload = { ...draft, workHours: fixed };
    settingsStore.updateSection('general', payload);
    await settingsStore.saveToServer();
    setDirty(false);
  }

  function handleReset() {
    settingsStore.resetSection('general');
  }

  const timeZones = (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : []) || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">General</h2>
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
          <span className="text-sm text-gray-700">Time zone</span>
          {timeZones.length > 0 ? (
            <select
              value={draft.timeZone}
              onChange={(e) => onChange('timeZone', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {timeZones.map((tz) => (<option key={tz} value={tz}>{tz}</option>))}
            </select>
          ) : (
            <input
              type="text"
              value={draft.timeZone}
              onChange={(e) => onChange('timeZone', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., America/Los_Angeles"
            />
          )}
        </label>

        <div className="grid grid-cols-2 gap-6">
          <label className="block">
            <span className="text-sm text-gray-700">Date format</span>
            <select
              value={draft.dateFormat}
              onChange={(e) => onChange('dateFormat', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="MDY">MM/DD/YYYY</option>
              <option value="DMY">DD/MM/YYYY</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Time format</span>
            <select
              value={draft.timeFormat}
              onChange={(e) => onChange('timeFormat', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <label className="block">
            <span className="text-sm text-gray-700">Week start</span>
            <select
              value={draft.weekStart}
              onChange={(e) => onChange('weekStart', e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="Mon">Monday</option>
              <option value="Sun">Sunday</option>
            </select>
          </label>

          <div className="block">
            <span className="text-sm text-gray-700">Work days</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {DAYS.map((d) => {
                const active = draft.workDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleWorkDay(d)}
                    className={`px-3 py-1.5 rounded-md text-sm border ${active ? 'bg-neutral-900 text-white border-neutral-900' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <label className="block">
            <span className="text-sm text-gray-700">Work start</span>
            <input
              type="time"
              value={draft.workHours.start}
              onChange={(e) => onChange('workHours', { ...draft.workHours, start: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm text-gray-700">Work end</span>
            <input
              type="time"
              value={draft.workHours.end}
              onChange={(e) => onChange('workHours', { ...draft.workHours, end: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
}


