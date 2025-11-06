import React, { useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { uiStore } from '../../state/uiStore.js';
import { useTypesStore } from '../../state/typesStore.js';
import SortableTypeSection from './SortableTypeSection.jsx';

export default function SidebarEvents() {
  const { types, loaded, error, loadTypes } = useTypesStore();
  const typeOrder = uiStore.get().typeOrder || [];

  useEffect(() => { if (!loaded) loadTypes(); }, [loaded, loadTypes]);

  // Order types per uiStore.typeOrder
  const ordered = React.useMemo(() => {
    if (!typeOrder.length) return types;
    const map = new Map(types.map(t => [String(t.id), t]));
    const out = typeOrder.map(id => map.get(String(id))).filter(Boolean);
    for (const t of types) if (!typeOrder.includes(String(t.id))) out.push(t);
    return out;
  }, [types, typeOrder]);

  return (
    <div className="p-4">
      {!loaded ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">Loading types...</div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 text-sm">{String(error)}</div>
      ) : (
        <SortableContext items={typeOrder.length ? typeOrder : ordered.map(t => String(t.id))} strategy={verticalListSortingStrategy}>
          <aside className="space-y-3">
            {ordered.map(t => (
              <SortableTypeSection key={t.id} typeEntity={t} />
            ))}
          </aside>
        </SortableContext>
      )}
    </div>
  );
}


