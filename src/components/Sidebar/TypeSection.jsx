import React, { useMemo, useSyncExternalStore } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TypeHeader from '../Calendar/TypeHeader.jsx';
import { uiStore } from '../../state/uiStore.js';
import { useCreatePageStore } from '../../store/createPageStore.js';
import SortableEventRow from './SortableEventRow.jsx';
import { sortByOrder } from '../../utils/sort.js';

function useUi() {
  return useSyncExternalStore(uiStore.subscribe, uiStore.get, uiStore.get);
}

export default function TypeSection({ typeEntity }) {
  // Make entire section a droppable target for unscheduling from calendar
  const droppableId = `type-drop:${typeEntity.id}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { kind: 'type-target', typeId: String(typeEntity.id) },
  });
  const ui = useUi();
  const collapsed = !!ui.collapsedByType?.[String(typeEntity.id)];
  const toggle = () => uiStore.toggleCollapsed(String(typeEntity.id));
  const order = ui.eventOrderByType?.[String(typeEntity.id)] || [];

  const { tasksByType, addTask } = useCreatePageStore();
  const raw = tasksByType?.[typeEntity.id] || [];
  const events = useMemo(() => sortByOrder(raw, order), [raw, order]);

  return (
    <section ref={setNodeRef} className={`rounded-lg border bg-white shadow-sm ${isOver ? 'ring-2 ring-blue-400/60' : ''}`}>
      <div className="px-2 py-2">
        <TypeHeader
          typeEntity={typeEntity}
          count={raw.length}
          collapsed={collapsed}
          onToggle={toggle}
        />
      </div>
      {!collapsed && (
        <div className="px-3 pb-3">
          <SortableContext items={events.map(e => String(e.id))} strategy={verticalListSortingStrategy}>
            {events.length === 0 && (
              <p className="text-sm text-gray-500 px-1">No events yet</p>
            )}
            <ul className="space-y-1">
              {events.map(e => (
                <SortableEventRow key={e.id} event={e} typeId={String(typeEntity.id)} />
              ))}
            </ul>
          </SortableContext>
          <div className="mt-2">
            <button
              className="text-sm text-blue-600 hover:underline"
              onClick={() => addTask({ type_id: parseInt(typeEntity.id, 10), title: 'New event' })}
            >
              + Add event
            </button>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="px-3 pb-2">
          <button
            className="text-sm text-blue-600 hover:underline"
            onClick={() => addTask({ type_id: parseInt(typeEntity.id, 10), title: 'New event' })}
          >
            + Add event
          </button>
        </div>
      )}
    </section>
  );
}


