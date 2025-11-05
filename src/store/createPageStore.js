// src/store/createPageStore.js
import { create } from "zustand";
import { api } from "../api/createPageApi.js";

const useCreatePageStore = create((set, get) => ({
  types: [],
  tasksByType: {},
  subtasksByTask: {},
  loading: false,

  init: async () => {
    set({ loading: true });
    try {
      const types = await api.listTypes();
      const tasksByType = {};
      for (const t of types) {
        tasksByType[t.id] = await api.listTasksByType(t.id);
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

  removeType: async (id) => {
    try {
      await api.deleteType(id);
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
      const task = await api.createTask(p);
      set((s) => ({ 
        tasksByType: { 
          ...s.tasksByType, 
          [task.type_id]: [task, ...(s.tasksByType[task.type_id] || [])]
        }
      }));
    } catch (error) {
      console.error("Failed to add task:", error);
      throw error;
    }
  },

  updateTask: async (id, p) => {
    try {
      const updated = await api.updateTask(id, p);
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
  loadSubtasks: async (taskId) => {
    try {
      const rows = await api.listSubtasks(taskId);
      set((s) => ({ 
        subtasksByTask: { ...s.subtasksByTask, [taskId]: rows }
      }));
    } catch (error) {
      console.error("Failed to load subtasks:", error);
      throw error;
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

