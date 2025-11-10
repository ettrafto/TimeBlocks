// src/state/dateStore.js
import {
  addDays,
  startOfWeek,
  formatISO,
  isSameDay,
  isSaturday,
  isSunday,
} from 'date-fns';

export function createDateState(initialDate = new Date()) {
  let selectedDate = initialDate;
  let weekStartsOn = 1; // Monday
  let viewMode = 'day'; // 'day' | '3day' | 'week'
  let includeWeekends = false; // default: exclude weekends
  let workDays = ['Mon','Tue','Wed','Thu','Fri'];
  
  // Cache the state object to avoid infinite loops in useSyncExternalStore
  let cachedState = { selectedDate, weekStartsOn, viewMode, includeWeekends };

  const get = () => cachedState;

  // --------------------------------
  // Weekend helpers
  // --------------------------------
  const isWeekend = (d) => isSaturday(d) || isSunday(d);

  const clampToWeekday = (d) => {
    if (includeWeekends) return d;
    // If selected lands on weekend, snap forward to Monday
    if (isSaturday(d)) return addDays(d, 2);
    if (isSunday(d)) return addDays(d, 1);
    return d;
  };

  const addBusinessDays = (d, delta) => {
    if (includeWeekends || delta === 0) return addDays(d, delta);
    let cur = d;
    const step = delta > 0 ? 1 : -1;
    let remaining = Math.abs(delta);
    while (remaining > 0) {
      cur = addDays(cur, step);
      if (!isWeekend(cur)) remaining--;
    }
    return cur;
  };

  // --------------------------------
  // Core setters
  // --------------------------------
  const setDate = (date) => { 
    selectedDate = includeWeekends ? date : clampToWeekday(date);
    cachedState = { selectedDate, weekStartsOn, viewMode, includeWeekends };
  };
  
  const setViewMode = (m) => { 
    viewMode = m;
    cachedState = { selectedDate, weekStartsOn, viewMode, includeWeekends };
  };

  const setIncludeWeekends = (flag) => {
    includeWeekends = !!flag;
    selectedDate = clampToWeekday(selectedDate);
    cachedState = { selectedDate, weekStartsOn, viewMode, includeWeekends };
  };

  const setWeekStartsOn = (n) => {
    weekStartsOn = n === 0 ? 0 : 1;
    cachedState = { selectedDate, weekStartsOn, viewMode, includeWeekends };
  };

  const setWorkDays = (days) => {
    workDays = Array.isArray(days) ? days : workDays;
    // If both weekend days are present, include weekends
    const hasSat = workDays.includes('Sat');
    const hasSun = workDays.includes('Sun');
    setIncludeWeekends(hasSat && hasSun);
  };

  // Window size based on view mode
  const getWindowSize = () => (viewMode === 'week' ? 5 : viewMode === '3day' ? 3 : 1);

  const shiftWindow = (dir) => {
    const size = getWindowSize();
    selectedDate = addBusinessDays(selectedDate, dir * size);
    selectedDate = clampToWeekday(selectedDate);
    cachedState = { selectedDate, weekStartsOn, viewMode, includeWeekends };
  };

  const nextWindow = () => shiftWindow(+1);
  const prevWindow = () => shiftWindow(-1);
  
  const goToday = () => { 
    selectedDate = clampToWeekday(new Date());
    cachedState = { selectedDate, weekStartsOn, viewMode, includeWeekends };
  };

  // --------------------------------
  // Utilities
  // --------------------------------
  const getWeekStart = (base = selectedDate) => startOfWeek(base, { weekStartsOn });

  // Get displayed days for current window (respects weekend policy)
  const getDisplayedDays = () => {
    const size = getWindowSize();
    let start = selectedDate;
    
    // For week view, anchor to Monday
    if (viewMode === 'week') {
      start = startOfWeek(selectedDate, { weekStartsOn });
    }
    
    // Ensure start is a weekday if excluding weekends
    start = clampToWeekday(start);

    const days = [];
    let cur = start;

    while (days.length < size) {
      if (includeWeekends || !isWeekend(cur)) {
        days.push(cur);
      }
      cur = addDays(cur, 1);
    }

    return days;
  };

  // Stable keys for data-fetching (per day)
  const getDateKey = (d = selectedDate) => formatISO(d, { representation: 'date' });
  const getVisibleKeys = () => getDisplayedDays().map((d) => getDateKey(d));

  // --------------------------------
  // Minimal subscription pattern
  // --------------------------------
  const subscribers = new Set();
  const subscribe = (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); };
  const notify = () => subscribers.forEach((fn) => fn(get()));

  // Public API that notifies on change
  return {
    get,
    subscribe,
    actions: {
      setDate: (d) => { setDate(d); notify(); },
      setViewMode: (m) => { setViewMode(m); notify(); },
      setIncludeWeekends: (f) => { setIncludeWeekends(f); notify(); },
      setWeekStartsOn: (n) => { setWeekStartsOn(n); notify(); },
      setWorkDays: (days) => { setWorkDays(days); notify(); },
      nextWindow: () => { nextWindow(); notify(); },
      prevWindow: () => { prevWindow(); notify(); },
      goToday: () => { goToday(); notify(); },
    },
    utils: { 
      getWeekStart,
      getDisplayedDays,
      getDateKey,
      getVisibleKeys,
      isSameDay,
      addBusinessDays: (d, n) => addBusinessDays(d, n),
    },
  };
}

// Singleton instance for the app (can be swapped later for Context/Zustand)
export const dateStore = createDateState();

