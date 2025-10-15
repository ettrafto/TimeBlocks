import { useDraggable } from '@dnd-kit/core';
import TaskBlock from './TaskBlock';

// ========================================
// COMPONENT: DraggableTaskBlock (wrapper with dnd-kit drag logic)
// ========================================

export default function DraggableTaskBlock({ task, onEdit, onDelete, types }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${task.id}`,
    data: {
      type: 'template',
      task,
    },
  });

  const handleEdit = () => {
    if (onEdit && !isDragging) {
      onEdit(task);
    }
  };

  const handleDelete = () => {
    if (onDelete && !isDragging) {
      onDelete(task);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <TaskBlock 
        task={task} 
        onClick={handleEdit} 
        onDelete={handleDelete}
        types={types}
      />
    </div>
  );
}

