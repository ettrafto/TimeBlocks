import React from 'react';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import ProjectHeader from './ProjectHeader';
import TaskItem from './TaskItem';
import { tailwindToHex, hexToHsl, hslToString, withSaturation, withLightness, readableTextOn } from './colorUtils';
import { useCommonSensors, arrayMove } from '../../utils/dnd';

// Plus icon for Add Task button
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export default function ProjectColumn({ project, onTitleChange, onColorChange, onAddTask, onTaskTitleChange, onSubTaskClick, onToggleSubtasks, onAddSubtask, onUpdateSubtaskTitle, onRemoveSubtask, onCalendarClick, onClockClick, onRemoveTask, onProjectChange }) {
  // Convert Tailwind color to HSL
  const hexColor = tailwindToHex(project.color);
  const baseHsl = hexToHsl(hexColor);

  // Header: saturated, mid lightness (around 45% lightness, min 60% saturation)
  const headerHsl = withSaturation(withLightness(baseHsl, 0.45), Math.max(0.6, baseHsl.s));
  const headerBg = hslToString(headerHsl);
  const headerText = readableTextOn(headerHsl);

  // Task: lower saturation (35% of original), lighter (92% lightness)
  const taskHsl = withLightness(withSaturation(baseHsl, baseHsl.s * 0.35), 0.92);
  const taskBg = hslToString(taskHsl);
  const taskText = readableTextOn(taskHsl);

  const sensors = useCommonSensors();

  const onTaskDragEnd = (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const oldIndex = project.tasks.findIndex((t) => `task-${t.id}` === active.id);
    const newIndex = project.tasks.findIndex((t) => `task-${t.id}` === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const newTasks = arrayMove(project.tasks, oldIndex, newIndex);
    onProjectChange({ ...project, tasks: newTasks });
  };

  return (
    <div className="w-full flex flex-col gap-3 h-full">
      {/* Header block - no border, color-blocked */}
      <div
        className="rounded-2xl px-5 py-4 shrink-0"
        style={{ background: headerBg, color: headerText }}
      >
        <ProjectHeader
          project={project}
          onTitleChange={onTitleChange}
          onColorChange={onColorChange}
          textColor={headerText}
        />
      </div>

      {/* Tasks stack - DnD container for vertical reordering */}
      <DndContext sensors={sensors} onDragEnd={onTaskDragEnd} modifiers={[restrictToVerticalAxis]}>
        <SortableContext
          items={project.tasks.map((t) => `task-${t.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0">
            {project.tasks && project.tasks.length > 0 && (
              <>
                {project.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    id={`task-${task.id}`}
                    task={task}
                    project={project}
                    onProjectChange={onProjectChange}
                    onTitleChange={(taskId, newTitle) => onTaskTitleChange(project.id, taskId, newTitle)}
                    onSubTaskClick={() => onSubTaskClick(project.id, task.id)}
                    onToggleSubtasks={() => onToggleSubtasks(project.id, task.id)}
                    onAddSubtask={() => onAddSubtask(project.id, task.id)}
                    onUpdateSubtaskTitle={(subtaskId, newTitle) => onUpdateSubtaskTitle(project.id, task.id, subtaskId, newTitle)}
                    onRemoveSubtask={(subtaskId) => onRemoveSubtask(project.id, task.id, subtaskId)}
                    onCalendarClick={() => onCalendarClick(project.id, task.id)}
                    onClockClick={() => onClockClick(project.id, task.id)}
                    onRemoveTask={() => onRemoveTask(project.id, task.id)}
                    taskBg={taskBg}
                    textColor={taskText}
                  />
                ))}
              </>
            )}

            {/* Add Task Button - Always at bottom */}
            <button
              onClick={() => onAddTask(project.id)}
              className="w-full py-2 px-3 text-sm font-medium rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center gap-2 shrink-0"
              style={{
                borderColor: taskText,
                color: taskText,
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = taskBg;
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.opacity = '1';
              }}
            >
              <PlusIcon />
              <span>Add Task</span>
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

