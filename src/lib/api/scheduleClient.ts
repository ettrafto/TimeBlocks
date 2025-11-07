import { apiRequest } from '../../services/api';

export type ScheduleDTO = {
  id?: string;
  taskId: string;
  start: number; // epoch ms UTC
  end: number;   // epoch ms UTC
  timezone: string; // IANA
  allDay?: number;
  laneId?: string | null;
  status?: string;
  recurrenceRule?: string | null;
  meta?: string | null;
};

export type Occurrence = {
  id: string;        // schedule id
  occId: string;     // scheduleId:occStart
  taskId: string;
  laneId?: string | null;
  tz: string;
  start: number; // epoch ms
  end: number;   // epoch ms
  allDay?: number;
  status?: string;
  isRecurring?: boolean;
  baseScheduleMeta?: string | null;
  occurrenceMeta?: string | null;
};

export const scheduleClient = {
  async listOccurrences(params: { timeMin: string; timeMax: string; laneId?: string; includeCache?: number }) {
    const qp = new URLSearchParams();
    qp.set('timeMin', params.timeMin);
    qp.set('timeMax', params.timeMax);
    if (params.laneId) qp.set('laneId', params.laneId);
    if (params.includeCache != null) qp.set('includeCache', String(params.includeCache));
    return apiRequest(`/api/schedules?${qp.toString()}`, { method: 'GET' }) as Promise<Occurrence[]>;
  },

  async createSchedule(dto: ScheduleDTO) {
    return apiRequest('/api/schedules', { method: 'POST', body: {
      id: dto.id,
      taskId: dto.taskId,
      startTsUtc: dto.start,
      endTsUtc: dto.end,
      timezone: dto.timezone,
      allDay: dto.allDay ?? 0,
      laneId: dto.laneId ?? null,
      status: dto.status ?? 'confirmed',
      recurrenceRule: dto.recurrenceRule ?? null,
      meta: dto.meta ?? null,
    } });
  },

  async updateSchedule(id: string, patch: Partial<ScheduleDTO>) {
    const body: any = {};
    if (patch.taskId != null) body.taskId = patch.taskId;
    if (patch.start != null) body.start = patch.start;
    if (patch.end != null) body.end = patch.end;
    if (patch.timezone != null) body.timezone = patch.timezone;
    if (patch.allDay != null) body.allDay = patch.allDay;
    if (patch.laneId !== undefined) body.laneId = patch.laneId;
    if (patch.status != null) body.status = patch.status;
    if (patch.recurrenceRule !== undefined) body.recurrenceRule = patch.recurrenceRule;
    if (patch.meta !== undefined) body.meta = patch.meta;
    return apiRequest(`/api/schedules/${encodeURIComponent(id)}`, { method: 'PUT', body });
  },

  async deleteSchedule(id: string) {
    return apiRequest(`/api/schedules/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  async createException(scheduleId: string, dto: { exDate: number; changeStart?: number; changeEnd?: number; changeLaneId?: string; changeStatus?: string; meta?: string }) {
    const body: any = { exDateUtc: dto.exDate };
    if (dto.changeStart != null) body.changeStartTsUtc = dto.changeStart;
    if (dto.changeEnd != null) body.changeEndTsUtc = dto.changeEnd;
    if (dto.changeLaneId != null) body.changeLaneId = dto.changeLaneId;
    if (dto.changeStatus != null) body.changeStatus = dto.changeStatus;
    if (dto.meta != null) body.meta = dto.meta;
    return apiRequest(`/api/schedules/${encodeURIComponent(scheduleId)}/exceptions`, { method: 'POST', body });
  },

  async deleteException(exceptionId: string) {
    return apiRequest(`/api/schedule-exceptions/${encodeURIComponent(exceptionId)}`, { method: 'DELETE' });
  },
};


