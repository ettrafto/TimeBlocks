import React, { useSyncExternalStore } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { START_HOUR, END_HOUR, MINUTES_PER_SLOT, DEFAULT_PIXELS_PER_SLOT, MIN_PIXELS_PER_SLOT, MAX_PIXELS_PER_SLOT } from '../../constants/calendar';
import { generateTimeSlots, minutesToPixels } from '../../utils/time';
import { computeEventLayout } from '../../utils/overlap';
import ScheduledItem from './ScheduledItem';
import ScheduledItemPreview from './ScheduledItemPreview';
import GhostEvent from './GhostEvent';
import { uiStore } from '../../state/uiStore';

// Hook to consume UI store
function useUi() {
  return useSyncExternalStore(uiStore.subscribe, uiStore.get, uiStore.get);
}

// ========================================
// COMPONENT: CalendarGrid (time slots + drop zone)
// ========================================

/**
 * NEW PROPS (optional, for multi-day support):
 * - dayDate: Date         // The date this grid represents
 * - dayKey: string        // ISO date key 'YYYY-MM-DD' for persistence/queries
 * - idNamespace: string   // unique prefix to namespace droppable IDs (e.g. 'day:2025-10-15')
 * - onDrop: (payload) => void  // callback when an item is dropped in this grid
 */
