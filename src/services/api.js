// API Service Layer for TimeBlocks Backend

const API_BASE_URL = 'http://localhost:8080/api';
const DEFAULT_WORKSPACE = 'ws_dev';
const DEFAULT_CALENDAR = 'cal_main';

// Helper function for fetch requests
async function apiRequest(url, options = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = new Error(`API Error: ${response.status}`);
    error.response = response;
    throw error;
  }

  // Handle no content responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ========================================
// Event Types API
// ========================================

export const eventTypesApi = {
  // Get all types for workspace
  getAll: () => apiRequest(`/workspaces/${DEFAULT_WORKSPACE}/types`),

  // Create a new type
  create: (type) => apiRequest(`/workspaces/${DEFAULT_WORKSPACE}/types`, {
    method: 'POST',
    body: JSON.stringify(type),
  }),

  // Update a type
  update: (id, type) => apiRequest(`/types/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...type, id }),
  }),

  // Delete a type
  delete: (id) => apiRequest(`/types/${id}`, {
    method: 'DELETE',
  }),
};

// ========================================
// Library Events (Templates) API
// ========================================

export const libraryEventsApi = {
  // Get all library events for workspace
  getAll: () => apiRequest(`/workspaces/${DEFAULT_WORKSPACE}/library-events`),

  // Create a new library event
  create: (event) => apiRequest(`/workspaces/${DEFAULT_WORKSPACE}/library-events`, {
    method: 'POST',
    body: JSON.stringify(event),
  }),

  // Update a library event
  update: (id, event) => apiRequest(`/library-events/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...event, id }),
  }),

  // Delete a library event
  delete: (id) => apiRequest(`/library-events/${id}`, {
    method: 'DELETE',
  }),
};

// ========================================
// Scheduled Events API
// ========================================

export const scheduledEventsApi = {
  // Get scheduled events for calendar and date range
  getForRange: (from, to, calendarId = DEFAULT_CALENDAR) => {
    const params = new URLSearchParams({ from, to });
    return apiRequest(`/calendars/${calendarId}/scheduled-events?${params}`);
  },

  // Create a new scheduled event
  create: (event, calendarId = DEFAULT_CALENDAR) => apiRequest(`/calendars/${calendarId}/scheduled-events`, {
    method: 'POST',
    body: JSON.stringify(event),
  }),

  // Update a scheduled event
  update: (id, event) => apiRequest(`/scheduled-events/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...event, id }),
  }),

  // Delete a scheduled event
  delete: (id) => apiRequest(`/scheduled-events/${id}`, {
    method: 'DELETE',
  }),
};

// ========================================
// Calendar API (from existing backend)
// ========================================

export const calendarApi = {
  // Get event occurrences (existing endpoint)
  getOccurrences: (calendarId, from, to) => {
    const params = new URLSearchParams({ from, to });
    return apiRequest(`/calendars/${calendarId}/events?${params}`);
  },
};

// ========================================
// Health Check
// ========================================

export const healthApi = {
  check: () => apiRequest('/health'),
};

export default {
  eventTypes: eventTypesApi,
  libraryEvents: libraryEventsApi,
  scheduledEvents: scheduledEventsApi,
  calendar: calendarApi,
  health: healthApi,
};

