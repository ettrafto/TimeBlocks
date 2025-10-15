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

// Task templates available for dragging
const TASK_TEMPLATES = [
  { id: 'workout', label: 'Workout', color: 'bg-blue-500', duration: 60 },
  { id: 'meeting', label: 'Meeting', color: 'bg-purple-500', duration: 30 },
  { id: 'lunch', label: 'Lunch', color: 'bg-green-500', duration: 45 },
  { id: 'study', label: 'Study', color: 'bg-orange-500', duration: 90 },
];

// Calendar configuration
const START_HOUR = 8; // 8 AM
const END_HOUR = 17; // 5 PM
const MINUTES_PER_SLOT = 15;
const PIXELS_PER_HOUR = 80; // Height in pixels for one hour
const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Convert pixels to time (minutes from start)
function pixelsToMinutes(pixels) {
  return Math.round(pixels / PIXELS_PER_MINUTE);
}

// Convert time (minutes from start) to pixels
function minutesToPixels(minutes) {
  return minutes * PIXELS_PER_MINUTE;
}

// Snap minutes to nearest 15-minute increment
function snapToIncrement(minutes) {
  return Math.round(minutes / MINUTES_PER_SLOT) * MINUTES_PER_SLOT;
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
// COMPONENT: TaskBlock (draggable task in left panel)
// ========================================

function TaskBlock({ task }) {
  return (
    <div
      className={`${task.color} text-white px-4 py-3 rounded-lg shadow-md cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity`}
    >
      <div className="font-semibold">{task.label}</div>
      {task.duration && (
        <div className="text-xs opacity-80 mt-1">{task.duration} minutes</div>
      )}
    </div>
  );
}

// ========================================
// COMPONENT: DraggableTaskBlock (wrapper with dnd-kit drag logic)
// ========================================

function DraggableTaskBlock({ task }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${task.id}`,
    data: {
      type: 'template',
      task,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <TaskBlock task={task} />
    </div>
  );
}

// Import useDraggable
import { useDraggable, useDroppable } from '@dnd-kit/core';

// ========================================
// COMPONENT: ScheduledItem (task placed in calendar)
// ========================================

function ScheduledItem({ item }) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: item.id,
    data: {
      type: 'scheduled',
      item,
    },
  });

  // Calculate position and height based on duration
  const topPosition = minutesToPixels(item.startMinutes);
  const duration = item.duration || 30; // Default to 30 minutes if not specified
  const height = minutesToPixels(duration);
  
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

function GhostEvent({ ghostPosition }) {
  if (!ghostPosition) return null;

  const { startMinutes, task } = ghostPosition;
  const topPosition = minutesToPixels(startMinutes);
  
  // Calculate height based on task duration
  const duration = task.duration || 30; // Default 30 minutes
  const height = minutesToPixels(duration);
  
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

function CalendarGrid({ scheduledItems, ghostPosition }) {
  const timeSlots = generateTimeSlots();
  const calendarHeight = (END_HOUR - START_HOUR) * PIXELS_PER_HOUR;

  // Make the entire calendar a droppable zone
  const { setNodeRef } = useDroppable({
    id: 'calendar',

  });

  return (
    <div 
      ref={setNodeRef}
      data-droppable-id="calendar"
      className="relative bg-white border-l border-gray-300"
      style={{ height: `${calendarHeight}px` }}
    >
      {/* Time labels and grid lines */}
      {timeSlots.map((slot, index) => {
        const topPosition = minutesToPixels(slot.minutes);
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
              <div className="absolute left-2 -top-3 text-xs text-gray-600 font-medium">
                {slot.time}
              </div>
            )}
          </div>
        );
      })}

      {/* Scheduled items */}
      {scheduledItems.map((item) => (
        <ScheduledItem key={item.id} item={item} />
      ))}

      {/* Ghost/shadow preview - shows where dragged item will land */}
      <GhostEvent ghostPosition={ghostPosition} />
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

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevents accidental drags
      },
    })
  );

  // ========================================
  // DRAG & DROP HANDLERS
  // ========================================

  function handleDragStart(event) {
    const activeData = event.active.data.current;
    console.log('🚀 DRAG START:', {
      id: event.active.id,
      type: activeData?.type,
      label: activeData?.task?.label || activeData?.item?.label,
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
      
      // Convert to minutes and snap to 15-min increment
      const minutes = pixelsToMinutes(offsetY);
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
      
      // Calculate new position based on drag delta
      const currentPixels = minutesToPixels(item.startMinutes);
      const newPixels = currentPixels + delta.y;
      const newMinutes = pixelsToMinutes(newPixels);
      const snappedMinutes = snapToIncrement(newMinutes);
      
      // Clamp to calendar bounds
      const totalMinutes = (END_HOUR - START_HOUR) * 60;
      finalMinutes = Math.max(0, Math.min(snappedMinutes, totalMinutes - MINUTES_PER_SLOT));
      
      // Create a task-like object from the scheduled item
      taskInfo = {
        label: item.label,
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
    const ghostHeight = minutesToPixels(taskDuration);
    console.log('👻 Ghost preview:', {
      time: formatTime(finalMinutes),
      duration: `${taskDuration} min`,
      height: `${ghostHeight}px`,
      position: `${minutesToPixels(finalMinutes)}px from top`,
      type: activeData.type,
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
        label: task.label,
        color: task.color,
        startMinutes: finalMinutes,
        duration: duration,
      };

      console.log(`✅ Placed "${task.label}" at ${formatTime(finalMinutes)} (${duration} min duration, height: ${minutesToPixels(duration)}px)`);

      setScheduledItems((prev) => [...prev, newItem]);
      setNextId((prev) => prev + 1);
      setGhostPosition(null); // Clear ghost after successful drop
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

      console.log(`✅ Moved "${item.label}" to ${formatTime(finalMinutes)} (duration: ${item.duration || 30} min preserved)`);

      setScheduledItems((prev) =>
        prev.map((schedItem) =>
          schedItem.id === item.id
            ? { ...schedItem, startMinutes: finalMinutes } // Preserve all properties including duration
            : schedItem
        )
      );
      
      setGhostPosition(null); // Clear ghost after repositioning
    }
  }

  // Get the active item for the drag overlay
  const activeItem = activeId
    ? activeId.startsWith('template-')
      ? TASK_TEMPLATES.find((t) => `template-${t.id}` === activeId)
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
            LEFT PANEL: Task Templates
        ======================================== */}
        <div className="w-1/3 bg-gray-100 p-6 border-r border-gray-300 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Task Blocks</h2>
          <div className="space-y-4">
            {TASK_TEMPLATES.map((task) => (
              <DraggableTaskBlock key={task.id} task={task} />
            ))}
          </div>
          
          {/* Instructions */}
          <div className="mt-8 p-4 bg-white rounded-lg shadow text-sm text-gray-600">
            <p className="font-semibold mb-2">Instructions:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Drag tasks to the calendar</li>
              <li>Snaps to 15-min increments</li>
              <li>Rearrange within calendar</li>
              <li>Tasks can be reused</li>
            </ul>
          </div>
        </div>

        {/* ========================================
            RIGHT PANEL: Calendar
        ======================================== */}
        <div className="w-2/3 overflow-y-auto" id="calendar-container">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              Daily Schedule ({START_HOUR}:00 AM - {END_HOUR > 12 ? END_HOUR - 12 : END_HOUR}:00 PM)
            </h2>
            <CalendarGrid scheduledItems={scheduledItems} ghostPosition={ghostPosition} />
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
                      label: activeItem.label,
                      color: activeItem.color,
                    }
              }
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;