export default function CalendarGrid({ 
  scheduledItems, 
  ghostPosition, 
  pixelsPerSlot, 
  onZoom, 
  calendarDomRef, 
  resizeDraft, 
  onResizeStart, 
  isResizing,
  conflictUi, // Conflict UI state: { liveConflict, dayKey, draftCandidate, movingId }
  // New props for multi-day support (optional)
  dayDate,
  dayKey,
  idNamespace,
  onDrop,
}) {
  console.log('🔲 CalendarGrid RENDER:', {
    dayKey,
    scheduledItemsCount: scheduledItems?.length || 0,
    hasGhost: !!ghostPosition,
    hasResizeDraft: !!resizeDraft,
  });
  
  const timeSlots = generateTimeSlots();
  const calendarHeight = (END_HOUR - START_HOUR) * 60 * (pixelsPerSlot / MINUTES_PER_SLOT);
  
  const containerRef = React.useRef(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0, scrollTop: 0 });

  // Consume UI store for drag/resize state
  const ui = useUi();
  
  // Only show ghost in this grid if it's currently hovered
  const isHoveringThisGrid = idNamespace ? (ui.dragOverNamespace === idNamespace) : true;
  
  // Only show resize draft if it's for this day
  const showResizeDraft = resizeDraft && (!idNamespace || resizeDraft.dateKey === dayKey);
  
  // Check if this day column has a conflict
  const isConflictDay = conflictUi && conflictUi.liveConflict && conflictUi.dayKey === dayKey;

  // ========================================
  // GOOGLE CALENDAR-STYLE HORIZONTAL LAYOUT
  // ========================================
  
  // Compute horizontal positioning for overlapping events
  const layout = React.useMemo(() => {
    console.log('📊 CalendarGrid computing layout for', scheduledItems.length, 'items');
    const result = computeEventLayout(scheduledItems);
    console.log('📊 Layout result:', result);
    return result;
  }, [scheduledItems]);
  
  // Optional: Enable to see debug labels on events
  const showDebugLabels = true; // Set to true for debugging

  // Make the entire calendar a droppable zone
  // Use namespaced ID if provided (multi-day), otherwise 'calendar' (single-day backward compat)
  const droppableId = idNamespace ? `${idNamespace}::calendar` : 'calendar';
  
  const { setNodeRef } = useDroppable({
    id: droppableId,
    data: {
      dayKey: dayKey || null,
      dayDate: dayDate || null,
    },
  });

  // ========================================
  // ZOOM FUNCTIONALITY (Mouse Wheel)
  // ========================================
  const handleWheel = React.useCallback((e) => {
    // Check if scrolling vertically (normal scroll) or zooming (Ctrl+wheel or pinch)
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      
      const zoomDelta = -e.deltaY * 0.1; // Sensitivity adjustment
      const newPixelsPerSlot = Math.max(
        MIN_PIXELS_PER_SLOT,
        Math.min(MAX_PIXELS_PER_SLOT, pixelsPerSlot + zoomDelta)
      );
      
      if (newPixelsPerSlot !== pixelsPerSlot) {
        onZoom(newPixelsPerSlot);
      }
    }
  }, [pixelsPerSlot, onZoom]);

  // ========================================
  // DRAG-TO-SCROLL FUNCTIONALITY
  // ========================================
  const handleMouseDown = React.useCallback((e) => {
    // Don't start scroll-drag if currently resizing an event
    if (isResizing) return;
    
    // Only initiate drag-to-scroll with middle mouse or when not on an event
    if (e.button === 1 || (e.button === 0 && e.target === containerRef.current)) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        scrollTop: containerRef.current?.parentElement?.scrollTop || 0,
      });
      e.preventDefault();
    }
  }, [isResizing]);

  const handleMouseMove = React.useCallback((e) => {
    if (!isDragging || !containerRef.current?.parentElement) return;
    
    const deltaY = e.clientY - dragStart.y;
    const newScrollTop = dragStart.scrollTop - deltaY;
    
    containerRef.current.parentElement.scrollTop = newScrollTop;
  }, [isDragging, dragStart]);

  const handleMouseUp = React.useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  // Add event listeners
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleWheel, handleMouseMove, handleMouseUp, isDragging]);

  return (
    <div 
      ref={(node) => {
        setNodeRef(node);
        containerRef.current = node;
        if (node && calendarDomRef) calendarDomRef.current = node;
      }}
      data-droppable-id={droppableId}
      data-day-key={dayKey || 'default'}
      className={`relative bg-white ${!idNamespace ? 'border-l border-gray-300' : ''} ${isDragging ? 'cursor-grabbing' : 'cursor-default'} no-scrollbar overflow-x-hidden overscroll-x-contain touch-pan-y`}
      style={{ height: `${calendarHeight}px`, touchAction: 'pan-y' }}
      onMouseDown={handleMouseDown}
      onWheel={(e) => {
        // Suppress horizontal wheel gestures to prevent panning
        if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
          e.preventDefault();
        }
        // Zoom handling continues in handleWheel callback
      }}
    >
      {/* Time labels and grid lines */}
      {timeSlots.map((slot, index) => {
        const topPosition = minutesToPixels(slot.minutes, pixelsPerSlot);
        const lineColor = slot.isHour 
          ? 'border-gray-400' 
          : slot.isHalfHour 
          ? 'border-gray-300' 
          : 'border-gray-200';
        
        return (
          <div
            key={index}
            className={`absolute left-0 right-0 border-t ${lineColor}`}
            style={{ top: `${topPosition}px` }}
          >
            {slot.isHour && (
              <div className="absolute left-2 -top-3 text-xs text-gray-600 font-medium bg-white px-1">
                {slot.time}
              </div>
            )}
          </div>
        );
      })}

      {/* Scheduled items - CRITICAL: Skip item being resized to avoid duplicate draggable */}
      {/* Use per-day keys to prevent React recycling across columns */}
      {scheduledItems
        .filter(item => {
          const isBeingResized = resizeDraft?.id === item.id;
          return !isBeingResized; // Don't render the real draggable when resizing
        })
        .map((item) => {
          const itemLayout = layout[item.id] || { leftPct: 0, widthPct: 100, columnIndex: 0, overlapCount: 1 };
          return (
            <ScheduledItem 
              key={dayKey ? `${item.id}@${dayKey}` : item.id}
              item={item} 
              pixelsPerSlot={pixelsPerSlot}
              onResizeStart={onResizeStart}
              isBeingResized={false} // Never true here since we filtered it out
              isResizing={isResizing}
              isConflicting={false} // Real events don't show conflict (only draft shows visual)
              layoutStyle={itemLayout}
              showDebug={showDebugLabels}
            />
          );
        })
      }

      {/* Live resize draft - shows preview while resizing */}
      {/* PHASE 2 FIX: Use ScheduledItemPreview (no useDraggable) to avoid duplicate ID */}
      {/* Only show if this is the active day for resize */}
      {showResizeDraft && (
        <div className="pointer-events-none absolute inset-0 z-30">
          <ScheduledItemPreview
            key={`preview-${resizeDraft.id}@${dayKey || 'default'}`}
            item={resizeDraft}
            pixelsPerSlot={pixelsPerSlot}
            isConflicting={conflictUi && conflictUi.liveConflict && conflictUi.dayKey === dayKey}
            layoutStyle={layout[resizeDraft.id] || { leftPct: 0, widthPct: 100, columnIndex: 0, overlapCount: 1 }}
            showDebug={showDebugLabels}
          />
        </div>
      )}

      {/* Ghost/shadow preview - shows where dragged item will land */}
      {/* Only render ghost in the grid that's currently hovered */}
      {isHoveringThisGrid && ghostPosition && (
        <GhostEvent 
          ghostPosition={ghostPosition} 
          pixelsPerSlot={pixelsPerSlot}
          isConflicting={conflictUi && conflictUi.liveConflict && conflictUi.dayKey === dayKey}
          layoutStyle={{ leftPct: 0, widthPct: 100, columnIndex: 0, overlapCount: 1 }}
          showDebug={showDebugLabels}
        />
      )}
    </div>
  );
}

