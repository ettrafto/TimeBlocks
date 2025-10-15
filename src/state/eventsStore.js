// src/state/eventsStore.js
import { formatISO } from 'date-fns';

/**
 * Event schema (future-friendly):
 * {
 *   id: string,
 *   label: string,              // display name
 *   dateKey: 'YYYY-MM-DD',      // day partition
 *   startMinutes: number,       // minutes since day start (e.g., 0 = START_HOUR)
 *   duration: number,           // duration in minutes
 *   color?: string,             // Tailwind class
 *   typeId?: string,            // foreign key to type
 *   meta?: Record<string, any>, // extensible metadata
 * }
 */

function keyOf(date) {
  return formatISO(date, { representation: 'date' });
}

export function createEventsStore(initial = []) {
  let byId = new Map();
  let byDate = new Map(); // dateKey -> Set<id>

  // Cache store state to avoid infinite loops
  let cachedState = { byId, byDate };

  const link = (dateKey, id) => {
    if (!byDate.has(dateKey)) byDate.set(dateKey, new Set());
    byDate.get(dateKey).add(id);
  };
  
  const unlink = (dateKey, id) => { 
    byDate.get(dateKey)?.delete(id); 
  };

  // Seed initial data
  initial.forEach((e) => {
    byId.set(e.id, e);
    link(e.dateKey || keyOf(new Date()), e.id);
  });

  const subscribers = new Set();
  const notify = () => {
    cachedState = { byId, byDate };
    subscribers.forEach((fn) => fn(cachedState));
  };

  const get = () => cachedState;

  const subscribe = (fn) => { 
    subscribers.add(fn); 
    return () => subscribers.delete(fn); 
  };

  const upsertEvent = (e) => {
    const prev = byId.get(e.id);
    byId.set(e.id, e);
    if (prev?.dateKey !== e.dateKey) {
      if (prev) unlink(prev.dateKey, e.id);
      link(e.dateKey, e.id);
    } else if (!prev) {
      link(e.dateKey, e.id);
    }
    notify();
  };

  const moveEventToDay = (id, newDateKey, patch = {}) => {
    const prev = byId.get(id);
    if (!prev) return;
    const next = { ...prev, ...patch, dateKey: newDateKey };
    byId.set(id, next);
    if (prev.dateKey !== newDateKey) {
      unlink(prev.dateKey, id);
      link(newDateKey, id);
    }
    notify();
  };

  const updateEventTime = (id, startMinutes, duration, patch = {}) => {
    const prev = byId.get(id);
    if (!prev) return;
    byId.set(id, { ...prev, startMinutes, duration, ...patch });
    notify();
  };

  const removeEvent = (id) => {
    const prev = byId.get(id);
    if (!prev) return;
    byId.delete(id);
    unlink(prev.dateKey, id);
    notify();
  };

  const getEventsForDate = (dateKey) => {
    const ids = byDate.get(dateKey);
    if (!ids) return [];
    return Array.from(ids).map((id) => byId.get(id)).filter(Boolean);
  };

  const findConflictsSameDay = (dateKey, startMinutes, duration, excludeId = null) => {
    const events = getEventsForDate(dateKey);
    const endMinutes = startMinutes + duration;
    return events.filter((e) => {
      if (e.id === excludeId) return false;
      const eEnd = e.startMinutes + e.duration;
      return !(eEnd <= startMinutes || e.startMinutes >= endMinutes);
    });
  };

  const getAllEvents = () => Array.from(byId.values());

  return {
    keyOf,
    get, 
    subscribe,
    upsertEvent, 
    moveEventToDay, 
    updateEventTime, 
    removeEvent,
    getEventsForDate, 
    findConflictsSameDay,
    getAllEvents,
  };
}

export const eventsStore = createEventsStore();

