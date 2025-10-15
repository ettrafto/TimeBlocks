import React, { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from '@dnd-kit/core';

// ========================================
// CONFIGURATION & CONSTANTS
// ========================================

// Predefined color options for events
const COLOR_OPTIONS = [
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Green', value: 'bg-green-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Yellow', value: 'bg-yellow-500' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Indigo', value: 'bg-indigo-500' },
  { name: 'Teal', value: 'bg-teal-500' },
  { name: 'Cyan', value: 'bg-cyan-500' },
];

// Calendar configuration
const START_HOUR = 8; // 8 AM
const END_HOUR = 17; // 5 PM
const MINUTES_PER_SLOT = 15;

// Default zoom level
const DEFAULT_PIXELS_PER_SLOT = 20; // 20px per 15-minute slot
const MIN_PIXELS_PER_SLOT = 10; // Minimum zoom out
const MAX_PIXELS_PER_SLOT = 80; // Maximum zoom in

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Convert pixels to time (minutes from start) - using dynamic slot height
function pixelsToMinutes(pixels, pixelsPerSlot = DEFAULT_PIXELS_PER_SLOT) {
  const pixelsPerMinute = pixelsPerSlot / MINUTES_PER_SLOT;
  return Math.round(pixels / pixelsPerMinute);
}

// Convert time (minutes from start) to pixels - using dynamic slot height
function minutesToPixels(minutes, pixelsPerSlot = DEFAULT_PIXELS_PER_SLOT) {
  const pixelsPerMinute = pixelsPerSlot / MINUTES_PER_SLOT;
  return minutes * pixelsPerMinute;
}

// Snap minutes to nearest 15-minute increment
function snapToIncrement(minutes) {
  return Math.round(minutes / MINUTES_PER_SLOT) * MINUTES_PER_SLOT;
}

// ========================================
// OVERLAP DETECTION UTILITY
// ========================================

// Check if a new event overlaps with any existing events
function checkOverlap(newEvent, existingEvents) {
  const newStart = newEvent.startMinutes;
  const newEnd = newEvent.startMinutes + (newEvent.duration || 30);
  
  const overlappingEvents = existingEvents.filter(existing => {
    const existingStart = existing.startMinutes;
    const existingEnd = existing.startMinutes + (existing.duration || 30);
    
    // Overlap condition: new.start < existing.end AND new.end > existing.start
    return newStart < existingEnd && newEnd > existingStart;
  });
  
  return overlappingEvents;
}

// Format minutes to time string (e.g., "9:30 AM")
function formatTime(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60) + START_HOUR;
  const minute = totalMinutes % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

// Generate time slots for the calendar
function generateTimeSlots() {
  const slots = [];
  const totalMinutes = (END_HOUR - START_HOUR) * 60;
  
  for (let i = 0; i <= totalMinutes; i += MINUTES_PER_SLOT) {
    const hour = Math.floor(i / 60) + START_HOUR;
    const minute = i % 60;
    const isHour = minute === 0;
    const isHalfHour = minute === 30;
    
    slots.push({
      time: formatTime(i),
      minutes: i,
      isHour,
      isHalfHour,
    });
  }
  
  return slots;
}

// ========================================
// COMPONENT: Modal (reusable confirmation dialog)
// ========================================

