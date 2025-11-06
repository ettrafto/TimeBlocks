// src/state/typesStore.js
import { create } from 'zustand';
import { eventTypesApi } from '../services/api.js';
import { uiStore } from '../state/uiStore.js';

export const useTypesStore = create((set, get) => ({
  types: [],
  loaded: false,
  loading: false,
  error: null,

  async loadTypes() {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const rows = await eventTypesApi.getAll();
      const mapped = Array.isArray(rows)
        ? rows.map(t => ({ id: String(t.id), name: t.name, color: t.color || '#999' }))
        : [];
      set({ types: mapped, loaded: true, loading: false, error: null });
      try {
        if (uiStore && typeof uiStore.initTypeOrderIfEmpty === 'function') {
          uiStore.initTypeOrderIfEmpty(mapped.map(x => x.id));
        }
      } catch {}
    } catch (e) {
      set({ types: [], loaded: true, loading: false, error: e?.message || String(e) });
    }
  },
}));

export function useTypesOrdered() {
  const { types } = useTypesStore();
  const order = (ui.maybe?.type?._order) ? ui.maybe.type._order : (uiStore?.get?.().typeOrder || []);
  const idOrder = Array.isArray(order) ? order.map(String) : [];
  if (!idOrder.length) return types;
  const map = new Map(types.map(t => [String(t.id), t]));
  const arranged = idOrder.map(id => map.get(id)).filter(Boolean);
  for (const t of types) if (!idOrder.includes(String(t.id))) arranged.push(t);
  return arranged;
}

