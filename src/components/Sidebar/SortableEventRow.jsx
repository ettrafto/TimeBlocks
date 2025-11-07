import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DraggableTaskBlock from '../LeftPane/DraggableTaskBlock.jsx';
import { useTypesStore } from '../../state/typesStore.js';
import { useCreatePageStore } from '../../store/createPageStore.js';
import { hexToHsl, withSaturation, withLightness, hslToString, readableTextOn, tailwindToHex } from '../Create/colorUtils.js';

export default function SortableEventRow({ event, typeId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(event.id),
    data: { context: 'sidebar', kind: 'task', typeId: String(typeId), eventId: String(event.id) },
  });

  const { items } = useTypesStore();
  const types = items || [];
  const { updateTask, removeTask } = useCreatePageStore();

  // derive color from type color (desaturated)
  const typeHex = (() => {
    const tId = event.type_id != null ? String(event.type_id) : (event.typeId != null ? String(event.typeId) : String(typeId));
    const t = (types || []).find(tt => String(tt.id) === tId);
    const c = t?.color;
    if (!c) return '#3b82f6';
    return c.startsWith('#') ? c : tailwindToHex(c);
  })();
  const base = hexToHsl(typeHex);
  const bgHsl = withLightness(withSaturation(base, base.s * 0.35), 0.92);
  const bg = hslToString(bgHsl);
  const text = readableTextOn(bgHsl);

  const task = {
    id: String(event.id),
    name: event.title || event.name || 'Untitled',
    label: event.title || event.name || 'Untitled',
    bgColor: bg,
    textColor: text,
    duration: event.duration || 30,
    typeId: event.type_id != null ? String(event.type_id) : (event.typeId != null ? String(event.typeId) : String(typeId)),
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const onEdit = () => {
    const newTitle = prompt('Edit title', task.name) ?? task.name;
    if (newTitle && newTitle.trim() && Number.isFinite(Number(event.id))) {
      updateTask(Number(event.id), { title: newTitle.trim() });
    }
  };

  const onDelete = () => {
    if (confirm('Delete this item?') && Number.isFinite(Number(event.id))) {
      removeTask(Number(event.id));
    }
  };

  return (
    <li style={style} className="rounded border border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-2 py-1.5">
        {/* Drag handle moved to left */}
        <div
          ref={setNodeRef}
          {...attributes}
          {...listeners}
          role="button"
          aria-label="Reorder task"
          className="shrink-0 w-2 h-6 rounded cursor-grab active:cursor-grabbing bg-gray-400"
        />
        <div className="flex-1 min-w-0">
          <DraggableTaskBlock task={task} types={types} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>
    </li>
  );
}


