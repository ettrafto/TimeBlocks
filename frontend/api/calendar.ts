// frontend/api/calendar.ts
import { http } from "./http";
import type { EventEntity, EventOccurrence } from "../types/entities";

// Expand occurrences for a calendar between [from, to)
export const getCalendarWindow = (calendarId: string, fromISO: string, toISO: string) =>
  http<EventOccurrence[]>(`/api/calendars/${encodeURIComponent(calendarId)}/events?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`);

// Base event CRUD (used by event editor / drag-resize save, etc.)
export const createEvent = (p: {
  calendar_id: string;
  title: string;
  start: string; // ISO instant
  end: string;   // ISO instant
  rrule?: string | null;
  type_id?: number | null;
  color?: string | null;
}) => http<EventEntity>("/api/events", { method: "POST", body: p });

export const updateEvent = (id: string, p: Partial<EventEntity>) =>
  http<EventEntity>(`/api/events/${encodeURIComponent(id)}`, { method: "PATCH", body: p });

export const deleteEvent = (id: string) =>
  http<{ ok: true }>(`/api/events/${encodeURIComponent(id)}`, { method: "DELETE" });


