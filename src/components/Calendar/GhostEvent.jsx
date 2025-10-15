import { minutesToPixels, formatTime } from '../../utils/time';

// ========================================
// COMPONENT: GhostEvent (preview of where event will be placed)
// ========================================

export default function GhostEvent({ 
  ghostPosition, 
  pixelsPerSlot, 
  isConflicting = false,
  layoutStyle = { leftPct: 0, widthPct: 100, columnIndex: 0, overlapCount: 1 },
  showDebug = false,
}) {
  if (!ghostPosition) return null;

  const { startMinutes, task } = ghostPosition;
  const topPosition = minutesToPixels(startMinutes, pixelsPerSlot);
  
  // Calculate height based on task duration - using dynamic slot height
  const duration = task.duration || 30; // Default 30 minutes
  const height = minutesToPixels(duration, pixelsPerSlot);
  
  // Extract layout positioning
  const { leftPct, widthPct, columnIndex, overlapCount } = layoutStyle;
  
  // Calculate end time for preview
  const endMinutes = startMinutes + duration;

  return (
    <div
      className={`absolute border-2 ${isConflicting ? 'border-red-500 bg-red-500/20' : 'border-gray-400 bg-gray-50 bg-opacity-30'} border-dashed rounded z-20 pointer-events-none px-3 py-2 flex flex-col justify-between`}
      style={{ 
        top: `${topPosition}px`,
        height: `${height}px`,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
      }}
      data-conflicting={isConflicting}
    >
      {/* Optional debug label */}
      {showDebug && (
        <div className="absolute top-0 right-0 text-[10px] bg-black/40 px-1 rounded-bl">
          col {columnIndex} / {overlapCount}
        </div>
      )}
      
      <div className="text-gray-700 text-sm font-medium">
        {task.label}
      </div>
      <div className="text-gray-600 text-xs">
        {formatTime(startMinutes)} - {formatTime(endMinutes)}
      </div>
    </div>
  );
}

