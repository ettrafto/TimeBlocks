import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { START_HOUR, END_HOUR, MINUTES_PER_SLOT, DEFAULT_PIXELS_PER_SLOT, MIN_PIXELS_PER_SLOT, MAX_PIXELS_PER_SLOT } from '../../constants/calendar';
import { generateTimeSlots, minutesToPixels } from '../../utils/time';
import ScheduledItem from './ScheduledItem';
import ScheduledItemPreview from './ScheduledItemPreview';
import GhostEvent from './GhostEvent';

// ========================================
// COMPONENT: CalendarGrid (time slots + drop zone)
// ========================================

export default function CalendarGrid({ scheduledItems, ghostPosition, pixelsPerSlot, onZoom, calendarDomRef, resizeDraft, onResizeStart, isResizing }) {
  const timeSlots = generateTimeSlots();
  const calendarHeight = (END_HOUR - START_HOUR) * 60 * (pixelsPerSlot / MINUTES_PER_SLOT);
  
  const containerRef = React.useRef(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0, scrollTop: 0 });

  // Make the entire calendar a droppable zone
  const { setNodeRef } = useDroppable({
    id: 'calendar',
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
      data-droppable-id="calendar"
      className={`relative bg-white border-l border-gray-300 ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
      style={{ height: `${calendarHeight}px` }}
      onMouseDown={handleMouseDown}
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
      {scheduledItems
        .filter(item => {
          const isBeingResized = resizeDraft?.id === item.id;
          return !isBeingResized; // Don't render the real draggable when resizing
        })
        .map((item) => (
          <ScheduledItem 
            key={item.id} 
            item={item} 
            pixelsPerSlot={pixelsPerSlot}
            onResizeStart={onResizeStart}
            isBeingResized={false} // Never true here since we filtered it out
            isResizing={isResizing}
          />
        ))
      }

      {/* Live resize draft - shows preview while resizing */}
      {/* PHASE 2 FIX: Use ScheduledItemPreview (no useDraggable) to avoid duplicate ID */}
      {resizeDraft && (
        <div className="pointer-events-none absolute inset-0 z-30">
          <ScheduledItemPreview
            key={`preview-${resizeDraft.id}`}
            item={resizeDraft}
            pixelsPerSlot={pixelsPerSlot}
          />
        </div>
      )}

      {/* Ghost/shadow preview - shows where dragged item will land */}
      <GhostEvent ghostPosition={ghostPosition} pixelsPerSlot={pixelsPerSlot} />
    </div>
  );
}

