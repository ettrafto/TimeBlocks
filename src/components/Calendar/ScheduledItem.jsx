import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { trackScheduledItemRender } from '../../utils/diagnostics';
import { minutesToPixels, formatTime } from '../../utils/time';
import { useTypesStore } from '../../state/typesStore.js';
import { hexToHsl, withSaturation, withLightness, hslToString, readableTextOn, tailwindToHex } from '../Create/colorUtils.js';

// ========================================
// COMPONENT: ScheduledItem (task placed in calendar)
// ========================================

export default function ScheduledItem({ 
  item, 
  pixelsPerSlot, 
  onResizeStart, 
  isBeingResized = false, 
  isResizing = false, 
  isConflicting = false,
  layoutStyle = { leftPct: 0, widthPct: 100, columnIndex: 0, overlapCount: 1 },
  showDebug = false,
}) {
  // PHASE 1 DIAGNOSTIC: Track this render
  trackScheduledItemRender(item.id);

  // ========================================
  // DRAGGABLE SETUP - Strict gating (disabled + conditional listeners)
  // ========================================
  
  // CRITICAL: allowDrag considers BOTH item-specific AND global resize state
  const allowDrag = !isBeingResized && !isResizing;
  
  const innerRef = React.useRef(null);
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: item.id,
    data: {
      type: 'scheduled',
      item,
    },
    disabled: !allowDrag, // Hard stop: disabled when ANY resize is active
  });

  // Combine refs so we can also read computed styles
  const setCombinedRef = React.useCallback((node) => {
    setNodeRef(node);
    innerRef.current = node;
  }, [setNodeRef]);

  // StackOverflow pattern: Only spread listeners when drag is allowed
  const listenersOnState = allowDrag ? listeners : undefined;

  // WARNING: isDragging should be false when ANY resize is active
  React.useEffect(() => {
    const willApplyTransform = isDragging && allowDrag && !!transform;
    
    if ((isBeingResized || isResizing) && isDragging) {
      console.error('⚠️ ASSERTION WARNING: isDragging=true during resize!', {
        isBeingResized,
        isResizing,
        isDragging,
        allowDrag,
        disabled: !allowDrag,
        listenersAttached: !!listenersOnState,
        message: 'Check: (1) only one draggable per ID, (2) sensors INERT during resize, (3) disabled=true'
      });
    }
    
    if ((isBeingResized || isResizing) && willApplyTransform) {
      console.error('❌ CRITICAL: Transform applied during resize!', { willApplyTransform });
    }
  }, [item.id, item.label, isBeingResized, isResizing, allowDrag, listenersOnState, isDragging, transform]);

  // Calculate position and height based on duration - using dynamic slot height
  const topPosition = minutesToPixels(item.startMinutes, pixelsPerSlot);
  const duration = item.duration || 30; // Default to 30 minutes if not specified
  const height = minutesToPixels(duration, pixelsPerSlot);
  
  // Extract layout positioning (Google Calendar-style horizontal layout)
  const { leftPct, widthPct, columnIndex, overlapCount } = layoutStyle;
  
  // Debug log for first render
  React.useEffect(() => {
    console.log(`📍 ScheduledItem ${item.id} layout:`, {
      label: item.label,
      layoutStyle,
      leftPct,
      widthPct,
    });
  }, [item.id, leftPct, widthPct]);
  
  // Apply transform for dragging
  // CRITICAL: Only apply transform when actually dragging AND drag is allowed
  // Derive background/text color from type color (desaturated for readability)
  const types = useTypesStore()?.items || [];
  const typeHex = (() => {
    const t = types.find(tt => String(tt.id) === String(item.typeId));
    const c = t?.color;
    if (!c) return '#3b82f6';
    return c.startsWith('#') ? c : tailwindToHex(c);
  })();
  const base = hexToHsl(typeHex);
  // Use the designated type color directly for solid event background
  const bg = typeHex;
  const text = readableTextOn(base);

  const style = {
    top: `${topPosition}px`,
    height: `${height}px`,
    left: `${leftPct}%`,
    width: `${widthPct}%`,
    transform: (isDragging && allowDrag && transform) 
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)` 
      : undefined, // Gate transform to prevent animation during resize
    background: bg,
    backgroundColor: bg,      // force solid color
    backgroundImage: 'none',  // prevent any inherited background-image
    color: text,
  };
  
  console.log(`🎨 ScheduledItem ${item.id} style:`, style);

  // Debug: log computed CSS after paint
  React.useEffect(() => {
    if (!innerRef.current) return;
    const cs = window.getComputedStyle(innerRef.current);
    console.log('🧪 Computed styles for event', item.id, {
      backgroundColor: cs.backgroundColor,
      opacity: cs.opacity,
      filter: cs.filter,
      mixBlendMode: cs.mixBlendMode,
    });
  }, [item.id, bg, text, leftPct, widthPct, topPosition, height]);

  // Calculate end time for display
  const endMinutes = item.startMinutes + duration;

  return (
    <div
      ref={setCombinedRef}
      {...attributes}
      {...listenersOnState}  // StackOverflow pattern: only spread when allowDrag=true
      className={`absolute px-3 py-2 rounded shadow-lg ${allowDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} z-10 flex flex-col justify-between overflow-visible ${isConflicting ? 'ring-2 ring-red-500/70' : ''}`}
      style={style}
      data-event-id={item.id}
      data-allow-drag={allowDrag}
      data-conflicting={isConflicting}
    >
      {/* Optional debug label showing column/overlap info */}
      {showDebug && (
        <div className="absolute top-0 right-0 text-[10px] bg-black/40 px-1 rounded-bl pointer-events-none">
          col {columnIndex} / {overlapCount}
        </div>
      )}
      
      <div>
      <div className="font-semibold text-sm">{item.label}</div>
        <div className="text-xs opacity-90">
          {formatTime(item.startMinutes)} - {formatTime(endMinutes)}
        </div>
      </div>
      {duration > 30 && (
        <div className="text-xs opacity-75 text-right">
          {duration} min
        </div>
      )}

      {/* ========================================
          RESIZE HANDLES - Top and Bottom edges only
          CRITICAL: Only the small nub area triggers resize, not the full width
          This allows clicking the event body for drag without interference
      ======================================== */}
      {onResizeStart && !isBeingResized && (
        <>
          {/* Top resize handle - only the nub is interactive */}
          <div
            data-resize="start"
            className="absolute left-1/2 -translate-x-1/2 top-0 w-12 h-3 cursor-ns-resize hover:bg-white hover:bg-opacity-20 transition-colors z-20 -mt-1 rounded-t"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(item, 'start', e.clientY);
            }}
          >
            {/* Visual nub */}
            <div className="absolute left-1/2 -translate-x-1/2 top-0.5 w-8 h-1 rounded bg-white opacity-70 pointer-events-none" />
          </div>

          {/* Bottom resize handle - only the nub is interactive */}
          <div
            data-resize="end"
            className="absolute left-1/2 -translate-x-1/2 bottom-0 w-12 h-3 cursor-ns-resize hover:bg-white hover:bg-opacity-20 transition-colors z-20 -mb-1 rounded-b"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(item, 'end', e.clientY);
            }}
          >
            {/* Visual nub */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-8 h-1 rounded bg-white opacity-70 pointer-events-none" />
          </div>
        </>
      )}
    </div>
  );
}

