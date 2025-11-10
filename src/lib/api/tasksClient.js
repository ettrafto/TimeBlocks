// src/lib/api/tasksClient.js
import { http } from "./http";
import { log } from "../logger";

function validateTask(row) {
  if (!row || (row.id == null)) return null;
  const type_id = (row.type_id != null) ? row.type_id
    : (row.typeId != null ? row.typeId : null);
  if (type_id == null) return null;
  const title = typeof row.title === 'string' ? row.title
    : (typeof row.name === 'string' ? row.name : '');
  const duration = Number.isFinite(Number(row.duration)) ? Number(row.duration) : undefined;
  const attached_date = typeof row.attached_date === 'string'
    ? row.attached_date
    : (typeof row.attachedDate === 'string' ? row.attachedDate : null);
  return {
    id: row.id,
    type_id,
    title,
    description: typeof row.description === 'string' ? row.description : null,
    status: typeof row.status === 'string' ? row.status : null,
    duration,
    attached_date,
  };
}

function validateSubtask(row) {
  if (!row || (row.id == null)) return null;
  const task_id = (row.task_id != null) ? row.task_id
    : (row.taskId != null ? row.taskId : null);
  if (task_id == null) return null;
  const title = typeof row.title === 'string' ? row.title : '';
  const doneBool = row.done === true || row.done === 1 || row.done === '1';
  const order_index = Number.isFinite(row.order_index)
    ? row.order_index
    : (Number.isFinite(row.orderIndex) ? row.orderIndex : 0);
  return {
    id: row.id,
    task_id,
    title,
    done: doneBool,
    order_index,
  };
}

export const tasksClient = {
  async listTasks(params = {}, signal) {
    const q = [];
    if (params.typeId != null) q.push(`typeId=${encodeURIComponent(params.typeId)}`);
    const path = `/api/tasks${q.length ? `?${q.join('&')}` : ''}`;
    const res = await http(path, { method: 'GET', signal });
    if (!Array.isArray(res)) return [];
    const items = res.map(validateTask).filter(Boolean);
    if (items.length !== res.length) {
      log.warn(['API','tasks','list'], 'validation mismatch', { received: res.length, valid: items.length });
    }
    return items;
  },
  async listSubtasks(taskId, signal) {
    const res = await http(`/api/subtasks?taskId=${encodeURIComponent(taskId)}`, { method: 'GET', signal });
    if (!Array.isArray(res)) return [];
    const items = res.map(validateSubtask).filter(Boolean);
    if (items.length !== res.length) {
      log.warn(['API','subtasks','list'], 'validation mismatch', { received: res.length, valid: items.length });
    }
    return items;
  },
  async createTask(dto, signal) {
    const row = await http('/api/tasks', { method: 'POST', body: dto, signal });
    return validateTask(row);
  },
  async updateTask(id, dto, signal) {
    const row = await http(`/api/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: dto, signal });
    return validateTask(row);
  },
  async deleteTask(id, signal) {
    await http(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE', signal });
    return { ok: true };
  },
  async createSubtask(dto, signal) {
    const body = {
      task_id: dto.task_id, // Subtask @JsonAlias supports task_id
      title: dto.title?.trim?.() || '',
      done: 0,
      orderIndex: 0,        // entity expects orderIndex on create
    };
    const row = await http('/api/subtasks', { method: 'POST', body, signal });
    return validateSubtask(row);
  },
  async updateSubtask(id, dto, signal) {
    const row = await http(`/api/subtasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: dto, signal });
    return validateSubtask(row);
  },
  async deleteSubtask(id, signal) {
    await http(`/api/subtasks/${encodeURIComponent(id)}`, { method: 'DELETE', signal });
    return { ok: true };
  },
};

export default tasksClient;