function Modal({ isOpen, title, children, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>
        <div className="text-gray-600 mb-6">{children}</div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// COMPONENT: EventEditorModal (create/edit event templates)
// ========================================

function EventEditorModal({ isOpen, editingEvent, onSave, onCancel }) {
  const [name, setName] = React.useState('');
  const [duration, setDuration] = React.useState(30);
  const [color, setColor] = React.useState('bg-blue-500');
  const [type, setType] = React.useState('');

  // Populate form when editing
  React.useEffect(() => {
    if (editingEvent) {
      setName(editingEvent.name || '');
      setDuration(editingEvent.duration || 30);
      setColor(editingEvent.color || 'bg-blue-500');
      setType(editingEvent.type || '');
    } else {
      // Reset form for new event
      setName('');
      setDuration(30);
      setColor('bg-blue-500');
      setType('');
    }
  }, [editingEvent, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter an event name');
      return;
    }
    
    onSave({
      id: editingEvent?.id || `template-${Date.now()}`,
      name: name.trim(),
      duration,
      color,
      type,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      ></div>
      
      {/* Modal Content */}
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          {editingEvent ? 'Edit Event' : 'Create New Event'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Team Meeting"
              required
            />
          </div>

          {/* Duration Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) *
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={75}>75 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={105}>105 minutes</option>
              <option value={120}>120 minutes</option>
            </select>
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color *
            </label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_OPTIONS.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className={`${colorOption.value} h-10 rounded border-2 transition-all ${
                    color === colorOption.value
                      ? 'border-gray-800 ring-2 ring-gray-400'
                      : 'border-transparent hover:border-gray-400'
                  }`}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>

          {/* Type Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type (optional)
            </label>
            <input
              type="text"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Work, Personal, Exercise"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
            >
              {editingEvent ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================================
// COMPONENT: TaskBlock (draggable task in left panel)
// ========================================

function TaskBlock({ task, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`${task.color} text-white px-4 py-3 rounded-lg shadow-md cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity relative group`}
    >
      <div className="font-semibold">{task.name || task.label}</div>
      {task.duration && (
        <div className="text-xs opacity-80 mt-1">{task.duration} minutes</div>
      )}
      {onClick && (
        <div className="absolute top-1 right-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          ✏️
        </div>
      )}
    </div>
  );
}

// ========================================
// COMPONENT: DraggableTaskBlock (wrapper with dnd-kit drag logic)
// ========================================

function DraggableTaskBlock({ task, onEdit }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${task.id}`,
    data: {
      type: 'template',
      task,
    },
  });

  const handleClick = (e) => {
    // Only trigger edit if clicking the block itself, not during drag
    if (onEdit && !isDragging) {
      e.stopPropagation();
      onEdit(task);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <TaskBlock task={task} onClick={handleClick} />
    </div>
  );
}

// Import useDraggable
import { useDraggable, useDroppable } from '@dnd-kit/core';

// ========================================
// COMPONENT: ScheduledItem (task placed in calendar)
// ========================================

function ScheduledItem({ item, pixelsPerSlot }) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: item.id,
    data: {
      type: 'scheduled',
      item,
    },
  });

  // Calculate position and height based on duration - using dynamic slot height
  const topPosition = minutesToPixels(item.startMinutes, pixelsPerSlot);
  const duration = item.duration || 30; // Default to 30 minutes if not specified
  const height = minutesToPixels(duration, pixelsPerSlot);
  
  // Apply transform for dragging
  const style = {
    top: `${topPosition}px`,
    height: `${height}px`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.3 : 1, // Lower opacity when dragging so ghost is more visible
  };

  // Calculate end time for display
  const endMinutes = item.startMinutes + duration;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`absolute left-20 right-2 ${item.color} text-white px-3 py-2 rounded shadow-lg cursor-grab active:cursor-grabbing z-10 flex flex-col justify-between overflow-hidden`}
      style={style}
    >
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
    </div>
  );
}

// ========================================
// COMPONENT: GhostEvent (preview of where event will be placed)
// ========================================

function GhostEvent({ ghostPosition, pixelsPerSlot }) {
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

// ========================================
// COMPONENT: CalendarGrid (time slots + drop zone)
// ========================================

function CalendarGrid({ scheduledItems, ghostPosition, pixelsPerSlot, onZoom }) {
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
        console.log('🔍 Zoom:', {
          from: `${pixelsPerSlot.toFixed(1)}px/slot`,
          to: `${newPixelsPerSlot.toFixed(1)}px/slot`,
          percentage: `${((newPixelsPerSlot / DEFAULT_PIXELS_PER_SLOT) * 100).toFixed(0)}%`
        });
        onZoom(newPixelsPerSlot);
      }
    }
  }, [pixelsPerSlot, onZoom]);

  // ========================================
  // DRAG-TO-SCROLL FUNCTIONALITY
  // ========================================
  const handleMouseDown = React.useCallback((e) => {
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
  }, []);

  const handleMouseMove = React.useCallback((e) => {
    if (!isDragging || !containerRef.current?.parentElement) return;
    
    const deltaY = e.clientY - dragStart.y;
    const newScrollTop = dragStart.scrollTop - deltaY;
    
    containerRef.current.parentElement.scrollTop = newScrollTop;
    
    console.log('📜 Scroll drag:', {
      deltaY: deltaY.toFixed(0),
      scrollTop: newScrollTop.toFixed(0),
    });
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

      {/* Scheduled items */}
      {scheduledItems.map((item) => (
        <ScheduledItem key={item.id} item={item} pixelsPerSlot={pixelsPerSlot} />
      ))}

      {/* Ghost/shadow preview - shows where dragged item will land */}
      <GhostEvent ghostPosition={ghostPosition} pixelsPerSlot={pixelsPerSlot} />
    </div>
  );
}

// ========================================
// MAIN APP COMPONENT
// ========================================

function App() {
  // State: scheduled items in the calendar
  const [scheduledItems, setScheduledItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [nextId, setNextId] = useState(1);
  
  // State: Track ghost/shadow preview position while dragging over calendar
  const [ghostPosition, setGhostPosition] = useState(null); // { startMinutes: number, task: object }
  
  // State: Zoom level (pixels per 15-minute slot)
  const [pixelsPerSlot, setPixelsPerSlot] = useState(DEFAULT_PIXELS_PER_SLOT);
  
  // State: Modal and overlap handling
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [pendingEvent, setPendingEvent] = useState(null); // Event waiting for user confirmation
  const [overlappingEvents, setOverlappingEvents] = useState([]); // Events that overlap with pending event

  // State: Custom task templates (user-created event types)
  const [taskTemplates, setTaskTemplates] = useState([]);
  
  // State: Event editor modal
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevents accidental drags
      },
    })
  );

  // ========================================
  // ZOOM HANDLER
  // ========================================
  const handleZoom = React.useCallback((newPixelsPerSlot) => {
    setPixelsPerSlot(newPixelsPerSlot);
  }, []);

  // ========================================
  // EVENT TEMPLATE HANDLERS
  // ========================================
  
  // Open modal to create new template
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowEventEditor(true);
  };
  
  // Open modal to edit existing template
  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowEventEditor(true);
  };
  
  // Save template (create or update)
  const handleSaveTemplate = (templateData) => {
    if (editingTemplate) {
      // Update existing template
      setTaskTemplates(prev => 
        prev.map(t => t.id === templateData.id ? templateData : t)
      );
      console.log('✏️ Updated template:', templateData.name);
    } else {
      // Create new template
      setTaskTemplates(prev => [...prev, templateData]);
      console.log('➕ Created template:', templateData.name);
    }
    
    setShowEventEditor(false);
    setEditingTemplate(null);
  };
  
  // Cancel template editing
  const handleCancelTemplate = () => {
    setShowEventEditor(false);
    setEditingTemplate(null);
  };

  // ========================================
  // OVERLAP MODAL HANDLERS
  // ========================================
  
  // User confirms - add/update the pending event despite overlap
  const handleConfirmOverlap = React.useCallback(() => {
    if (pendingEvent) {
      console.log('✅ User allowed overlap - processing event:', pendingEvent.label);
      
      // Check if this is a new event or a repositioned existing event
      const isExistingEvent = scheduledItems.some(e => e.id === pendingEvent.id);
      
      if (isExistingEvent) {
        // Repositioning existing event
        setScheduledItems((prev) =>
          prev.map((schedItem) =>
            schedItem.id === pendingEvent.id
              ? pendingEvent
              : schedItem
          )
        );
      } else {
        // Adding new event
        setScheduledItems((prev) => [...prev, pendingEvent]);
        setNextId((prev) => prev + 1);
      }
    }
    
    // Close modal and clear pending state
    setShowOverlapModal(false);
    setPendingEvent(null);
    setOverlappingEvents([]);
  }, [pendingEvent, scheduledItems]);
  
  // User cancels - discard the pending event
  const handleCancelOverlap = React.useCallback(() => {
    console.log('❌ User canceled - discarding event:', pendingEvent?.label);
    
    // Close modal and clear pending state
    setShowOverlapModal(false);
    setPendingEvent(null);
    setOverlappingEvents([]);
  }, [pendingEvent]);

  // ========================================
  // DRAG & DROP HANDLERS
  // ========================================

  function handleDragStart(event) {
    const activeData = event.active.data.current;
    console.log('🚀 DRAG START:', {
      id: event.active.id,
      type: activeData?.type,
      label: activeData?.task?.name || activeData?.task?.label || activeData?.item?.label || activeData?.item?.name,
    });
    
    setActiveId(event.active.id);
    setGhostPosition(null); // Clear any previous ghost
  }

  function handleDragMove(event) {
    const { active, over, delta } = event;
    
    // Only show ghost when dragging over the calendar
    if (!over || over.id !== 'calendar') {
      setGhostPosition(null);
      return;
    }

    const activeData = active.data.current;
    
    if (!activeData) {
      setGhostPosition(null);
      return;
    }

    // Get calendar element to calculate position
    const calendarElement = over.node?.current || document.querySelector('[data-droppable-id="calendar"]');
    if (!calendarElement) {
      console.warn('⚠️ Calendar element not found for ghost preview');
      return;
    }

    const rect = calendarElement.getBoundingClientRect();
    let finalMinutes;
    let taskInfo;

    if (activeData.type === 'template') {
      // ========================================
      // DRAGGING FROM LEFT PANEL - Show ghost at mouse position
      // ========================================
      const activatorEvent = event.activatorEvent;
      
      if (!activatorEvent || !('clientY' in activatorEvent)) {
        return;
      }
      
      const currentMouseY = activatorEvent.clientY + delta.y;
      const offsetY = currentMouseY - rect.top;
      
      // Convert to minutes and snap to 15-min increment - using dynamic slot height
      const minutes = pixelsToMinutes(offsetY, pixelsPerSlot);
      const snappedMinutes = snapToIncrement(minutes);
      
      // Clamp to calendar bounds
      const totalMinutes = (END_HOUR - START_HOUR) * 60;
      finalMinutes = Math.max(0, Math.min(snappedMinutes, totalMinutes - MINUTES_PER_SLOT));
      
      taskInfo = activeData.task;
      
    } else if (activeData.type === 'scheduled') {
      // ========================================
      // REPOSITIONING EXISTING EVENT - Show ghost at new position
      // ========================================
      const item = activeData.item;
      
      // Calculate new position based on drag delta - using dynamic slot height
      const currentPixels = minutesToPixels(item.startMinutes, pixelsPerSlot);
      const newPixels = currentPixels + delta.y;
      const newMinutes = pixelsToMinutes(newPixels, pixelsPerSlot);
      const snappedMinutes = snapToIncrement(newMinutes);
      
      // Clamp to calendar bounds
      const totalMinutes = (END_HOUR - START_HOUR) * 60;
      finalMinutes = Math.max(0, Math.min(snappedMinutes, totalMinutes - MINUTES_PER_SLOT));
      
      // Create a task-like object from the scheduled item
      taskInfo = {
        name: item.label || item.name,
        label: item.label || item.name,
        color: item.color,
        duration: item.duration || 30,
      };
    } else {
      setGhostPosition(null);
      return;
    }
    
    // Update ghost position
    setGhostPosition({
      startMinutes: finalMinutes,
      task: taskInfo,
    });
    
    // Debug logging with duration info
    const taskDuration = taskInfo.duration || 30;
    const ghostHeight = minutesToPixels(taskDuration, pixelsPerSlot);
    console.log('👻 Ghost preview:', {
      time: formatTime(finalMinutes),
      duration: `${taskDuration} min`,
      height: `${ghostHeight}px`,
      position: `${minutesToPixels(finalMinutes, pixelsPerSlot)}px from top`,
      type: activeData.type,
      zoom: `${pixelsPerSlot.toFixed(1)}px/slot`,
    });
  }

  function handleDragEnd(event) {
    const { active, over, delta } = event;
    
    console.log('🏁 DRAG END:', {
      activeId: active?.id,
      overId: over?.id,
      activeType: active?.data?.current?.type,
      deltaY: delta?.y,
    });
    
    setActiveId(null);

    // Only process if dropped over the calendar
    if (over?.id !== 'calendar') {
      console.log('⚠️ Not dropped on calendar, ignoring');
      setGhostPosition(null); // Clear ghost on failed drop
      return;
    }

    const activeData = active.data.current;

    if (activeData.type === 'template') {
      // ========================================
      // DRAGGING FROM LEFT PANEL - CREATE NEW SCHEDULED ITEM
      // Use the ghost preview position for placement
      // ========================================
      
      if (!ghostPosition) {
        console.warn('⚠️ No ghost position available, cannot place event');
        setGhostPosition(null);
        return;
      }
      
      const task = activeData.task;
      const finalMinutes = ghostPosition.startMinutes;
      const duration = task.duration || 30; // Use task duration or default to 30 min

      const newItem = {
        id: `scheduled-${nextId}`,
        label: task.name || task.label, // Support both name and label
        color: task.color,
        startMinutes: finalMinutes,
        duration: duration,
      };

      // ========================================
      // CHECK FOR OVERLAPS
      // ========================================
      const overlaps = checkOverlap(newItem, scheduledItems);
      
      if (overlaps.length > 0) {
        // Overlap detected - show modal for confirmation
        console.log('⚠️ Overlap detected with:', overlaps.map(e => e.label).join(', '));
        setPendingEvent(newItem);
        setOverlappingEvents(overlaps);
        setShowOverlapModal(true);
        setGhostPosition(null);
      } else {
        // No overlap - add event directly
        console.log(`✅ Placed "${task.name || task.label}" at ${formatTime(finalMinutes)} (${duration} min duration, height: ${minutesToPixels(duration, pixelsPerSlot)}px)`);
        setScheduledItems((prev) => [...prev, newItem]);
        setNextId((prev) => prev + 1);
        setGhostPosition(null);
      }
    } else if (activeData.type === 'scheduled') {
      // ========================================
      // DRAGGING WITHIN CALENDAR - REPOSITION EXISTING EVENT
      // Use the ghost preview position for placement (same as template drops)
      // ========================================
      
      if (!ghostPosition) {
        console.warn('⚠️ No ghost position available for repositioning');
        setGhostPosition(null);
        return;
      }
      
      const item = activeData.item;
      const finalMinutes = ghostPosition.startMinutes;
      
      console.log('🔄 Repositioning event:', item.label, 'from', formatTime(item.startMinutes), 'to', formatTime(finalMinutes));

      // Create updated event object
      const updatedItem = { ...item, startMinutes: finalMinutes };
      
      // ========================================
      // CHECK FOR OVERLAPS (excluding the event being moved)
      // ========================================
      const otherEvents = scheduledItems.filter(e => e.id !== item.id);
      const overlaps = checkOverlap(updatedItem, otherEvents);
      
      if (overlaps.length > 0) {
        // Overlap detected - show modal for confirmation
        console.log('⚠️ Reposition would overlap with:', overlaps.map(e => e.label).join(', '));
        setPendingEvent(updatedItem);
        setOverlappingEvents(overlaps);
        setShowOverlapModal(true);
        setGhostPosition(null);
      } else {
        // No overlap - update position directly
        console.log(`✅ Moved "${item.label}" to ${formatTime(finalMinutes)} (duration: ${item.duration || 30} min preserved)`);
        setScheduledItems((prev) =>
          prev.map((schedItem) =>
            schedItem.id === item.id
              ? { ...schedItem, startMinutes: finalMinutes }
              : schedItem
          )
        );
        setGhostPosition(null);
      }
    }
  }

  // Get the active item for the drag overlay
  const activeItem = activeId
    ? activeId.startsWith('template-')
      ? taskTemplates.find((t) => `template-${t.id}` === activeId)
      : scheduledItems.find((item) => item.id === activeId)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen bg-gray-50">
        {/* ========================================
            LEFT PANEL: Custom Event Templates
        ======================================== */}
        <div className="w-1/3 bg-gray-100 p-6 border-r border-gray-300 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Event Templates</h2>
            <button
              onClick={handleCreateTemplate}
              className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg text-xl font-bold"
              title="Create New Event Template"
            >
              +
            </button>
          </div>
          
          {taskTemplates.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              <p className="mb-4">No event templates yet!</p>
              <p className="text-sm">Click the <strong className="text-blue-600">+</strong> button above to create your first event template.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {taskTemplates.map((task) => (
                <DraggableTaskBlock 
                  key={task.id} 
                  task={task} 
                  onEdit={handleEditTemplate}
                />
              ))}
            </div>
          )}
          
          {/* Instructions */}
          <div className="mt-8 p-4 bg-white rounded-lg shadow text-sm text-gray-600">
            <p className="font-semibold mb-2">How to use:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click <strong>+</strong> to create event templates</li>
              <li>Drag templates to the calendar</li>
              <li>Click a template to edit it</li>
              <li>Events snap to 15-min slots</li>
              <li>Ctrl+Scroll to zoom calendar</li>
            </ul>
          </div>
        </div>

        {/* ========================================
            RIGHT PANEL: Calendar
        ======================================== */}
        <div className="w-2/3 overflow-y-auto" id="calendar-container">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center justify-between">
              <span>Daily Schedule ({START_HOUR}:00 AM - {END_HOUR > 12 ? END_HOUR - 12 : END_HOUR}:00 PM)</span>
              <span className="text-sm font-normal text-gray-600">
                Zoom: {((pixelsPerSlot / DEFAULT_PIXELS_PER_SLOT) * 100).toFixed(0)}% 
                <span className="ml-2 text-xs text-gray-500">(Ctrl+Scroll to zoom)</span>
              </span>
            </h2>
            <CalendarGrid 
              scheduledItems={scheduledItems} 
              ghostPosition={ghostPosition} 
              pixelsPerSlot={pixelsPerSlot}
              onZoom={handleZoom}
            />
          </div>
        </div>
      </div>

      {/* ========================================
          DRAG OVERLAY: Shows item while dragging
      ======================================== */}
      <DragOverlay>
        {activeItem ? (
          <div className="opacity-90">
            <TaskBlock
              task={
                activeId?.startsWith('template-')
                  ? activeItem
                  : {
                      name: activeItem.label || activeItem.name,
                      label: activeItem.label || activeItem.name,
                      color: activeItem.color,
                      duration: activeItem.duration,
                    }
              }
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* ========================================
          OVERLAP CONFIRMATION MODAL
      ======================================== */}
      <Modal
        isOpen={showOverlapModal}
        title="⚠️ Time Conflict Detected"
        onConfirm={handleConfirmOverlap}
        onCancel={handleCancelOverlap}
      >
        <div className="space-y-3">
          <p>
            The event <strong className="text-gray-800">"{pendingEvent?.label}"</strong> overlaps with the following {overlappingEvents.length > 1 ? 'events' : 'event'}:
          </p>
          <ul className="list-disc list-inside space-y-1 bg-yellow-50 border border-yellow-200 rounded p-3">
            {overlappingEvents.map((event) => {
              const endTime = event.startMinutes + (event.duration || 30);
              return (
                <li key={event.id} className="text-sm">
                  <strong>{event.label}</strong> ({formatTime(event.startMinutes)} - {formatTime(endTime)})
                </li>
              );
            })}
          </ul>
          <p className="text-sm">
            Do you want to schedule this event anyway?
          </p>
        </div>
      </Modal>

      {/* ========================================
          EVENT TEMPLATE EDITOR MODAL
      ======================================== */}
      <EventEditorModal
        isOpen={showEventEditor}
        editingEvent={editingTemplate}
        onSave={handleSaveTemplate}
        onCancel={handleCancelTemplate}
      />
    </DndContext>
  );
}

export default App;


