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
  const safeTypes = Array.isArray(types) ? types : [];
  const type = task.typeId ? safeTypes.find(t => t.id === task.typeId) : null;
  const typeName = type?.name ?? (task.typeId ? "Unknown Type" : null);
  
  // Debug: Log if type lookup fails (only in dev, don't spam)
  if (task.typeId && safeTypes.length > 0 && !type) {
    console.warn('⚠️ TaskBlock: type not found for typeId:', task.typeId, 'in event:', task.name || task.label);
  }

  return (
    <div
      className={`${task.color || 'bg-gray-500'} text-white px-4 py-3 rounded-lg shadow-md cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity relative group`}
    >
      <div className="font-semibold">{task.name || task.label}</div>
      {task.duration && (
        <div className="text-xs opacity-80 mt-1">{task.duration} minutes</div>
      )}
      {typeName && (
        <div className="text-xs opacity-70 mt-0.5">📁 {typeName}</div>
      )}
      
      {/* Edit and Delete Icons - appear on hover */}
      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {onClick && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded px-1.5 py-0.5 text-xs transition-colors"
            title="Edit event"
          >
            ✏️
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="bg-red-500 bg-opacity-70 hover:bg-opacity-90 rounded px-1.5 py-0.5 text-xs transition-colors"
            title="Delete event"
          >
            🗑️
          </button>
        )}
      </div>
    </div>
  );
}

