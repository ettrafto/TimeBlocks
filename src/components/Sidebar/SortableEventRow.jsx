import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DraggableTaskBlock from '../LeftPane/DraggableTaskBlock.jsx';
import { useTypesStore } from '../../state/typesStore.js';

export default function SortableEventRow({ event, typeId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(event.id),
    data: { context: 'sidebar', kind: 'task', typeId: String(typeId), eventId: String(event.id) },
  });

  const { items } = useTypesStore();
  const types = items || [];

  const task = {
    id: String(event.id),
    name: event.title || event.name || 'Untitled',
    label: event.title || event.name || 'Untitled',
    color: event.color || 'bg-gray-500',
    duration: event.duration || 30,
    typeId: event.type_id != null ? String(event.type_id) : (event.typeId != null ? String(event.typeId) : String(typeId)),
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <li style={style} className="rounded border border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="flex-1 min-w-0">
          <DraggableTaskBlock task={task} types={types} />
        </div>
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          role="button"
          aria-label="Reorder task"
          className="shrink-0 w-2 h-6 rounded cursor-grab active:cursor-grabbing bg-gray-400"
        />
      </div>
    </li>
  );
}


