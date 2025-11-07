// src/state/eventsStoreWithBackend.js
import { formatISO, parseISO, addMinutes } from 'date-fns';
import { scheduledEventsApi } from '../services/api';
import { isValidEvent, diagnoseEvents, cleanEvents } from '../utils/eventValidation';
import { TBLog } from '../../shared/logging/logger.js';
import { newCorrelationId } from '../../shared/logging/correlation.js';

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
  let loading = false;
  let error = null;
  let lastLoadedAt = 0;

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
    const cid = newCorrelationId("store-init");
    const g = TBLog.group("Store: Initialize (rehydrate events)", cid);
    
    try {
      loading = true; error = null;
      // Load events for current month (extend range as needed)
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      TBLog.kv("Load params", { from: firstDay.toISOString(), to: lastDay.toISOString() });
      
      const backendEvents = await scheduledEventsApi.getForRange(
        firstDay.toISOString(),
        lastDay.toISOString()
      );

      TBLog.info(`Raw backend events loaded: ${backendEvents.length}`);
      
      // Ensure backendEvents is an array
      const safeEvents = Array.isArray(backendEvents) ? backendEvents : [];
      
      // Diagnose events for issues
      const frontendEvents = safeEvents.map(fromBackendEvent);
      const diagnosis = diagnoseEvents(frontendEvents);
      
      if (diagnosis.suspiciousCount > 0) {
        TBLog.warn('Suspicious events detected', diagnosis.suspicious);
      }

      // Clean events; do NOT filter legitimate titles on production
      const cleanedEvents = cleanEvents(frontendEvents);
      const filtered = cleanedEvents;

      // Clear existing and load only valid events from backend
      byId.clear();
      byDate.clear();

      filtered.forEach((fe) => {
        byId.set(fe.id, fe);
        link(fe.dateKey, fe.id);
      });

      isInitialized = true;
      lastLoadedAt = Date.now();
      notify();
      TBLog.kv("Store state (post-init)", { totalEvents: filtered.length, suspiciousCount: diagnosis.suspiciousCount });
    } catch (error) {
      TBLog.error('Failed to load events from backend', error);
      // Keep UI stable with empty events array instead of crashing
      byId.clear();
      byDate.clear();
      isInitialized = true;
      error = error?.message || String(error);
      lastLoadedAt = Date.now();
      notify();
    } finally {
      loading = false;
      g.end();
    }
  };

  // New: explicit load method with broader range for API testing page
  const loadAll = async ({ force = false } = {}) => {
    if (loading) return;
    if (!force && lastLoadedAt && (Date.now() - lastLoadedAt < 5000)) return;
    const cid = newCorrelationId("store-load");
    const g = TBLog.group("Store: Load all events (broad range)", cid);
    try {
      loading = true; error = null;
      const from = new Date(); from.setFullYear(from.getFullYear() - 1);
      const to = new Date(); to.setFullYear(to.getFullYear() + 1);
      const backendEvents = await scheduledEventsApi.getForRange(from.toISOString(), to.toISOString());
      const safeEvents = Array.isArray(backendEvents) ? backendEvents : [];
      const frontendEvents = safeEvents.map(fromBackendEvent);
      byId.clear(); byDate.clear();
      frontendEvents.forEach((fe) => {
        byId.set(fe.id, fe);
        link(fe.dateKey, fe.id);
      });
      lastLoadedAt = Date.now();
      notify();
    } catch (e) {
      error = e?.message || String(e);
      lastLoadedAt = Date.now();
      notify();
    } finally {
      loading = false;
      g.end();
    }
  };

  const upsertEvent = async (e) => {
    const cid = newCorrelationId("store-upsert");
    const g = TBLog.group(`Store: upsertEvent`, cid);
    
    try {
      // Validate event before processing
      if (!isValidEvent(e)) {
        TBLog.warn('Attempted to upsert invalid event', e);
        return;
      }
      
      const prev = byId.get(e.id);
      TBLog.kv("Event data", { event: e, isUpdate: !!prev });
      
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
          TBLog.info('Event updated on backend', { eventId: e.id });
        } else {
          await scheduledEventsApi.create(backendEvent);
          TBLog.info('Event created on backend', { eventId: e.id });
        }
      } catch (error) {
        TBLog.error('Failed to sync event to backend', error);
        // TODO: Add retry logic or offline queue
      }
    } finally {
      g.end();
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
    const cid = newCorrelationId("store-delete");
    const g = TBLog.group(`Store: removeEvent`, cid);
    
    try {
      const prev = byId.get(id);
      if (!prev) {
        TBLog.warn('Attempted to remove non-existent event', { id });
        return;
      }
      
      TBLog.kv("Delete params", { id, event: prev });
      
      // Update local state
      byId.delete(id);
      unlink(prev.dateKey, id);
      notify();

      // Sync to backend
      try {
        await scheduledEventsApi.delete(id);
        TBLog.info('Event deleted on backend', { eventId: id });
      } catch (error) {
        TBLog.error('Failed to delete event on backend', error);
      }
    } finally {
      g.end();
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
  const getStatus = () => ({ loading, error, lastLoadedAt });

  // Auto-initialize on first use
  initialize();

  return {
    keyOf,
    get, 
    subscribe,
    getStatus,
    loadAll,
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

