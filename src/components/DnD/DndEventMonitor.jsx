import { useDndMonitor } from '@dnd-kit/core';

// ========================================
// DND EVENT MONITOR - Must be child of DndContext
// ========================================

export default function DndEventMonitor({ isResizing }) {
  useDndMonitor({
    onDragStart(event) {
      if (isResizing) {
        console.error('🚨 CRITICAL: DnD sensor activated DURING resize! Sensors should be INERT.');
      }
    },
  });
  
  return null; // This component only monitors, doesn't render anything
}

