// src/state/typesStore.js
import { create } from 'zustand';
import { uiStore } from '../state/uiStore.js';
import { typesClient } from '../lib/api/typesClient.js';

export const useTypesStore = create((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastLoadedAt: 0,

  async loadAll({ force = false } = {}) {
    if (get().loading) return;
    if (!force && get().lastLoadedAt && (Date.now() - get().lastLoadedAt < 5000)) return; // debounce reloads
    const ac = new AbortController();
    set({ loading: true, error: null });
    try {
      const rows = await typesClient.listTypes(ac.signal);
      const mapped = Array.isArray(rows) ? rows : [];
      set({ items: mapped, loading: false, error: null, lastLoadedAt: Date.now() });
      try {
        if (uiStore && typeof uiStore.initTypeOrderIfEmpty === 'function') {
          uiStore.initTypeOrderIfEmpty(mapped.map(x => String(x.id)));
        }
      } catch {}
    } catch (e) {
      set({ items: [], loading: false, error: e?.message || String(e), lastLoadedAt: Date.now() });
    }
    return () => ac.abort();
  },

  // CRUD
  async create(dto) {
    const optimistic = { id: `temp-${Math.random().toString(36).slice(2,8)}`, name: dto.name, color: dto.color || null };
    set(s => ({ items: [optimistic, ...s.items] }));
    try {
      const created = await typesClient.createType(dto);
      set(s => ({ items: s.items.map(t => (t.id === optimistic.id ? created : t)) }));
    } catch (e) {
      set(s => ({ items: s.items.filter(t => t.id !== optimistic.id) }));
      set({ error: e?.message || String(e) });
      throw e;
    }
  },

  async update(id, dto) {
    const prev = get().byId()[String(id)];
    if (!prev) return;
    const next = { ...prev, ...dto };
    set(s => ({ items: s.items.map(t => (String(t.id) === String(id) ? next : t)) }));
    try {
      const saved = await typesClient.updateType(id, dto);
      set(s => ({ items: s.items.map(t => (String(t.id) === String(id) ? saved || next : t)) }));
    } catch (e) {
      // rollback
      set(s => ({ items: s.items.map(t => (String(t.id) === String(id) ? prev : t)) }));
      set({ error: e?.message || String(e) });
      throw e;
    }
  },

  async remove(id) {
    const prev = get().byId()[String(id)];
    if (!prev) return;
    set(s => ({ items: s.items.filter(t => String(t.id) !== String(id)) }));
    try {
      await typesClient.deleteType(id);
    } catch (e) {
      // restore
      set(s => ({ items: [prev, ...s.items] }));
      set({ error: e?.message || String(e) });
      throw e;
    }
  },

  // selectors
  itemsSelector() { return get().items; },
  byId() {
    const map = {};
    for (const t of get().items) map[String(t.id)] = t;
    return map;
  },
  orderedIds() {
    const ui = uiStore?.get?.() || {};
    const order = Array.isArray(ui.typeOrder) ? ui.typeOrder : [];
    if (!order.length) return get().items.map(t => String(t.id));
    const setIds = new Set(get().items.map(t => String(t.id)));
    const result = order.map(String).filter(id => setIds.has(id));
    for (const id of setIds) if (!result.includes(id)) result.push(id);
    return result;
  },
  counts() { // default 0s; can be enhanced to pull from tasks/events stores
    const out = {};
    for (const t of get().items) out[String(t.id)] = 0;
    return out;
  },
}));

export function useTypesOrdered() {
  const { items, orderedIds } = useTypesStore();
  const ids = orderedIds();
  const map = new Map(items.map(t => [String(t.id), t]));
  return ids.map(id => map.get(id)).filter(Boolean);
}

