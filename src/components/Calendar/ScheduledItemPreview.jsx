import { minutesToPixels, formatTime, snapToIncrement } from '../../utils/time';

// ========================================
// COMPONENT: ScheduledItemPreview (non-interactive preview during resize)
// PHASE 2 FIX: Separate component that doesn't call useDraggable
// ========================================

export default function ScheduledItemPreview({ item, pixelsPerSlot }) {
  const topPosition = minutesToPixels(item.startMinutes, pixelsPerSlot);
  const duration = item.duration || 30;
  const height = minutesToPixels(duration, pixelsPerSlot);
  
  // For display during resize, show nearest snapped times
  // This doesn't affect the actual draft values, only the label
  const displayStartMinutes = snapToIncrement(item.startMinutes);
  const displayEndMinutes = snapToIncrement(item.startMinutes + duration);
  const displayDuration = Math.max(0, displayEndMinutes - displayStartMinutes);

  return (
    <div
      className={`absolute left-20 right-2 ${item.color} text-white px-3 py-2 rounded shadow-lg z-10 flex flex-col justify-between overflow-visible`}
      style={{
        top: `${topPosition}px`,
        height: `${height}px`,
      }}
      data-preview="true"
    >
      <div>
        <div className="font-semibold text-sm">{item.label}</div>
        <div className="text-xs opacity-90">
          {formatTime(displayStartMinutes)} - {formatTime(displayEndMinutes)}
        </div>
      </div>
      {displayDuration > 30 && (
        <div className="text-xs opacity-75 text-right">
          {displayDuration} min
        </div>
      )}
      
      {/* Visual resize handle nubs (non-interactive, just for visual consistency) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 w-12 h-3 z-20 -mt-1 pointer-events-none">
        <div className="absolute left-1/2 -translate-x-1/2 top-0.5 w-8 h-1 rounded bg-white opacity-70" />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-12 h-3 z-20 -mb-1 pointer-events-none">
        <div className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-8 h-1 rounded bg-white opacity-70" />
      </div>
    </div>
  );
}

