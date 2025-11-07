// ========================================
// COMPONENT: TaskBlock (draggable task in left panel)
// ========================================

export default function TaskBlock({ task, onClick, onDelete, types = [] }) {
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
      className={`px-4 py-3 rounded-lg shadow-md cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity relative group`}
      style={{ background: task.bgColor || task.color || '#6b7280', color: task.textColor || '#ffffff' }}
    >
      <div className="font-semibold">{task.name || task.label}</div>
      {task.duration && (
        <div className="text-xs opacity-80 mt-1">{task.duration} minutes</div>
      )}

      {/* Inline action buttons styled like Create page */}
      <div className="mt-2 flex items-center gap-2 justify-end">
        {onClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="px-2 py-1 text-xs rounded-md hover:bg-white/20 transition-colors"
          >
            Edit
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="px-2 py-1 text-xs rounded-md hover:bg-white/20 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

