// ========================================
// COMPONENT: TaskBlock (draggable task in left panel)
// ========================================

// Icons (outline, consistent with Create page)
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487L20.513 7.138M9.75 20.25H4.5v-5.25L16.862 3.487a2.25 2.25 0 013.182 3.182L7.682 18.182" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15m-10.5 0V6a2.25 2.25 0 0 1 2.25-2.25h1.5A2.25 2.25 0 0 1 15.75 6v1.5M6.75 7.5l.75 10.5a2.25 2.25 0 0 0 2.25 2.25h4.5a2.25 2.25 0 0 0 2.25-2.25l.75-10.5" />
  </svg>
);

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export default function TaskBlock({ task, onClick, onDelete, onClockClick, types = [], disabled = false, children }) {
  // ========================================
  // SAFETY CHECKS - Ensure task object is valid
  // ========================================
  if (!task) {
    console.error('❌ TaskBlock: task is null/undefined');
    return null;
  }

  // ========================================
  // SAFELY FIND TYPE NAME (guard against undefined types array)
  // ========================================
  // Type display removed per request

  return (
    <div
      className={`px-4 py-3 rounded-lg shadow-md ${disabled ? 'opacity-60 grayscale' : 'cursor-grab active:cursor-grabbing hover:opacity-90'} transition-opacity relative group`}
      style={{ background: task.bgColor || task.color || '#6b7280', color: task.textColor || '#ffffff' }}
      aria-disabled={disabled ? 'true' : 'false'}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold truncate">{task.name || task.label}</div>
        <div className="flex items-center gap-1 shrink-0">
          {typeof onClockClick === 'function' && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClockClick(); }}
              className="p-1 rounded hover:bg-white/20"
              title="Edit duration"
              aria-label="Edit duration"
            >
              <ClockIcon />
            </button>
          )}
          {task.duration ? (
            <div className="text-[11px] px-2 py-0.5 rounded bg-white/20 leading-none">
              {task.duration}m
            </div>
          ) : null}
        </div>
      </div>

      {/* Nested content (e.g., subtasks list) shown below the title */}
      {children ? (
        <div className="mt-2">
          {children}
        </div>
      ) : null}

      {/* Inline action buttons styled like Create page */}
      <div className="mt-2 flex items-center gap-2 justify-end">
        {onClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="p-1.5 rounded-md hover:bg-white/20 transition-colors"
            title="Edit"
            aria-label="Edit"
          >
            <EditIcon />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1.5 rounded-md hover:bg-white/20 transition-colors"
            title="Delete"
            aria-label="Delete"
          >
            <TrashIcon />
          </button>
        )}
      </div>
    </div>
  );
}

