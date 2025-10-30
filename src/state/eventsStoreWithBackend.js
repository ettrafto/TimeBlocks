// src/state/eventsStoreWithBackend.js
import { formatISO, parseISO, addMinutes } from 'date-fns';
import { scheduledEventsApi } from '../services/api';
import { isValidEvent, diagnoseEvents, cleanEvents } from '../utils/eventValidation';

/**
 * Enhanced events store with backend synchronization
 * Maintains same API as original but persists to backend
 */

function keyOf(date) {
  return formatISO(date, { representation: 'date' });
}

// Convert frontend event to backend format
function toBackendEvent(event, calendarId = 'cal_main') {
  // Parse dateKey and startMinutes to create ISO timestamps
  const baseDate = parseISO(event.dateKey);
  const startDate = addMinutes(baseDate, event.startMinutes || 0);
  const endDate = addMinutes(startDate, event.duration || 30);

  return {
    id: event.id,
    calendarId,
    libraryEventId: event.libraryEventId || null,
    typeId: event.typeId || null,
    title: event.label || event.name || 'Untitled',
    notes: event.notes || null,
    tzid: 'America/Toronto', // TODO: make this configurable
    startUtc: startDate.toISOString(),
    endUtc: endDate.toISOString(),
    isAllDay: 0,
    recurrenceRule: event.recurrenceRule || null,
    createdBy: 'u_dev',
  };
}

// Convert backend event to frontend format
function fromBackendEvent(backendEvent) {
  const startDate = parseISO(backendEvent.startUtc);
  const endDate = parseISO(backendEvent.endUtc);
  
  // Calculate start minutes from beginning of day (assuming 8 AM start)
  const dayStart = new Date(startDate);
  dayStart.setHours(8, 0, 0, 0);
  const startMinutes = Math.floor((startDate - dayStart) / (1000 * 60));
  
  const duration = Math.floor((endDate - startDate) / (1000 * 60));
  
  return {
    id: backendEvent.id,
    label: backendEvent.title,
    dateKey: keyOf(startDate),
    startMinutes: Math.max(0, startMinutes), // Ensure non-negative
    duration,
    color: null, // TODO: get from type
    typeId: backendEvent.typeId,
    libraryEventId: backendEvent.libraryEventId,
    notes: backendEvent.notes,
  };
}

export function createEventsStoreWithBackend(initial = []) {
  let byId = new Map();
  let byDate = new Map();
  let cachedState = { byId, byDate };
  let isInitialized = false;

  const link = (dateKey, id) => {
    if (!byDate.has(dateKey)) byDate.set(dateKey, new Set());
    byDate.get(dateKey).add(id);
  };
  
  const unlink = (dateKey, id) => { 
    byDate.get(dateKey)?.delete(id); 
  };

  // Seed initial data (from localStorage fallback)
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

  // Initialize from backend
  const initialize = async () => {
    if (isInitialized) return;
    
    try {
      // Load events for current month (extend range as needed)
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const backendEvents = await scheduledEventsApi.getForRange(
        firstDay.toISOString(),
        lastDay.toISOString()
      );

      console.log('📊 Raw backend events loaded:', backendEvents.length);
      
      // Diagnose events for issues
      const frontendEvents = backendEvents.map(fromBackendEvent);
      const diagnosis = diagnoseEvents(frontendEvents);
      
      if (diagnosis.suspiciousCount > 0) {
        console.warn('🔎 Suspicious events detected:', diagnosis.suspicious);
        console.log('🧹 Cleaning invalid events...');
      }

      // Clear existing and load only valid events from backend
      byId.clear();
      byDate.clear();

      const cleanedEvents = cleanEvents(frontendEvents);
      cleanedEvents.forEach((fe) => {
        byId.set(fe.id, fe);
        link(fe.dateKey, fe.id);
      });

      isInitialized = true;
      notify();
      console.log('✅ Valid events loaded:', cleanedEvents.length);
      if (diagnosis.suspiciousCount > 0) {
        console.log(`🧹 Filtered out ${diagnosis.suspiciousCount} invalid events`);
      }
    } catch (error) {
      console.error('❌ Failed to load events from backend:', error);
      // Fall back to localStorage data already loaded
      isInitialized = true;
    }
  };

  const upsertEvent = async (e) => {
    // Validate event before processing
    if (!isValidEvent(e)) {
      console.warn('⚠️ Attempted to upsert invalid event:', e);
      return;
    }
    
    const prev = byId.get(e.id);
    
    // Update local state immediately for responsiveness
    byId.set(e.id, e);
    if (prev?.dateKey !== e.dateKey) {
      if (prev) unlink(prev.dateKey, e.id);
      link(e.dateKey, e.id);
    } else if (!prev) {
      link(e.dateKey, e.id);
    }
    notify();

    // Sync to backend
    try {
      const backendEvent = toBackendEvent(e);
      if (prev) {
        await scheduledEventsApi.update(e.id, backendEvent);
        console.log('✅ Event updated on backend:', e.id);
      } else {
        await scheduledEventsApi.create(backendEvent);
        console.log('✅ Event created on backend:', e.id);
      }
    } catch (error) {
      console.error('❌ Failed to sync event to backend:', error);
      // TODO: Add retry logic or offline queue
    }
  };

  const moveEventToDay = async (id, newDateKey, patch = {}) => {
    const prev = byId.get(id);
    if (!prev) return;
    
    const next = { ...prev, ...patch, dateKey: newDateKey };
    
    // Update local state
    byId.set(id, next);
    if (prev.dateKey !== newDateKey) {
      unlink(prev.dateKey, id);
      link(newDateKey, id);
    }
    notify();

    // Sync to backend
    try {
      const backendEvent = toBackendEvent(next);
      await scheduledEventsApi.update(id, backendEvent);
      console.log('✅ Event moved on backend:', id);
    } catch (error) {
      console.error('❌ Failed to move event on backend:', error);
    }
  };

  const updateEventTime = async (id, startMinutes, duration, patch = {}) => {
    const prev = byId.get(id);
    if (!prev) return;
    
    const next = { ...prev, startMinutes, duration, ...patch };
    byId.set(id, next);
    notify();

    // Sync to backend
    try {
      const backendEvent = toBackendEvent(next);
      await scheduledEventsApi.update(id, backendEvent);
      console.log('✅ Event time updated on backend:', id);
    } catch (error) {
      console.error('❌ Failed to update event time on backend:', error);
    }
  };

  const removeEvent = async (id) => {
    const prev = byId.get(id);
    if (!prev) return;
    
    // Update local state
    byId.delete(id);
    unlink(prev.dateKey, id);
    notify();

    // Sync to backend
    try {
      await scheduledEventsApi.delete(id);
      console.log('✅ Event deleted on backend:', id);
    } catch (error) {
      console.error('❌ Failed to delete event on backend:', error);
    }
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

  // Auto-initialize on first use
  initialize();

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
    initialize, // Expose for manual re-initialization
  };
}

export const eventsStore = createEventsStoreWithBackend();

