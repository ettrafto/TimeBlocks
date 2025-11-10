import { useDraggable } from '@dnd-kit/core';
import TaskBlock from './TaskBlock';

// ========================================
// COMPONENT: DraggableTaskBlock (wrapper with dnd-kit drag logic)
// ========================================

export default function DraggableTaskBlock({ task, onEdit, onDelete, onClockClick, types, disabled = false, children }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${task.id}`,
    data: {
      type: 'template',
      task,
    },
    disabled: !!disabled,
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
      {...(!disabled ? listeners : {})}
      {...(!disabled ? attributes : {})}
      style={{ opacity: disabled ? 0.5 : (isDragging ? 0.5 : 1) }}
      aria-disabled={disabled ? 'true' : 'false'}
    >
      <TaskBlock 
        task={task} 
        onClick={handleEdit} 
        onDelete={handleDelete}
        onClockClick={onClockClick}
        disabled={disabled}
        types={types}
      >
        {children}
      </TaskBlock>
    </div>
  );
}

