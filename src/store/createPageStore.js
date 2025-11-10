// src/store/createPageStore.js
import { create } from "zustand";
import { api } from "../api/createPageApi.js";
import { tasksClient } from "../lib/api/tasksClient.js";

function normalizeTask(row) {
  if (!row) return row;
  const type_id = row.type_id != null ? row.type_id : (row.typeId != null ? row.typeId : null);
  // Preserve attached date under a consistent snake_case key
  const attached_date = typeof row.attached_date === 'string'
    ? row.attached_date
    : (typeof row.attachedDate === 'string' ? row.attachedDate : null);
  const scheduled = typeof row.scheduled === 'boolean'
    ? row.scheduled
    : (row.scheduled === 1 || row.scheduled === '1' || row.scheduled === 'true');
  const duration = Number.isFinite(Number(row.duration)) ? Number(row.duration) : 30;
  return { ...row, type_id, attached_date, scheduled, duration };
}

const useCreatePageStore = create((set, get) => ({
  types: [],
  tasksByType: {},
  subtasksByTask: {},
  _loadingSubtasks: {},
  loading: false,

  init: async () => {
    const s0 = get();
    if (s0.loading) return;
    // Skip re-init if we already have types loaded
    if ((s0.types || []).length > 0) return;
    set({ loading: true });
    try {
      const types = await api.listTypes();
      const tasksByType = {};
      for (const t of types) {
        const rows = await api.listTasksByType(t.id);
        tasksByType[t.id] = (rows || []).map(normalizeTask);
      }
      set({ types, tasksByType, loading: false });
    } catch (error) {
      console.error("Failed to initialize create page store:", error);
      set({ loading: false });
    }
  },

  // Type CRUD
  addType: async (p) => {
    try {
      const created = await api.createType(p);
      set((s) => ({ 
        types: [created, ...s.types], 
        tasksByType: { ...s.tasksByType, [created.id]: [] }
      }));
    } catch (error) {
      console.error("Failed to add type:", error);
      throw error;
    }
  },

  updateType: async (id, p) => {
    try {
      const updated = await api.updateType(id, p);
      set((s) => ({ 
        types: s.types.map(t => t.id === id ? updated : t) 
      }));
    } catch (error) {
      console.error("Failed to update type:", error);
      throw error;
    }
  },

  removeType: async (id, opts = {}) => {
    try {
      if (!opts.skipApi) {
        await api.deleteType(id);
      }
      set((s) => {
        const { [id]: _, ...rest } = s.tasksByType;
        return { 
          types: s.types.filter(t => t.id !== id), 
          tasksByType: rest 
        };
      });
    } catch (error) {
      console.error("Failed to remove type:", error);
      throw error;
    }
  },

  // Task CRUD
  addTask: async (p) => {
    try {
      // Use shared tasks client like API-testing page (handles validation/shape)
      const task = await tasksClient.createTask({ type_id: p.type_id, title: p.title, description: p.description, status: p.status, duration: p.duration });
      const t = normalizeTask(task);
      set((s) => ({ 
        tasksByType: { 
          ...s.tasksByType, 
          [t.type_id]: [t, ...(s.tasksByType[t.type_id] || [])]
        }
      }));
    } catch (error) {
      console.error("Failed to add task:", error);
      throw error;
    }
  },

  updateTask: async (id, p) => {
    try {
      const updatedFromApi = await tasksClient.updateTask(id, p);
      // Some backends may omit duration or certain fields in PATCH responses; preserve requested values
      const updated = normalizeTask({
        ...updatedFromApi,
        ...(p.duration != null ? { duration: Number(p.duration) } : {}),
        ...(p.title != null ? { title: p.title } : {}),
        ...(p.attached_date != null ? { attached_date: p.attached_date } : {}),
      });
      console.log('[createPageStore.updateTask] updated', { id, p, updated });
      set((s) => {
        // Find old type_id
        let oldTypeId = null;
        for (const [tid, tasks] of Object.entries(s.tasksByType)) {
          if (tasks.some(t => t.id === id)) {
            oldTypeId = parseInt(tid);
            break;
          }
        }
        
        // Remove from old bucket
        let tasksByType = { ...s.tasksByType };
        if (oldTypeId !== null) {
          tasksByType[oldTypeId] = tasksByType[oldTypeId].filter(t => t.id !== id);
        }
        
        // Add to new bucket
        const newTypeId = updated.type_id;
        tasksByType[newTypeId] = [updated, ...(tasksByType[newTypeId] || [])];
        
        return { tasksByType };
      });
    } catch (error) {
      console.error("Failed to update task:", error);
      throw error;
    }
  },

  removeTask: async (id) => {
    try {
      await api.deleteTask(id);
      set((s) => {
        const tasksByType = { ...s.tasksByType };
        for (const k of Object.keys(tasksByType)) {
          tasksByType[k] = tasksByType[k].filter(t => t.id !== id);
        }
        return { tasksByType };
      });
    } catch (error) {
      console.error("Failed to remove task:", error);
      throw error;
    }
  },

  // Subtask CRUD
  loadSubtasks: async (taskId, { force = false } = {}) => {
    const s0 = get();
    if (!force && Array.isArray(s0.subtasksByTask[taskId]) && s0.subtasksByTask[taskId].length > 0) return;
    if (s0._loadingSubtasks[taskId]) return;
    set((s) => ({ _loadingSubtasks: { ...(s._loadingSubtasks || {}), [taskId]: true } }));
    try {
      const rows = await api.listSubtasks(taskId);
      set((s) => ({ 
        subtasksByTask: { ...s.subtasksByTask, [taskId]: rows }
      }));
    } catch (error) {
      console.error("Failed to load subtasks:", error);
    } finally {
      set((s) => {
        const next = { ...(s._loadingSubtasks || {}) };
        delete next[taskId];
        return { _loadingSubtasks: next };
      });
    }
  },

  addSubtask: async (task_id, title) => {
    try {
      const st = await api.createSubtask({ task_id, title });
      set((s) => ({ 
        subtasksByTask: { 
          ...s.subtasksByTask, 
          [task_id]: [st, ...(s.subtasksByTask[task_id] || [])]
        }
      }));
    } catch (error) {
      console.error("Failed to add subtask:", error);
      throw error;
    }
  },

  updateSubtask: async (id, p) => {
    try {
      // Convert boolean done to integer if needed
      const updatePayload = { ...p };
      if (typeof updatePayload.done === 'boolean') {
        updatePayload.done = updatePayload.done ? 1 : 0;
      }
      const st = await api.updateSubtask(id, updatePayload);
      const taskId = st.task_id;
      set((s) => ({
        subtasksByTask: {
          ...s.subtasksByTask,
          [taskId]: (s.subtasksByTask[taskId] || []).map(x => x.id === id ? st : x)
        }
      }));
    } catch (error) {
      console.error("Failed to update subtask:", error);
      throw error;
    }
  },

  removeSubtask: async (id) => {
    try {
      // Find taskId from current state
      const s = get();
      let taskId = null;
      for (const [tid, arr] of Object.entries(s.subtasksByTask)) {
        if ((arr || []).some(x => x.id === id)) {
          taskId = parseInt(tid);
          break;
        }
      }
      
      await api.deleteSubtask(id);
      if (taskId != null) {
        set((ss) => ({
          subtasksByTask: {
            ...ss.subtasksByTask,
            [taskId]: (ss.subtasksByTask[taskId] || []).filter(x => x.id !== id)
          }
        }));
      }
    } catch (error) {
      console.error("Failed to remove subtask:", error);
      throw error;
    }
  },
}));

export { useCreatePageStore };

