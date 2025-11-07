import React, { useEffect } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { uiStore } from '../../state/uiStore.js';
import { useTypesStore, useTypesOrdered } from '../../state/typesStore.js';
import SortableTypeSection from './SortableTypeSection.jsx';
import { useCreatePageStore } from '../../store/createPageStore.js';

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export default function SidebarEvents() {
  const { items, loading, error, loadAll, create: createType } = useTypesStore();
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
        <>
          <SortableContext items={idsForDnd} strategy={verticalListSortingStrategy}>
            <aside className="space-y-3">
              {ordered.map(t => (
                <SortableTypeSection key={t.id} typeEntity={t} />
              ))}
            </aside>
          </SortableContext>
          <div className="mt-3">
            <button
              onClick={async () => {
                const name = prompt('Type name', '')?.trim();
                if (!name) return;
                // optional color prompt with default
                const color = prompt('Hex color (optional, e.g. #2563eb)', '#2563eb') || '#2563eb';
                await createType({ name, color });
              }}
              className="w-full py-2 px-3 text-sm font-medium rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center gap-2 shrink-0 border-gray-300 text-gray-600 bg-transparent hover:bg-gray-50"
              title="Add Type"
            >
              <PlusIcon />
              <span>Add Type</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}


