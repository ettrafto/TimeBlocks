// API Service Layer for TimeBlocks Backend
// 
// This module provides domain-focused wrappers around the unified HTTP client (client.ts).
// All requests go through client.ts which handles:
// - Automatic refresh-on-401
// - CSRF token attachment
// - Correlation ID management
// - Error normalization (TBError)
// - HTTP-level logging
//
// This module adds domain-level logging and maintains the existing public API.

import { TBLog } from "../../shared/logging/logger.js";
import { apiRequest as httpRequest, getCorrelationId, ensureCsrfForMutations } from "../lib/api/client";
import { logInfo, logWarn, logError, logDebug } from "../lib/logging";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";
const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID ?? "ws_dev";
const CALENDAR_ID = import.meta.env.VITE_CALENDAR_ID ?? "cal_main";

/**
 * Thin wrapper around the unified HTTP client (client.ts).
 * Adds domain-level logging while delegating all HTTP logic to client.ts.
 * 
 * @param path - API path (e.g., '/api/types')
 * @param options - Request options (method, body, headers)
 * @returns Promise with response data
 */
export async function apiRequest(path, { method = "GET", body, headers = {} } = {}) {
  const cid = getCorrelationId();
  const g = TBLog.group(`API ${method} ${path}`, cid);
  
  logInfo('API', `${method} ${path}`, { cid });
  
  try {
    TBLog.kv("Request", { path, method, body });
    
    // Delegate to unified HTTP client (client.ts)
    // This handles: credentials, CSRF, correlation IDs, refresh-on-401, error normalization
    const result = await httpRequest(path, {
      method,
      body,
      headers,
    });
    
    TBLog.kv("Response", { status: 200, result });
    logInfo('API', `${method} ${path} success`, { cid });
    
    return result;
  } catch (error) {
    // Error is already a TBError from client.ts
    const status = error?.status || null;
    const code = error?.code || null;
    
    TBLog.error("API request failed", { status, code, error });
    
    // Domain-level error logging (HTTP-level logging already done in client.ts)
    if (status === 401) {
      logWarn('API', `${method} ${path} unauthorized`, {
        cid,
        code,
      });
    } else {
      logError('API', `${method} ${path} failed`, {
        cid,
        status,
        code,
      });
    }
    
    throw error; // Re-throw TBError from client.ts
  } finally {
    g.end();
  }
}

// ========================================
// Event Types API
// ========================================

export const eventTypesApi = {
  // Get all types (workspace ignored; backend uses single set)
  getAll: async () => {
    const cid = getCorrelationId();
    logInfo('API][Types', 'getAll start', { cid });
    try {
      const result = await apiRequest(`/api/types`);
      logInfo('API][Types', 'getAll success', { cid, count: Array.isArray(result) ? result.length : 0 });
      return result;
    } catch (error) {
      logError('API][Types', 'getAll failed', { cid, status: error?.status, code: error?.code });
      throw error;
    }
  },

  // Create a new type
  create: async (type) => {
    const cid = getCorrelationId();
    logInfo('API][Types', 'create start', { cid, typeId: type?.id });
    try {
      const result = await apiRequest(`/api/types`, {
        method: 'POST',
        body: type,
      });
      logInfo('API][Types', 'create success', { cid, typeId: result?.id });
      return result;
    } catch (error) {
      logError('API][Types', 'create failed', { cid, status: error?.status, code: error?.code });
      throw error;
    }
  },

  // Update a type (PATCH aligns with backend controller)
  update: async (id, type) => {
    const cid = getCorrelationId();
    logInfo('API][Types', 'update start', { cid, typeId: id });
    try {
      const result = await apiRequest(`/api/types/${id}`, {
        method: 'PATCH',
        body: type,
      });
      logInfo('API][Types', 'update success', { cid, typeId: id });
      return result;
    } catch (error) {
      logError('API][Types', 'update failed', { cid, typeId: id, status: error?.status, code: error?.code });
      throw error;
    }
  },

  // Delete a type
  delete: async (id) => {
    const cid = getCorrelationId();
    logInfo('API][Types', 'delete start', { cid, typeId: id });
    try {
      const result = await apiRequest(`/api/types/${id}`, {
        method: 'DELETE',
      });
      logInfo('API][Types', 'delete success', { cid, typeId: id });
      return result;
    } catch (error) {
      logError('API][Types', 'delete failed', { cid, typeId: id, status: error?.status, code: error?.code });
      throw error;
    }
  },
};

// ========================================
// Library Events (Templates) API
// ========================================

