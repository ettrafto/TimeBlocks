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

  // Collapsed type headers: typeId -> boolean
  let collapsedByType = {};

  // Ordered list of type ids for sidebar headers
  let typeOrder = [];

  // Per-type ordered list of event (task) ids
  let eventOrderByType = {};

  // Hydrate from localStorage (best-effort)
  try {
    const savedCollapsed = localStorage.getItem('ui.collapsedByType');
    const savedTypeOrder = localStorage.getItem('ui.typeOrder');
    const savedEventOrder = localStorage.getItem('ui.eventOrderByType');
    if (savedCollapsed) collapsedByType = JSON.parse(savedCollapsed);
    if (savedTypeOrder) typeOrder = JSON.parse(savedTypeOrder);
    if (savedEventOrder) eventOrderByType = JSON.parse(savedEventOrder);
  } catch {}

  // Cache state to prevent infinite loops
  let cachedState = { dragOverNamespace, activeResize, collapsedByType, typeOrder, eventOrderByType };

  const subs = new Set();
  const get = () => cachedState;
  const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
  const notify = () => {
    cachedState = { dragOverNamespace, activeResize, collapsedByType, typeOrder, eventOrderByType };
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

  const toggleCollapsed = (typeId) => {
    const key = String(typeId);
    collapsedByType = { ...collapsedByType, [key]: !collapsedByType[key] };
    try { localStorage.setItem('ui.collapsedByType', JSON.stringify(collapsedByType)); } catch {}
    notify();
  };

  const setCollapsed = (typeId, value) => {
    const key = String(typeId);
    collapsedByType = { ...collapsedByType, [key]: !!value };
    try { localStorage.setItem('ui.collapsedByType', JSON.stringify(collapsedByType)); } catch {}
    notify();
  };

  const setTypeOrder = (order) => {
    typeOrder = Array.isArray(order) ? order.map(String) : [];
    try { localStorage.setItem('ui.typeOrder', JSON.stringify(typeOrder)); } catch {}
    notify();
  };

  const initTypeOrderIfEmpty = (ids) => {
    if (!typeOrder || typeOrder.length === 0) {
      setTypeOrder((ids || []).map(String));
    }
  };

  const setEventOrderForType = (typeId, order) => {
    const key = String(typeId);
    eventOrderByType = { ...eventOrderByType, [key]: (order || []).map(String) };
    try { localStorage.setItem('ui.eventOrderByType', JSON.stringify(eventOrderByType)); } catch {}
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
    toggleCollapsed,
    setCollapsed,
    typeOrder,
    setTypeOrder,
    initTypeOrderIfEmpty,
    eventOrderByType,
    setEventOrderForType,
  };
}

export const uiStore = createUiStore();

