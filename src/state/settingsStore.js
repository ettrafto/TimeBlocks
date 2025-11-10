// src/state/settingsStore.js
import settingsApi from '../lib/api/settingsClient';
import { log } from '../lib/logger';

const DEFAULT_SETTINGS = {
  general: {
    timeZone: Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || 'UTC',
    dateFormat: 'MDY',
    timeFormat: '12h',
    weekStart: 'Mon',
    workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    workHours: { start: '09:00', end: '17:00' },
  },
  appearance: { theme: 'system', density: 'comfortable' },
  notifications: {
    channels: { inApp: true, email: false, push: false },
    types: { assigned: true, dueSoon: true, overdue: true, comments: true, projectChanges: true },
    quietHours: null,
    digest: 'off',
  },
  scheduling: {
    defaultBlockMinutes: 30,
    bufferMinutes: 5,
    maxDailyMinutes: 8 * 60,
    defaultReminderMinutes: 15,
  },
  tasks: {
    defaultProjectId: null,
    defaultPriority: 'normal',
    defaultLabels: [],
    subtaskBlocksParent: true,
    inheritDueDate: true,
  },
  calendar: {
    provider: null,
    isConnected: false,
    defaultCalendarId: null,
    syncDirection: 'app_to_google',
    mapping: 'timed',
    titleTemplate: '[Project] {name}',
    includeCompleted: false,
  },
  accessibility: { fontScale: 1.0, reducedMotion: false, highContrast: false },
  advanced: { enableBetas: false, diagnostics: false },
};

export function createSettingsStore() {
  let settings = DEFAULT_SETTINGS;

  // Hydrate from localStorage until backend is wired
  try {
    const raw = localStorage.getItem('user.settings');
    if (raw) settings = { ...settings, ...JSON.parse(raw) };
  } catch {}

  let cached = settings;
  const subs = new Set();
  const get = () => cached;
  const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
  const notify = () => { cached = settings; subs.forEach((fn) => fn(cached)); };

  function setAll(next) {
    settings = next;
    try { localStorage.setItem('user.settings', JSON.stringify(settings)); } catch {}
    try { log.info(['Settings','SetAll'], 'applied settings', { tz: settings.general?.timeZone, fmt: settings.general?.timeFormat }); } catch {}
    notify();
  }

  function updateSection(section, patch) {
    settings = { ...settings, [section]: { ...(settings[section] || {}), ...patch } };
    try { localStorage.setItem('user.settings', JSON.stringify(settings)); } catch {}
    try { log.info(['Settings','Update'], `section ${section} updated`); } catch {}
    notify();
  }

  function resetSection(section) {
    settings = { ...settings, [section]: DEFAULT_SETTINGS[section] };
    try { localStorage.setItem('user.settings', JSON.stringify(settings)); } catch {}
    try { log.warn(['Settings','Reset'], `section ${section} reset to defaults`); } catch {}
    notify();
  }

  // Backend wiring
  async function loadFromServer() {
    try {
      const json = await settingsApi.getSettings();
      const merged = { ...DEFAULT_SETTINGS, ...(json || {}) };
      setAll(merged);
      try { log.info(['Settings','Load'], 'loaded from server'); } catch {}
      return merged;
    } catch {
      try { log.warn(['Settings','Load'], 'failed to load from server, using local'); } catch {}
      return settings;
    }
  }

  async function saveToServer() {
    try {
      await settingsApi.putSettings(settings);
      try { log.info(['Settings','Save'], 'saved to server'); } catch {}
    } catch {
      // ignore for now; UI already holds latest
      try { log.warn(['Settings','Save'], 'failed to save to server'); } catch {}
    }
    return settings;
  }

  return {
    get,
    subscribe,
    setAll,
    updateSection,
    resetSection,
    loadFromServer,
    saveToServer,
    DEFAULTS: DEFAULT_SETTINGS,
  };
}

export const settingsStore = createSettingsStore();


