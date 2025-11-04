import React from 'react';
import ProjectHeader from './ProjectHeader';
import TaskItem from './TaskItem';
import { tailwindToHex, hexToHsl, hslToString, withSaturation, withLightness, readableTextOn } from './colorUtils';

// Plus icon for Add Task button
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

export default function ProjectColumn({ project, onTitleChange, onColorChange, onAddTask, onTaskTitleChange, onSubTaskClick, onCalendarClick, onClockClick }) {
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

      {/* Tasks stack - no parent card/border, each task is a color block */}
      <div className="flex flex-col gap-2 flex-1 overflow-y-auto min-h-0">
        {project.tasks && project.tasks.length > 0 && (
          <>
            {project.tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl px-4 py-3 shrink-0"
                style={{ background: taskBg, color: taskText }}
              >
                <TaskItem
                  task={task}
                  onTitleChange={(taskId, newTitle) => onTaskTitleChange(project.id, taskId, newTitle)}
                  onSubTaskClick={() => onSubTaskClick(project.id, task.id)}
                  onCalendarClick={() => onCalendarClick(project.id, task.id)}
                  onClockClick={() => onClockClick(project.id, task.id)}
                  textColor={taskText}
                />
              </div>
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
    </div>
  );
}

