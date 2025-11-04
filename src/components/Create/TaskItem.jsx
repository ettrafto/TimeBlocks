import React, { useState, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useCommonSensors, arrayMove } from '../../utils/dnd';

// Sub-task icon
const SubTaskIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
  </svg>
);

// Calendar icon
const CalendarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
  </svg>
);

// Clock icon
const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

// Sortable subtask item component
function SortableSubtaskLi({ id, subtask, onUpdateTitle, onRemove, textColor }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const [subtaskTitle, setSubtaskTitle] = useState(subtask.title || '');
  const textColorStyle = textColor || '#111111';

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Sync subtask title when prop changes
  useEffect(() => {
    setSubtaskTitle(subtask.title || '');
  }, [subtask.title]);

  const handleSubtaskBlur = () => {
    if (subtaskTitle.trim() && subtaskTitle !== subtask.title) {
      onUpdateTitle(subtask.id, subtaskTitle.trim());
    } else {
      setSubtaskTitle(subtask.title || '');
    }
  };

  const handleSubtaskKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
    if (e.key === 'Escape') {
      setSubtaskTitle(subtask.title || '');
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 ${isDragging ? 'opacity-70' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-black/5 shrink-0 transition-colors"
        style={{ color: textColorStyle }}
        aria-label="Drag subtask"
        title="Drag to reorder subtask"
      >
        ⋮⋮
      </button>
      <input
        type="text"
        value={subtaskTitle}
        onChange={(e) => setSubtaskTitle(e.target.value)}
        onBlur={handleSubtaskBlur}
        onKeyDown={handleSubtaskKeyDown}
        className="bg-transparent outline-none text-sm flex-1 min-w-0"
        style={{ color: textColorStyle }}
        placeholder="Subtask name"
      />
      <button
        className="px-2 py-1 text-xs rounded-md hover:bg-black/5 transition-colors"
        style={{ color: textColorStyle }}
        aria-label="Remove subtask"
        onClick={() => onRemove(subtask.id)}
      >
        Delete
      </button>
    </li>
  );
}

export default function TaskItem({ 
  id,
  task, 
  project,
  onProjectChange,
  onTitleChange, 
  onSubTaskClick, 
  onToggleSubtasks,
  onAddSubtask,
  onUpdateSubtaskTitle,
  onRemoveSubtask,
  onCalendarClick, 
  onClockClick,
  onRemoveTask,
  taskBg,
  textColor 
}) {
  // Sortable wrapper for the task row
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title || '');
  const textColorStyle = textColor || '#111111';
  const isSubtasksOpen = task.isSubtasksOpen ?? false;
  const subtasks = task.subtasks ?? [];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Sync title when task prop changes
  useEffect(() => {
    setTitle(task.title || '');
  }, [task.title]);

  const handleTitleBlur = () => {
    setIsEditing(false);
    if (title.trim() && title !== task.title) {
      onTitleChange(task.id, title.trim());
    } else {
      setTitle(task.title || '');
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
    if (e.key === 'Escape') {
      setTitle(task.title || '');
      setIsEditing(false);
    }
  };

  // Subtasks sorting setup
  const sensors = useCommonSensors();
  const subtaskIds = subtasks.map((s) => `sub-${task.id}-${s.id}`);

  const onSubDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    // Parse subtask IDs: "sub-<taskId>-<subId>"
    // Extract subtask ID by finding the task ID and taking everything after it
    const parseSubtaskId = (key) => {
      const keyStr = String(key);
      // Remove "sub-" prefix and task ID prefix
      const taskIdPrefix = `sub-${task.id}-`;
      if (keyStr.startsWith(taskIdPrefix)) {
        return keyStr.substring(taskIdPrefix.length);
      }
      return null;
    };

    const activeSubId = parseSubtaskId(active.id);
    const overSubId = parseSubtaskId(over.id);
    
    if (!activeSubId || !overSubId) return;

    const oldIndex = subtasks.findIndex((s) => s.id === activeSubId);
    const newIndex = subtasks.findIndex((s) => s.id === overSubId);
    if (oldIndex < 0 || newIndex < 0) return;

    const updatedSubtasks = arrayMove(subtasks, oldIndex, newIndex);
    // Commit change back into project
    const updatedTasks = project.tasks.map((t) =>
      t.id === task.id ? { ...t, subtasks: updatedSubtasks } : t
    );
    onProjectChange({ ...project, tasks: updatedTasks });
  };

  return (
    <div 
      ref={setNodeRef} 
      className="rounded-xl shrink-0"
      style={{ ...style, background: taskBg, color: textColorStyle }}
      data-sortable-task
    >
      {/* Top row: task content */}
      <div className={`px-4 py-3 group flex items-center justify-between gap-2 rounded-xl ${isDragging ? 'opacity-70 ring-2 ring-indigo-500/40' : ''}`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Drag handle (only this area starts task drag) */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-black/5 shrink-0 transition-colors"
            style={{ color: textColorStyle }}
            aria-label="Drag task"
            title="Drag to reorder task"
          >
            ⠿
          </button>

          {/* Editable Task Name */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:opacity-70 focus:outline-none min-w-0"
            style={{ color: textColorStyle }}
            placeholder="Task name"
          />
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
          <button
            onClick={onToggleSubtasks}
            className={`p-1.5 rounded-md hover:bg-black/5 transition-colors duration-200 ${isSubtasksOpen ? 'opacity-100' : ''}`}
            style={{ color: textColorStyle }}
            aria-expanded={isSubtasksOpen}
            aria-label="Toggle subtasks"
            title="Subtasks"
          >
            <SubTaskIcon />
          </button>
          <button
            onClick={onCalendarClick}
            className="p-1.5 rounded-md hover:bg-black/5 transition-colors duration-200"
            style={{ color: textColorStyle }}
            title="Link to date"
            aria-label="Link to date"
          >
            <CalendarIcon />
          </button>
          <button
            onClick={onClockClick}
            className="p-1.5 rounded-md hover:bg-black/5 transition-colors duration-200"
            style={{ color: textColorStyle }}
            title="Assign time/duration"
            aria-label="Assign time/duration"
          >
            <ClockIcon />
          </button>
          {onRemoveTask && (
            <button
              onClick={onRemoveTask}
              className="px-2 py-1 text-xs rounded-md hover:bg-black/5 transition-colors"
              style={{ color: textColorStyle }}
              aria-label="Remove task"
              title="Delete task"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Subtasks UL (sortable) */}
      {isSubtasksOpen && (
        <div className="px-4 pb-3">
          <DndContext sensors={sensors} onDragEnd={onSubDragEnd} modifiers={[restrictToVerticalAxis]}>
            <SortableContext items={subtaskIds} strategy={verticalListSortingStrategy}>
              <ul className="pl-5 list-disc space-y-1">
                {subtasks.map((subtask) => (
                  <SortableSubtaskLi
                    key={subtask.id}
                    id={`sub-${task.id}-${subtask.id}`}
                    subtask={subtask}
                    onUpdateTitle={(subtaskId, newTitle) => onUpdateSubtaskTitle(subtaskId, newTitle)}
                    onRemove={(subtaskId) => onRemoveSubtask(subtaskId)}
                    textColor={textColorStyle}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>

          <div className="pt-2">
            <button
              className="text-xs px-2 py-1 rounded-md border border-dashed transition-colors hover:bg-black/5"
              style={{ 
                borderColor: textColorStyle,
                color: textColorStyle,
                background: 'transparent'
              }}
              onClick={onAddSubtask}
            >
              + Add subtask
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

