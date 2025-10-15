// src/state/dateStore.js
import { addDays, startOfWeek, formatISO, isSameDay } from 'date-fns';

export function createDateState(initialDate = new Date()) {
  let selectedDate = initialDate;
  let weekStartsOn = 1; // Monday (configurable later)
  
  // Cache the state object to avoid infinite loops in useSyncExternalStore
  let cachedState = { selectedDate, weekStartsOn };

  const get = () => cachedState;

  const setDate = (date) => { 
    selectedDate = date;
    cachedState = { selectedDate, weekStartsOn };
  };
  const nextDay = () => { 
    selectedDate = addDays(selectedDate, 1);
    cachedState = { selectedDate, weekStartsOn };
  };
  const prevDay = () => { 
    selectedDate = addDays(selectedDate, -1);
    cachedState = { selectedDate, weekStartsOn };
  };
  const goToday = () => { 
    selectedDate = new Date();
    cachedState = { selectedDate, weekStartsOn };
  };
  const getWeekStart = () => startOfWeek(selectedDate, { weekStartsOn });

  // Simple pseudo-data key (stable, for future DB fetch)
  const getDateKey = () => formatISO(selectedDate, { representation: 'date' });

  // Minimal subscription pattern to notify React via prop callbacks
  const subscribers = new Set();
  const subscribe = (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); };
  const notify = () => subscribers.forEach((fn) => fn(get()));

  // Public API that notifies on change
  return {
    get,
    subscribe,
    actions: {
      setDate: (d) => { setDate(d); notify(); },
      nextDay: () => { nextDay(); notify(); },
      prevDay: () => { prevDay(); notify(); },
      goToday: () => { goToday(); notify(); },
    },
    utils: { getWeekStart, getDateKey, isSameDay },
  };
}

// Singleton instance for the app (can be swapped later for Context/Zustand)
export const dateStore = createDateState();

