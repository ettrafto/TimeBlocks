import { minutesToPixels, formatTime } from '../../utils/time';

// ========================================
// COMPONENT: GhostEvent (preview of where event will be placed)
// ========================================

export default function GhostEvent({ ghostPosition, pixelsPerSlot }) {
  if (!ghostPosition) return null;

  const { startMinutes, task } = ghostPosition;
  const topPosition = minutesToPixels(startMinutes, pixelsPerSlot);
  
  // Calculate height based on task duration - using dynamic slot height
  const duration = task.duration || 30; // Default 30 minutes
  const height = minutesToPixels(duration, pixelsPerSlot);
  
  // Calculate end time for preview
  const endMinutes = startMinutes + duration;

  return (
    <div
      className="absolute left-20 right-2 border-2 border-gray-400 border-dashed rounded bg-gray-50 bg-opacity-30 z-20 pointer-events-none px-3 py-2 flex flex-col justify-between"
      style={{ 
        top: `${topPosition}px`,
        height: `${height}px`,
      }}
    >
      <div className="text-gray-700 text-sm font-medium">
        {task.label}
      </div>
      <div className="text-gray-600 text-xs">
        {formatTime(startMinutes)} - {formatTime(endMinutes)}
      </div>
    </div>
  );
}

