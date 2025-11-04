import React, { useState } from 'react';

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

export default function TaskItem({ task, onTitleChange, onSubTaskClick, onCalendarClick, onClockClick, textColor }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title || '');
  const textColorStyle = textColor || '#111111';

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

  return (
    <div className="group flex items-center justify-between gap-2">
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

      {/* Action Icons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
        <button
          onClick={onSubTaskClick}
          className="p-1.5 rounded-md hover:bg-black/5 transition-colors duration-200"
          style={{ color: textColorStyle }}
          title="Add sub-task"
          aria-label="Add sub-task"
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
      </div>
    </div>
  );
}

