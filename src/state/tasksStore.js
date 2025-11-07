// src/state/tasksStore.js
import { create } from 'zustand';
import { tasksClient } from '../lib/api/tasksClient.js';
import { log } from '../lib/logger.js';

export const useTasksStore = create((set, get) => ({
  tasksById: {},
  tasksByTypeId: {},
  subtasksByTaskId: {},
  loading: false,
  error: null,
  lastLoadedAt: 0,

  async loadAll({ force = false } = {}) {
    if (get().loading) return;
    if (!force && get().lastLoadedAt && (Date.now() - get().lastLoadedAt < 5000)) return;
    set({ loading: true, error: null });
    try {
      const tasks = await tasksClient.listTasks();
      const tasksById = {};
      const tasksByTypeId = {};
      for (const t of tasks) {
        tasksById[t.id] = t;
        const tid = t.type_id;
        if (!tasksByTypeId[tid]) tasksByTypeId[tid] = [];
        tasksByTypeId[tid].push(t.id);
      }

      // Load subtasks for each task
      const subtasksByTaskId = {};
      await Promise.all(tasks.map(async (t) => {
        try {
          const subs = await tasksClient.listSubtasks(t.id);
          subtasksByTaskId[t.id] = subs.map(s => s.id);
          // store subtask entities inline in a shadow map
          set((s) => ({
            subtasksEntities: { ...(s.subtasksEntities || {}), ...Object.fromEntries(subs.map(st => [st.id, st])) }
          }));
        } catch {}
      }));

      set({ tasksById, tasksByTypeId, subtasksByTaskId, loading: false, error: null, lastLoadedAt: Date.now() });
    } catch (e) {
      set({ tasksById: {}, tasksByTypeId: {}, subtasksByTaskId: {}, loading: false, error: e?.message || String(e), lastLoadedAt: Date.now() });
    }
  },

  // Selectors
  tasks() { return Object.values(get().tasksById); },
  tasksForType(typeId) {
    const ids = get().tasksByTypeId[typeId] || [];
    return ids.map(id => get().tasksById[id]).filter(Boolean);
  },
  byTypeId(typeId) { return get().tasksForType(typeId); },
  subtasksForTask(taskId) {
    const ids = get().subtasksByTaskId[taskId] || [];
    const map = get().subtasksEntities || {};
    return ids.map(id => map[id]).filter(Boolean);
  },

  // Task CRUD
  async createTask(dto) {
    // optimistic insert
    const tempId = `tmp-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = { id: tempId, ...dto };
    set((s) => {
      const tasksById = { ...s.tasksById, [tempId]: optimistic };
      const tasksByTypeId = { ...s.tasksByTypeId };
      const tid = optimistic.type_id;
      tasksByTypeId[tid] = [tempId, ...(tasksByTypeId[tid] || [])];
      return { tasksById, tasksByTypeId };
    });
    try {
      const created = await tasksClient.createTask(dto);
      if (!created || created.id == null) {
        throw new Error('Create task returned invalid payload');
      }
      set((s) => {
        const { [tempId]: _omit, ...rest } = s.tasksById;
        const tasksById = { ...rest, [created.id]: created };
        const tbt = { ...s.tasksByTypeId };
        // replace temp id in list
        tbt[created.type_id] = (tbt[created.type_id] || []).map(x => x === tempId ? created.id : x);
        return { tasksById, tasksByTypeId: tbt };
      });
      return created;
    } catch (e) {
      // rollback
      set((s) => {
        const { [tempId]: _omit, ...rest } = s.tasksById;
        const tbt = { ...s.tasksByTypeId };
        const tid = dto.type_id;
        tbt[tid] = (tbt[tid] || []).filter(x => x !== tempId);
        return { tasksById: rest, tasksByTypeId: tbt };
      });
      throw e;
    }
  },
  async updateTask(id, dto) {
    const prev = get().tasksById[id];
    if (!prev) return null;
    const optimistic = { ...prev, ...dto };
    set((s) => ({ tasksById: { ...s.tasksById, [id]: optimistic } }));
    try {
      const saved = await tasksClient.updateTask(id, dto);
      set((s) => ({ tasksById: { ...s.tasksById, [id]: saved || optimistic } }));
      if (saved && saved.type_id !== prev.type_id) {
        set((s) => {
          const tbt = { ...s.tasksByTypeId };
          tbt[prev.type_id] = (tbt[prev.type_id] || []).filter(x => x !== id);
          tbt[saved.type_id] = [id, ...(tbt[saved.type_id] || [])];
          return { tasksByTypeId: tbt };
        });
      }
      return saved;
    } catch (e) {
      set((s) => ({ tasksById: { ...s.tasksById, [id]: prev } }));
      throw e;
    }
  },
  async removeTask(id) {
    const prev = get().tasksById[id];
    if (!prev) return;
    set((s) => {
      const { [id]: _omit, ...rest } = s.tasksById;
      const tbt = { ...s.tasksByTypeId };
      tbt[prev.type_id] = (tbt[prev.type_id] || []).filter(x => x !== id);
      return { tasksById: rest, tasksByTypeId: tbt };
    });
    try {
      await tasksClient.deleteTask(id);
    } catch (e) {
      // restore
      set((s) => {
        const tasksById = { ...s.tasksById, [prev.id]: prev };
        const tbt = { ...s.tasksByTypeId };
        tbt[prev.type_id] = [prev.id, ...(tbt[prev.type_id] || [])];
        return { tasksById, tasksByTypeId: tbt };
      });
      throw e;
    }
  },

  // Subtask CRUD
  async addSubtask(task_id, title) {
    log.info(['store','subtasks','create'], 'start', { task_id, title });
    try {
      const st = await tasksClient.createSubtask({ task_id, title });
      if (!st || st.id == null) {
        throw new Error('Create subtask returned invalid payload');
      }
      set((s) => {
        const ids = [st.id, ...((s.subtasksByTaskId[task_id] || []))];
        return {
          subtasksByTaskId: { ...s.subtasksByTaskId, [task_id]: ids },
          subtasksEntities: { ...(s.subtasksEntities || {}), [st.id]: st },
        };
      });
      log.info(['store','subtasks','create'], 'success', { id: st.id });
      return st;
    } catch (e) {
      log.error(['store','subtasks','create'], 'failed', e);
      throw e;
    }
  },
  async updateSubtask(id, dto) {
    log.info(['store','subtasks','update'], 'start', { id, dto });
    try {
      const saved = await tasksClient.updateSubtask(id, dto);
      set((s) => ({
        subtasksEntities: { ...(s.subtasksEntities || {}), [id]: saved },
      }));
      log.info(['store','subtasks','update'], 'success', { id });
      return saved;
    } catch (e) {
      log.error(['store','subtasks','update'], 'failed', e);
      throw e;
    }
  },
  async removeSubtask(id) {
    // find parent task
    const s = get();
    const map = s.subtasksEntities || {};
    const st = map[id];
    log.info(['store','subtasks','delete'], 'start', { id });
    try {
      await tasksClient.deleteSubtask(id);
      if (st) {
        set((ss) => ({
          subtasksEntities: { ...(ss.subtasksEntities || {}), [id]: undefined },
          subtasksByTaskId: {
            ...ss.subtasksByTaskId,
            [st.task_id]: (ss.subtasksByTaskId[st.task_id] || []).filter(x => x !== id),
          },
        }));
      }
      log.info(['store','subtasks','delete'], 'success', { id });
    } catch (e) {
      log.error(['store','subtasks','delete'], 'failed', e);
      throw e;
    }
  },
}));


