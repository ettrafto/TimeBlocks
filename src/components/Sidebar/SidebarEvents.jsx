import React, { useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { uiStore } from '../../state/uiStore.js';
import { useTypesStore, useTypesOrdered } from '../../state/typesStore.js';
import SortableTypeSection from './SortableTypeSection.jsx';
import { useCreatePageStore } from '../../store/createPageStore.js';

export default function SidebarEvents() {
  const { items, loading, error, loadAll } = useTypesStore();
  const ordered = useTypesOrdered();
  const typeOrder = uiStore.get().typeOrder || [];
  const { init } = useCreatePageStore();

  useEffect(() => { 
    loadAll({ force: false }); 
    // Ensure tasks/subtasks are loaded for sidebar sections after hard refresh
    init?.();
  }, [loadAll, init]);

  const idsForDnd = typeOrder.length ? typeOrder.map(String) : ordered.map(t => String(t.id));

  return (
    <div className="p-4">
      {loading ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">Loading types...</div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 text-sm">{String(error)}</div>
      ) : (
        <SortableContext items={idsForDnd} strategy={verticalListSortingStrategy}>
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


