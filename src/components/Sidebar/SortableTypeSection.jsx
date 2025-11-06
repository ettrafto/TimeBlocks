import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TypeSection from './TypeSection.jsx';

export default function SortableTypeSection({ typeEntity }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(typeEntity.id),
    data: { context: 'sidebar', kind: 'type', typeId: String(typeEntity.id) },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TypeSection typeEntity={typeEntity} />
    </div>
  );
}