export const libraryEventsApi = {
  // Get all library events for workspace
  getAll: (workspaceId = WORKSPACE_ID) => apiRequest(`/api/workspaces/${workspaceId}/library-events`),

  // Create a new library event
  // Accept body first; workspaceId optional second param
  create: (event, workspaceId = WORKSPACE_ID) => apiRequest(`/api/workspaces/${workspaceId}/library-events`, {
    method: 'POST',
    body: event,
  }),

  // Update a library event
  update: (id, event) => apiRequest(`/api/library-events/${id}`, {
    method: 'PUT',
    body: event,
  }),

  // Delete a library event
  delete: (id) => apiRequest(`/api/library-events/${id}`, {
    method: 'DELETE',
  }),
};

// ========================================
// Scheduled Events API
// ========================================

export const scheduledEventsApi = {
  // Get occurrences for calendar/date range, map to Event-like shape expected by store
  getForRange: async (from, to, calendarId = CALENDAR_ID) => {
    const cid = getCorrelationId();
    logInfo('API][Events', 'getForRange start', { cid, calendarId, from, to });
    try {
      const occs = await apiRequest(`/api/calendars/${encodeURIComponent(calendarId)}/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      // Map occurrences -> event rows the store expects (id/title/startUtc/endUtc/typeId)
      const mapped = Array.isArray(occs) ? occs.map(o => ({
        id: o.event_id,
        taskId: o.taskId ?? null,
        title: o.title,
        startUtc: o.start,
        endUtc: o.end,
        typeId: o.type_id ?? null,
        libraryEventId: null,
      })) : [];
      logInfo('API][Events', 'getForRange success', { cid, calendarId, count: mapped.length });
      return mapped;
    } catch (error) {
      logError('API][Events', 'getForRange failed', { cid, calendarId, status: error?.status, code: error?.code });
      throw error;
    }
  },

  // Create an event (translate to backend payload)
  create: (event) => apiRequest(`/api/calendars/${encodeURIComponent(event.calendarId || CALENDAR_ID)}/scheduled-events`, {
    method: 'POST',
    body: {
      id: event.id,
      title: event.title,
      startUtc: event.startUtc,
      endUtc: event.endUtc,
      tzid: event.tzid || 'UTC',
      isAllDay: event.isAllDay ?? 0,
      typeId: event.typeId ?? null,
      taskId: event.taskId ?? null,
      notes: event.color ?? null,
      createdBy: event.createdBy || 'u_dev',
      createdAtUtc: event.createdAtUtc || new Date().toISOString(),
    },
  }),

  // Update an event by id (partial)
  update: (id, event) => apiRequest(`/api/scheduled-events/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: {
      id,
      calendarId: event.calendarId || CALENDAR_ID,
      title: event.title,
      startUtc: event.startUtc,
      endUtc: event.endUtc,
      tzid: event.tzid || 'UTC',
      isAllDay: event.isAllDay ?? 0,
      typeId: event.typeId ?? null,
      taskId: event.taskId ?? null,
      notes: event.color ?? null,
      createdBy: event.createdBy || 'u_dev',
      createdAtUtc: event.createdAtUtc || new Date().toISOString(),
    },
  }),

  // Delete an event by id
  delete: (id) => apiRequest(`/api/scheduled-events/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }),
};

// ========================================
// Calendar API (from existing backend)
// ========================================

export const calendarApi = {
  // Get event occurrences (existing endpoint)
  getOccurrences: (calendarId, from, to) => {
    return apiRequest(`/api/calendars/${calendarId}/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  },
};

// ========================================
// Health Check
// ========================================

export const healthApi = {
  check: () => apiRequest('/api/health'),
};

// Unified API object
export const api = {
  health: () => healthApi.check(),
  getTypes: () => eventTypesApi.getAll(),
  createType: (data) => eventTypesApi.create(data),
  updateType: (id, data) => eventTypesApi.update(id, data),
  deleteType: (id) => eventTypesApi.delete(id),
  getScheduledEvents: (calendarId = CALENDAR_ID, { from, to }) => scheduledEventsApi.getForRange(from, to, calendarId),
  createScheduledEvent: (calendarId = CALENDAR_ID, data) => scheduledEventsApi.create({ ...data, calendarId }),
  updateScheduledEvent: (id, data) => scheduledEventsApi.update(id, data),
  deleteScheduledEvent: (id) => scheduledEventsApi.delete(id),
};

export { API_BASE, WORKSPACE_ID, CALENDAR_ID };

export default {
  eventTypes: eventTypesApi,
  libraryEvents: libraryEventsApi,
  scheduledEvents: scheduledEventsApi,
  calendar: calendarApi,
  health: healthApi,
  api,
};

