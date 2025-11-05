// API Service Layer for TimeBlocks Backend

import { TBLog } from "../../shared/logging/logger.js";
import { newCorrelationId } from "../../shared/logging/correlation.js";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8080";
const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID ?? "ws_dev";
const CALENDAR_ID = import.meta.env.VITE_CALENDAR_ID ?? "cal_main";

const withTimeout = (promise, ms = 12000) =>
  Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`Request timeout after ${ms}ms`)), ms))
  ]);

export async function apiRequest(path, { method = "GET", body, headers = {}, correlationId } = {}) {
  const url = `${API_BASE}${path}`;
  const cid = correlationId ?? newCorrelationId("api");
  const g = TBLog.group(`API ${method} ${url}`, cid);
  
  try {
    // Add correlation ID to headers
    const requestHeaders = { 
      "Content-Type": "application/json", 
      "X-Correlation-Id": cid,
      ...headers 
    };
    
    const opts = {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    };
    
    TBLog.kv("Request", { url, method, headers: requestHeaders, body });
    
    const res = await withTimeout(fetch(url, opts));
    const status = res.status;
    
    let json = null;
    let text = null;
    try { 
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        json = await res.json();
      } else {
        text = await res.text();
      }
    } catch { /* no body */ }
    
    TBLog.kv("Response", { status, json: json ?? text });
    
    if (!res.ok) {
      TBLog.error("API request failed", { status, error: json ?? text });
      throw new Error(`API ${method} ${url} failed: ${status} ${JSON.stringify(json ?? text)}`);
    }
    
    return json ?? text;
  } catch (e) {
    TBLog.error("Network/Client error", e);
    throw e;
  } finally {
    g.end();
  }
}

// ========================================
// Event Types API
// ========================================

export const eventTypesApi = {
  // Get all types for workspace
  getAll: (workspaceId = WORKSPACE_ID) => apiRequest(`/api/workspaces/${workspaceId}/types`),

  // Create a new type
  // Accept body first for ergonomics; workspaceId optional second param
  create: (type, workspaceId = WORKSPACE_ID) => apiRequest(`/api/workspaces/${workspaceId}/types`, {
    method: 'POST',
    body: type,
  }),

  // Update a type
  update: (id, type) => apiRequest(`/api/types/${id}`, {
    method: 'PUT',
    body: type,
  }),

  // Delete a type
  delete: (id) => apiRequest(`/api/types/${id}`, {
    method: 'DELETE',
  }),
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
  // Get scheduled events for calendar and date range
  getForRange: (from, to, calendarId = CALENDAR_ID) => {
    return apiRequest(`/api/calendars/${calendarId}/scheduled-events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
  },

  // Create a new scheduled event
  create: (event, calendarId = CALENDAR_ID) => apiRequest(`/api/calendars/${calendarId}/scheduled-events`, {
    method: 'POST',
    body: event,
  }),

  // Update a scheduled event
  update: (id, event) => apiRequest(`/api/scheduled-events/${id}`, {
    method: 'PUT',
    body: event,
  }),

  // Delete a scheduled event
  delete: (id) => apiRequest(`/api/scheduled-events/${id}`, {
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
  getTypes: (workspaceId = WORKSPACE_ID) => eventTypesApi.getAll(workspaceId),
  createType: (workspaceId = WORKSPACE_ID, data) => eventTypesApi.create(workspaceId, data),
  updateType: (id, data) => eventTypesApi.update(id, data),
  deleteType: (id) => eventTypesApi.delete(id),
  getScheduledEvents: (calendarId = CALENDAR_ID, { from, to }) => scheduledEventsApi.getForRange(from, to, calendarId),
  createScheduledEvent: (calendarId = CALENDAR_ID, data) => scheduledEventsApi.create(data, calendarId),
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

