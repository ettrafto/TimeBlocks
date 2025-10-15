// src/state/uiStore.js

/**
 * UI Session Store
 * Tracks ephemeral UI state for drag/resize operations
 * Does not persist - resets on page refresh
 */
export function createUiStore() {
  // dragOverNamespace: string | null  e.g. 'day:2025-10-15'
  // activeResize: { eventId, dayKey, draftStart, draftDuration } | null
  let dragOverNamespace = null;
  let activeResize = null;

  // Cache state to prevent infinite loops
  let cachedState = { dragOverNamespace, activeResize };

  const subs = new Set();
  const get = () => cachedState;
  const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
  const notify = () => {
    cachedState = { dragOverNamespace, activeResize };
    subs.forEach((fn) => fn(cachedState));
  };

  const setDragOverNs = (ns) => { 
    dragOverNamespace = ns; 
    notify(); 
  };
  
  const clearDragOverNs = () => { 
    dragOverNamespace = null; 
    notify(); 
  };

  const beginResize = ({ eventId, dayKey, draftStart, draftDuration }) => {
    activeResize = { eventId, dayKey, draftStart, draftDuration };
    notify();
  };
  
  const updateResizeDraft = (patch) => {
    if (!activeResize) return;
    activeResize = { ...activeResize, ...patch };
    notify();
  };
  
  const endResize = () => { 
    activeResize = null; 
    notify(); 
  };

  return {
    get, 
    subscribe,
    setDragOverNs, 
    clearDragOverNs,
    beginResize, 
    updateResizeDraft, 
    endResize,
  };
}

export const uiStore = createUiStore();

