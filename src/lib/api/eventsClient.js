// src/lib/api/eventsClient.js
import { http } from "./http";
import { log } from "../logger";

function validateOccurrence(row) {
  if (!row || typeof row.start !== 'string' || typeof row.end !== 'string') return null;
  return {
    id: row.id || row.event_id || null,
    event_id: row.event_id || row.id || null,
    title: typeof row.title === 'string' ? row.title : '',
    start: row.start,
    end: row.end,
    type_id: row.type_id ?? null,
    color: row.color ?? null,
  };
}

const CALENDAR_ID = import.meta?.env?.VITE_CALENDAR_ID || 'cal_main';

export const eventsClient = {
  async listEvents(params = {}, signal) {
    // Default to a broad one-year window for testing if no range provided
    let fromISO, toISO;
    if (params.range && params.range.from && params.range.to) {
      fromISO = params.range.from;
      toISO = params.range.to;
    } else {
      const now = new Date();
      const from = new Date(now);
      from.setFullYear(now.getFullYear() - 1);
      const to = new Date(now);
      to.setFullYear(now.getFullYear() + 1);
      fromISO = from.toISOString();
      toISO = to.toISOString();
    }
    const path = `/api/calendars/${encodeURIComponent(CALENDAR_ID)}/events?from=${encodeURIComponent(fromISO)}&to=${encodeURIComponent(toISO)}`;
    const res = await http(path, { method: 'GET', signal });
    if (!Array.isArray(res)) return [];
    const items = res.map(validateOccurrence).filter(Boolean);
    if (items.length !== res.length) {
      log.warn(['API','events','list'], 'validation mismatch', { received: res.length, valid: items.length });
    }
    return items;
  },
  async createEvent(dto, signal) {
    const row = await http('/api/events', { method: 'POST', body: dto, signal });
    return row; // shape varies; consumers may refetch list
  },
  async updateEvent(id, dto, signal) {
    const row = await http(`/api/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: dto, signal });
    return row;
  },
  async deleteEvent(id, signal) {
    await http(`/api/events/${encodeURIComponent(id)}`, { method: 'DELETE', signal });
    return { ok: true };
  },
};

export default eventsClient;


