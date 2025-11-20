/**
 * Zustand store for auth debug logging
 */

import { create } from 'zustand';

const MAX_LOGS = 200;

export const useDebugAuthLogStore = create((set) => ({
  logs: [],
  addLog: (line) => {
    set((state) => {
      const newLogs = [...state.logs, { timestamp: Date.now(), line }];
      // Keep only the last MAX_LOGS entries
      if (newLogs.length > MAX_LOGS) {
        return { logs: newLogs.slice(-MAX_LOGS) };
      }
      return { logs: newLogs };
    });
  },
  clearLogs: () => set({ logs: [] }),
}));

