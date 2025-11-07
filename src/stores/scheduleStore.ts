import { create } from 'zustand';
import { formatISO, startOfDay } from 'date-fns';
import { scheduleClient, type Occurrence } from '../lib/api/scheduleClient';

type Range = { timeMin: number; timeMax: number; laneId?: string };

type State = {
  byOccId: Record<string, Occurrence>;
  byDayKey: Record<string, string[]>;
  loading: boolean;
  error?: string;
  lastRange?: Range;
};

type Actions = {
  loadRange: (args: { timeMin: number; timeMax: number; laneId?: string; force?: boolean }) => Promise<void>;
  createOneTime: (args: { taskId: string; start: number; end: number; laneId?: string; tz?: string; meta?: string }) => Promise<void>;
  createRecurring: (args: { taskId: string; start: number; end: number; tz: string; recurrenceRule: string; laneId?: string; meta?: string }) => Promise<void>;
  updateSchedule: (id: string, patch: Partial<{ taskId: string; start: number; end: number; timezone: string; laneId?: string; allDay?: number; status?: string; recurrenceRule?: string; meta?: string }>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  occurrencesForDay: (dayKey: string) => Occurrence[];
  occurrencesForRange: (min: number, max: number, laneId?: string) => Occurrence[];
};

function dayKeyOf(ts: number, tz: string) {
  // For now, derive by local time; could add tz support by using Intl API
  const d = new Date(ts);
  const sod = startOfDay(d);
  return formatISO(sod, { representation: 'date' });
}

export const useScheduleStore = create<State & Actions>((set, get) => ({
  byOccId: {},
  byDayKey: {},
  loading: false,

  async loadRange({ timeMin, timeMax, laneId, force }) {
    const last = get().lastRange;
    if (!force && last && timeMin >= last.timeMin && timeMax <= last.timeMax && last.laneId === laneId) {
      return;
    }
    set({ loading: true, error: undefined });
    try {
      const res = await scheduleClient.listOccurrences({ timeMin: new Date(timeMin).toISOString(), timeMax: new Date(timeMax).toISOString(), laneId });
      const byOccId: Record<string, Occurrence> = { ...get().byOccId };
      const byDayKey: Record<string, string[]> = { ...get().byDayKey };
      for (const occ of res) {
        byOccId[occ.occId] = occ;
        const dk = dayKeyOf(occ.start, occ.tz);
        if (!byDayKey[dk]) byDayKey[dk] = [];
        if (!byDayKey[dk].includes(occ.occId)) byDayKey[dk].push(occ.occId);
      }
      set({ byOccId, byDayKey, loading: false, lastRange: { timeMin, timeMax, laneId } });
    } catch (e: any) {
      set({ loading: false, error: e?.message || String(e) });
    }
  },

  async createOneTime({ taskId, start, end, laneId, tz = 'UTC', meta }) {
    await scheduleClient.createSchedule({ taskId, start, end, timezone: tz, laneId: laneId ?? undefined, meta: meta ?? undefined });
    // Optimistic: reload current range
    const last = get().lastRange; if (last) await get().loadRange({ ...last, force: true });
  },

  async createRecurring({ taskId, start, end, tz, recurrenceRule, laneId, meta }) {
    await scheduleClient.createSchedule({ taskId, start, end, timezone: tz, laneId: laneId ?? undefined, recurrenceRule, meta: meta ?? undefined });
    const last = get().lastRange; if (last) await get().loadRange({ ...last, force: true });
  },

  async updateSchedule(id, patch) {
    await scheduleClient.updateSchedule(id, patch as any);
    const last = get().lastRange; if (last) await get().loadRange({ ...last, force: true });
  },

  async deleteSchedule(id) {
    await scheduleClient.deleteSchedule(id);
    const last = get().lastRange; if (last) await get().loadRange({ ...last, force: true });
  },

  occurrencesForDay(dayKey: string) {
    const ids = get().byDayKey[dayKey] || [];
    return ids.map(id => get().byOccId[id]).filter(Boolean);
  },

  occurrencesForRange(min: number, max: number, laneId?: string) {
    return Object.values(get().byOccId).filter(o => o.end >= min && o.start <= max && (!laneId || o.laneId === laneId));
  },
}));


