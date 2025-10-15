/**
 * TIME-BLOCKING CALENDAR APP
 * 
 * TESTING INSTRUCTIONS:
 * 1. Create Type: Click "Types" button → Add new type → See it in dropdown
 * 2. Edit Type: In Types modal, click edit icon → Change name/color → Save
 * 3. Delete Type: In Types modal, click delete (trash icon) → See warning if events reference it → Confirm
 * 4. Create Event: Click + → Fill form → Select type → Create
 * 5. Edit Event: Click event card → Change type → Save
 * 6. Delete Event: Click trash icon on event card → Confirm → Event removed
 * 7. Test Type Deletion Warning: Create event with type → Try to delete that type → See count warning
 * 
 * CONSOLE LOGS TO WATCH:
 * - Type CRUD: "➕ Created type", "✏️ Updated type", "🗑️ Deleted type - affected events: N"
 * - Event Delete: "🗑️ Deleted event: {id} name: {name}"
 * - All existing drag/drop/zoom logs
 */

import React, { useState, useSyncExternalStore } from 'react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  useDndMonitor,
} from '@dnd-kit/core';
import { format } from 'date-fns';
import { dateStore } from './state/dateStore';
import DateNav from './components/DateNav';

// ========================================
// PHASE 1 DIAGNOSTICS - Duplicate Draggable Detection
// ========================================
// Module-level map to track how many ScheduledItems render per ID
const renderCountsPerFrame = new Map();
let frameCheckScheduled = false;
let isCurrentlyResizing = false; // Track if we're in a resize state

function setResizingState(resizing) {
  isCurrentlyResizing = resizing;
}

function trackScheduledItemRender(itemId) {
  renderCountsPerFrame.set(itemId, (renderCountsPerFrame.get(itemId) || 0) + 1);
  
  if (!frameCheckScheduled) {
    frameCheckScheduled = true;
    requestAnimationFrame(() => {
      // Only warn about duplicates during active resize (when it matters for dnd-kit)
      // Multiple renders after resize cleanup are normal React behavior
      if (isCurrentlyResizing) {
        const duplicates = Array.from(renderCountsPerFrame.entries()).filter(([id, count]) => count > 1);
        if (duplicates.length > 0) {
          console.error('🚨 DUPLICATE DRAGGABLES DETECTED DURING RESIZE:', duplicates.map(([id, count]) => 
            `ID ${id} rendered ${count} times - this can confuse dnd-kit`
          ).join(', '));
        }
      }
      renderCountsPerFrame.clear();
      frameCheckScheduled = false;
    });
  }
}

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
// RESIZE UTILITIES
// ========================================

// Clamp minutes to calendar day bounds (0 to total calendar minutes)
function clampMinutesToDay(m) {
  const total = (END_HOUR - START_HOUR) * 60;
  return Math.max(0, Math.min(m, total));
}

// Clamp duration to minimum one slot
function clampDuration(d) {
  return Math.max(MINUTES_PER_SLOT, d);
}

// Given top (start) and bottom (end) minute marks, return snapped start/duration
function computeSnappedRange(startMin, endMin) {
  const snappedStart = snapToIncrement(startMin);
  const snappedEnd   = snapToIncrement(endMin);
  const start = Math.min(snappedStart, snappedEnd);
  const end   = Math.max(snappedStart, snappedEnd);
  const duration = clampDuration(end - start);
  return { start, duration };
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
// COMPONENT: TypeManagerModal (manage event types)
// ========================================

function TypeManagerModal({ isOpen, types, onSave, onDelete, onClose, eventTemplates }) {
  const [editingType, setEditingType] = React.useState(null);
  const [typeName, setTypeName] = React.useState('');
  const [typeColor, setTypeColor] = React.useState('bg-gray-500');

  const handleStartEdit = (type) => {
    setEditingType(type);
    setTypeName(type.name);
    setTypeColor(type.color || 'bg-gray-500');
  };

  const handleCancelEdit = () => {
    setEditingType(null);
    setTypeName('');
    setTypeColor('bg-gray-500');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!typeName.trim()) {
      alert('Please enter a type name');
      return;
    }

    // Check for duplicate names
    const duplicate = types.find(
      t => t.name.toLowerCase() === typeName.trim().toLowerCase() && t.id !== editingType?.id
    );
    
    if (duplicate) {
      alert(`A type named "${typeName.trim()}" already exists. Please choose a different name.`);
      return;
    }

    onSave({
      id: editingType?.id || `type-${Date.now()}`,
      name: typeName.trim(),
      color: typeColor,
    });

    handleCancelEdit();
  };

  const handleDelete = (type) => {
    // Count how many events reference this type
    const affectedEvents = eventTemplates.filter(e => e.typeId === type.id);
    
    const confirmMessage = affectedEvents.length > 0
      ? `Deleting "${type.name}" will affect ${affectedEvents.length} event(s). They will be set to "No Type". Continue?`
      : `Delete type "${type.name}"?`;
    
    if (window.confirm(confirmMessage)) {
      onDelete(type.id, affectedEvents.length);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full mx-4 z-10 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Manage Types</h2>
        
        {/* Type Creation/Edit Form */}
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {editingType ? 'Edit Type' : 'Add New Type'}
          </h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Type Name</label>
              <input
                type="text"
                value={typeName}
                onChange={(e) => setTypeName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                placeholder="e.g., Work, Personal"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color (optional)</label>
              <select
                value={typeColor}
                onChange={(e) => setTypeColor(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {COLOR_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {editingType ? 'Save' : 'Add'}
            </button>
            {editingType && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Types List */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Existing Types ({types.length})</h3>
          {types.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No types yet. Add one above!</p>
          ) : (
            types.map(type => {
              const eventsUsingType = eventTemplates.filter(e => e.typeId === type.id).length;
              return (
                <div
                  key={type.id}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${type.color || 'bg-gray-400'}`}></div>
                    <span className="font-medium text-gray-800">{type.name}</span>
                    <span className="text-xs text-gray-500">
                      ({eventsUsingType} event{eventsUsingType !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleStartEdit(type)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      title="Edit type"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(type)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      title="Delete type"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// COMPONENT: EventEditorModal (create/edit event templates)
// ========================================

function EventEditorModal({ isOpen, editingEvent, onSave, onCancel, types }) {
  const [name, setName] = React.useState('');
  const [duration, setDuration] = React.useState(30);
  const [color, setColor] = React.useState('bg-blue-500');
  const [typeId, setTypeId] = React.useState('');

  // Populate form when editing
  React.useEffect(() => {
    if (editingEvent) {
      setName(editingEvent.name || '');
      setDuration(editingEvent.duration || 30);
      setColor(editingEvent.color || 'bg-blue-500');
      setTypeId(editingEvent.typeId || '');
    } else {
      // Reset form for new event
      setName('');
      setDuration(30);
      setColor('bg-blue-500');
      setTypeId('');
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
      typeId: typeId || null,
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

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type (optional)
            </label>
            <select
              value={typeId}
              onChange={(e) => setTypeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No Type</option>
              {types.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {types.length === 0 && (
              <p className="text-xs text-gray-500 mt-1">
                No types available. Click "Types" button to create one.
              </p>
            )}
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

function TaskBlock({ task, onClick, onDelete, types = [] }) {
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
  const typeName = task.typeId && types && types.length > 0
    ? types.find(t => t.id === task.typeId)?.name 
    : null;
  
  // Debug: Log if type lookup fails
  if (task.typeId && (!types || types.length === 0)) {
    console.warn('⚠️ TaskBlock: types array is empty/undefined for event:', task.name || task.label);
  }
  if (task.typeId && types && types.length > 0 && !typeName) {
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

// ========================================
// COMPONENT: DraggableTaskBlock (wrapper with dnd-kit drag logic)
// ========================================

function DraggableTaskBlock({ task, onEdit, onDelete, types }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `template-${task.id}`,
    data: {
      type: 'template',
      task,
    },
  });

  const handleEdit = () => {
    if (onEdit && !isDragging) {
      onEdit(task);
    }
  };

  const handleDelete = () => {
    if (onDelete && !isDragging) {
      onDelete(task);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <TaskBlock 
        task={task} 
        onClick={handleEdit} 
        onDelete={handleDelete}
        types={types}
      />
    </div>
  );
}

// Import useDraggable
import { useDraggable, useDroppable } from '@dnd-kit/core';

// ========================================
// COMPONENT: ScheduledItemPreview (non-interactive preview during resize)
// PHASE 2 FIX: Separate component that doesn't call useDraggable
// ========================================

function ScheduledItemPreview({ item, pixelsPerSlot }) {
  const topPosition = minutesToPixels(item.startMinutes, pixelsPerSlot);
  const duration = item.duration || 30;
  const height = minutesToPixels(duration, pixelsPerSlot);
  const endMinutes = item.startMinutes + duration;

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
          {formatTime(item.startMinutes)} - {formatTime(endMinutes)}
        </div>
      </div>
      {duration > 30 && (
        <div className="text-xs opacity-75 text-right">
          {duration} min
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

// ========================================
// COMPONENT: ScheduledItem (task placed in calendar)
// ========================================

function ScheduledItem({ item, pixelsPerSlot, onResizeStart, isBeingResized = false, isResizing = false }) {
  // PHASE 1 DIAGNOSTIC: Track this render
  trackScheduledItemRender(item.id);

  // ========================================
  // DRAGGABLE SETUP - Strict gating (disabled + conditional listeners)
  // ========================================
  
  // CRITICAL: allowDrag considers BOTH item-specific AND global resize state
  const allowDrag = !isBeingResized && !isResizing;
  
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: item.id,
    data: {
      type: 'scheduled',
      item,
    },
    disabled: !allowDrag, // Hard stop: disabled when ANY resize is active
  });

  // StackOverflow pattern: Only spread listeners when drag is allowed
  const listenersOnState = allowDrag ? listeners : undefined;

  // DEBUG: Comprehensive logging
  React.useEffect(() => {
    const willApplyTransform = isDragging && allowDrag && !!transform;
    
    // WARNING: isDragging should be false when ANY resize is active
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
  
  // Apply transform for dragging
  // CRITICAL: Only apply transform when actually dragging AND drag is allowed
  const style = {
    top: `${topPosition}px`,
    height: `${height}px`,
    transform: (isDragging && allowDrag && transform) 
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)` 
      : undefined, // Gate transform to prevent animation during resize
    opacity: (isDragging && allowDrag) ? 0.3 : 1,
  };

  // Calculate end time for display
  const endMinutes = item.startMinutes + duration;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listenersOnState}  // StackOverflow pattern: only spread when allowDrag=true
      className={`absolute left-20 right-2 ${item.color} text-white px-3 py-2 rounded shadow-lg ${allowDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} z-10 flex flex-col justify-between overflow-visible`}
      style={style}
      data-event-id={item.id}
      data-allow-drag={allowDrag}
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

function CalendarGrid({ scheduledItems, ghostPosition, pixelsPerSlot, onZoom, calendarDomRef, resizeDraft, onResizeStart, isResizing }) {
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

// ========================================
// DND EVENT MONITOR - Must be child of DndContext
// ========================================

function DndEventMonitor({ isResizing, resizeTarget, resizeDraft }) {
  useDndMonitor({
    onDragStart(event) {
      if (isResizing) {
        console.error('🚨 CRITICAL: DnD sensor activated DURING resize! Sensors should be INERT.');
      }
    },
  });
  
  return null; // This component only monitors, doesn't render anything
}

// ========================================
// DATE STORE HOOK
// ========================================

// Subscribe to date store (tiny external-store pattern)
function useDateStore() {
  const snapshot = useSyncExternalStore(
    dateStore.subscribe,
    dateStore.get,
    dateStore.get
  );
  return { ...snapshot, ...dateStore.actions, utils: dateStore.utils };
}

// ========================================
// MAIN APP COMPONENT
// ========================================

function App() {
  // ========================================
  // DATE STORE
  // ========================================
  
  const { selectedDate, weekStartsOn } = useDateStore();
  const { nextDay, prevDay, setDate, goToday } = dateStore.actions;
  const dateKey = dateStore.utils.getDateKey();
  
  // ========================================
  // STATE INITIALIZATION WITH DEMO DATA
  // ========================================
  
  // State: Types (categories for events) - seeded with demo data
  const [types, setTypes] = useState([
    { id: 'type-work', name: 'Work', color: 'bg-blue-500' },
    { id: 'type-personal', name: 'Personal', color: 'bg-green-500' },
  ]);
  
  // State: Custom task templates (user-created event types) - seeded with demo data
  const [taskTemplates, setTaskTemplates] = useState([
    { 
      id: 'template-demo1', 
      name: 'Team Meeting', 
      duration: 30, 
      color: 'bg-purple-500', 
      typeId: 'type-work' 
    },
    { 
      id: 'template-demo2', 
      name: 'Lunch Break', 
      duration: 45, 
      color: 'bg-green-500', 
      typeId: 'type-personal' 
    },
  ]);
  
  // State: scheduled items in the calendar
  const [scheduledItems, setScheduledItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [nextId, setNextId] = useState(1);

  // State: Track ghost/shadow preview position while dragging over calendar
  const [ghostPosition, setGhostPosition] = useState(null);
  
  // State: Zoom level (pixels per 15-minute slot)
  const [pixelsPerSlot, setPixelsPerSlot] = useState(DEFAULT_PIXELS_PER_SLOT);
  
  // State: Resizing
  const [isResizing, setIsResizing] = useState(false);
  const [resizeTarget, setResizeTarget] = useState(null); // { id, edge: 'start'|'end', originalStart, originalDuration }
  const [resizeDraft, setResizeDraft] = useState(null);   // event preview while resizing
  
  // State: Modal and overlap handling
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [pendingEvent, setPendingEvent] = useState(null);
  const [overlappingEvents, setOverlappingEvents] = useState([]);
  
  // State: Event editor modal
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // State: Types manager modal
  const [showTypesManager, setShowTypesManager] = useState(false);

  // Ref: Calendar DOM element for resize calculations
  const calendarDomRef = React.useRef(null);
  
  // Ref: Track if window listeners are attached (prevent duplicate attachment)
  const resizeListenersAttached = React.useRef(false);

  // Update global resize state for duplicate detection
  React.useEffect(() => {
    setResizingState(isResizing);
  }, [isResizing]);

  // MOVED TO DndEventMonitor COMPONENT (must be child of DndContext)

  // ========================================
  // SENSORS - Memoized to prevent "useEffect dependency array changed size" warning
  // ========================================
  // Determine if we should use inert sensors
  const useInert = isResizing || !!resizeDraft || !!resizeTarget;
  
  // Create sensor based on current state (always returns array of same structure)
  // When inert: disable the sensor internally rather than changing array size
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: useInert 
        ? { distance: 999999 } // Effectively disabled (unreachable threshold)
        : { distance: 8 },
    })
  );
  

  // ========================================
  // ZOOM HANDLER
  // ========================================
  const handleZoom = React.useCallback((newPixelsPerSlot) => {
    setPixelsPerSlot(newPixelsPerSlot);
  }, []);

  // ========================================
  // TYPE MANAGEMENT HANDLERS
  // ========================================
  
  // Open types manager modal
  const handleOpenTypesManager = () => {
    setShowTypesManager(true);
  };
  
  // Save type (create or update)
  const handleSaveType = (typeData) => {
    const existingType = types.find(t => t.id === typeData.id);
    
    if (existingType) {
      // Update existing type
      setTypes(prev => prev.map(t => t.id === typeData.id ? typeData : t));
    } else {
      // Create new type
      setTypes(prev => [...prev, typeData]);
    }
  };
  
  // Delete type
  const handleDeleteType = (typeId) => {
    // Remove type from types list
    setTypes(prev => prev.filter(t => t.id !== typeId));
    
    // Set typeId to null for all events that referenced this type
    setTaskTemplates(prev => 
      prev.map(t => t.typeId === typeId ? { ...t, typeId: null } : t)
    );
    
    // Also update any scheduled items (if they store typeId)
    setScheduledItems(prev =>
      prev.map(item => item.typeId === typeId ? { ...item, typeId: null } : item)
    );
  };

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
    } else {
      // Create new template
      setTaskTemplates(prev => [...prev, templateData]);
    }
    
    setShowEventEditor(false);
    setEditingTemplate(null);
  };
  
  // Delete event template
  const handleDeleteTemplate = (template) => {
    if (window.confirm(`Delete "${template.name}"? Scheduled instances will remain on the calendar.`)) {
      setTaskTemplates(prev => prev.filter(t => t.id !== template.id));
      
      // If this was being edited, close the editor
      if (editingTemplate?.id === template.id) {
        setEditingTemplate(null);
        setShowEventEditor(false);
      }
    }
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
    
    // CRITICAL: Also clear resize state if this was from a resize operation
    setIsResizing(false);
    setResizeTarget(null);
    setResizeDraft(null);
  }, [pendingEvent, scheduledItems, isResizing, resizeTarget, resizeDraft]);
  
  // User cancels - discard the pending event
  const handleCancelOverlap = React.useCallback(() => {
    // Close modal and clear pending state
    setShowOverlapModal(false);
    setPendingEvent(null);
    setOverlappingEvents([]);
    
    // CRITICAL: Also clear resize state if this was from a resize operation
    setIsResizing(false);
    setResizeTarget(null);
    setResizeDraft(null);
  }, [pendingEvent, isResizing, resizeTarget, resizeDraft]);

  // ========================================
  // RESIZE HANDLERS
  // ========================================
  
  const handleResizeStart = React.useCallback((item, edge, clientY) => {
    // CRITICAL FIX: Cancel any active drag that dnd-kit might have started
    // The sensor can capture mousedown before stopPropagation, causing isDragging=true
    if (activeId) {
      setActiveId(null);
    }
    
    // PHASE 2: Set resize state (triggers INERT sensors on next render)
    setIsResizing(true);
    setResizeTarget({
      id: item.id,
      edge, // 'start' or 'end'
      originalStart: item.startMinutes,
      originalDuration: item.duration || 30,
      startClientY: clientY,
    });
    // initial draft = current item
    setResizeDraft({ ...item });
  }, [isResizing, activeId]);

  const handleResizeMove = React.useCallback((clientY) => {
    if (!isResizing || !resizeTarget || !calendarDomRef.current) return;

    const rect = calendarDomRef.current.getBoundingClientRect();
    const offsetY = clientY - rect.top; // pixels from top of calendar
    const minuteAtPointer = clampMinutesToDay(pixelsToMinutes(offsetY, pixelsPerSlot));

    const { edge, originalStart, originalDuration } = resizeTarget;
    const originalEnd = originalStart + originalDuration;

    let newStart = originalStart;
    let newEnd   = originalEnd;

    if (edge === 'end') {
      // Dragging bottom edge - change end time
      newEnd = clampMinutesToDay(minuteAtPointer);
    } else {
      // Dragging top edge - change start time
      newStart = clampMinutesToDay(minuteAtPointer);
    }

    // Live preview - unsnapped for smooth feedback
    // Clamp only, no snap yet (snap happens on release)
    newStart = clampMinutesToDay(newStart);
    newEnd = clampMinutesToDay(newEnd);

    const start = Math.min(newStart, newEnd);
    const duration = Math.max(MINUTES_PER_SLOT / 2, newEnd - newStart); // Allow smooth preview, snap later

    setResizeDraft(prev => prev ? { ...prev, startMinutes: start, duration } : null);
  }, [isResizing, resizeTarget, pixelsPerSlot, calendarDomRef]);

  const handleResizeEnd = React.useCallback(() => {
    if (!isResizing || !resizeTarget || !resizeDraft) {
      setIsResizing(false);
      setResizeTarget(null);
      setResizeDraft(null);
      return;
    }

    // ========================================
    // SNAP TO 15-MINUTE GRID ON RELEASE
    // ========================================
    const draftStart = resizeDraft.startMinutes;
    const draftEnd   = draftStart + resizeDraft.duration;

    const snappedStart = snapToIncrement(draftStart);
    const snappedEnd   = snapToIncrement(draftEnd);

    const start = clampMinutesToDay(Math.min(snappedStart, snappedEnd));
    const duration = clampDuration(Math.abs(snappedEnd - snappedStart));

    const updated = { ...resizeDraft, startMinutes: start, duration };

    // Overlap check excluding itself
    const others = scheduledItems.filter(e => e.id !== updated.id);
    const overlaps = checkOverlap(updated, others);

    if (overlaps.length > 0) {
      setPendingEvent(updated);
      setOverlappingEvents(overlaps);
      setShowOverlapModal(true);
    } else {
      setScheduledItems(prev =>
        prev.map(it => it.id === updated.id ? updated : it)
      );
    }

    // Cleanup
    setIsResizing(false);
    setResizeTarget(null);
    setResizeDraft(null);
  }, [isResizing, resizeTarget, resizeDraft, scheduledItems]);

  // Attach window listeners for resize mouse events
  React.useEffect(() => {
    function onMove(e) {
      handleResizeMove(e.clientY);
    }
    function onUp() {
      handleResizeEnd();
      resizeListenersAttached.current = false;
    }
    
    if (isResizing && !resizeListenersAttached.current) {
      resizeListenersAttached.current = true;
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        resizeListenersAttached.current = false;
      };
    } else if (!isResizing && resizeListenersAttached.current) {
      // Safety: ensure listeners are removed if isResizing becomes false
      resizeListenersAttached.current = false;
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // ========================================
  // DRAG & DROP HANDLERS
  // ========================================

  function handleDragStart(event) {
    // ========================================
    // IGNORE DRAG START IF CURRENTLY RESIZING
    // ========================================
    if (isResizing) {
      return;
    }

    const activeData = event.active.data.current;
    
    // ========================================
    // SAFETY CHECK - Ensure we have valid drag data
    // ========================================
    if (!activeData) {
      console.error('❌ DRAG START: No active data found');
      return;
    }
    
    setActiveId(event.active.id);
    setGhostPosition(null); // Clear any previous ghost
  }

  function handleDragMove(event) {
    // ========================================
    // IGNORE DRAG MOVE IF CURRENTLY RESIZING
    // ========================================
    if (isResizing) return;

    const { active, over, delta } = event;

    const activeData = active.data.current;

    if (!activeData) {
      setGhostPosition(null);
      return;
    }

    // For template drags, require being over the calendar
    // For scheduled drags, be resilient to missing 'over' (collision detection can miss after resize)
    if (activeData.type === 'template') {
      if (!over || over.id !== 'calendar') {
        setGhostPosition(null);
        return;
      }
    }
    // For scheduled items, continue even if over is null (use delta.y from current position)

    // Get calendar element to calculate position
    // FIX: Null-safe lookup chain - over can be undefined after resize
    const calendarElement = over?.node?.current || calendarDomRef.current || document.querySelector('[data-droppable-id="calendar"]');
    if (!calendarElement) {
      console.warn('⚠️ Calendar element not found - all three lookups failed:', {
        hasOver: !!over,
        hasOverNode: !!over?.node,
        hasCalendarDomRef: !!calendarDomRef.current,
      });
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
      // RESILIENT: Works even if over is null (collision detection miss)
      // ========================================
      const item = activeData.item;
      
      // Calculate new position based on drag delta - using dynamic slot height
      // This doesn't require 'over' to be the calendar - we use delta.y from current position
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
  }

  function handleDragEnd(event) {
    // ========================================
    // IGNORE DRAG END IF CURRENTLY RESIZING
    // ========================================
    if (isResizing) {
      setActiveId(null);
      return;
    }

    const { active, over, delta } = event;
    
    setActiveId(null);

    const activeData = active.data.current;

    // FIX: Only require 'over' for template drags (new placements)
    // For scheduled drags (repositioning), allow fallback calculation even if over is null
    if (activeData?.type === 'template') {
      // Templates must be dropped on calendar
      if (over?.id !== 'calendar') {
        setGhostPosition(null);
        return;
      }
    }
    // For scheduled items, continue even if over is missing (resilient to post-resize collision detection issues)

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
        typeId: task.typeId || null, // Preserve type association
      };

      // ========================================
      // CHECK FOR OVERLAPS
      // ========================================
      const overlaps = checkOverlap(newItem, scheduledItems);
      
      if (overlaps.length > 0) {
        // Overlap detected - show modal for confirmation
        setPendingEvent(newItem);
        setOverlappingEvents(overlaps);
        setShowOverlapModal(true);
        setGhostPosition(null);
      } else {
        // No overlap - add event directly
        setScheduledItems((prev) => [...prev, newItem]);
        setNextId((prev) => prev + 1);
        setGhostPosition(null);
      }
    } else if (activeData.type === 'scheduled') {
      // ========================================
      // DRAGGING WITHIN CALENDAR - REPOSITION EXISTING EVENT
      // RESILIENT: Use ghost position if available, otherwise calculate from delta
      // ========================================
      
      const item = activeData.item;
      let finalMinutes;
      
      if (ghostPosition) {
        // Use ghost position (normal path)
        finalMinutes = ghostPosition.startMinutes;
      } else {
        // Fallback: calculate from delta.y if ghost missing (post-resize collision detection miss)
        const currentPixels = minutesToPixels(item.startMinutes, pixelsPerSlot);
        const newPixels = currentPixels + delta.y;
        const newMinutes = pixelsToMinutes(newPixels, pixelsPerSlot);
        const snappedMinutes = snapToIncrement(newMinutes);
        const totalMinutes = (END_HOUR - START_HOUR) * 60;
        finalMinutes = Math.max(0, Math.min(snappedMinutes, totalMinutes - MINUTES_PER_SLOT));
      }

      // Create updated event object
      const updatedItem = { ...item, startMinutes: finalMinutes };
      
      // ========================================
      // CHECK FOR OVERLAPS (excluding the event being moved)
      // ========================================
      const otherEvents = scheduledItems.filter(e => e.id !== item.id);
      const overlaps = checkOverlap(updatedItem, otherEvents);
      
      if (overlaps.length > 0) {
        // Overlap detected - show modal for confirmation
        setPendingEvent(updatedItem);
        setOverlappingEvents(overlaps);
        setShowOverlapModal(true);
        setGhostPosition(null);
      } else {
        // No overlap - update position directly
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

  // ========================================
  // GET ACTIVE ITEM FOR DRAG OVERLAY
  // Safely lookup the item being dragged, with fallback for undefined results
  // ========================================
  const activeItem = React.useMemo(() => {
    if (!activeId) return null;
    
    if (activeId.startsWith('template-')) {
      const template = taskTemplates.find((t) => `template-${t.id}` === activeId);
      if (!template) {
        console.warn('⚠️ DragOverlay: Template not found for activeId:', activeId);
      }
      return template || null;
    } else {
      const scheduledItem = scheduledItems.find((item) => item.id === activeId);
      if (!scheduledItem) {
        console.warn('⚠️ DragOverlay: Scheduled item not found for activeId:', activeId);
      }
      return scheduledItem || null;
    }
  }, [activeId, taskTemplates, scheduledItems]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {/* PHASE 1 DIAGNOSTIC: Monitor must be child of DndContext */}
      <DndEventMonitor 
        isResizing={isResizing}
      />
      
      <div className="flex h-screen bg-gray-50">
        {/* ========================================
            LEFT PANEL: Custom Event Templates
        ======================================== */}
        <div className="w-1/3 bg-gray-100 p-6 border-r border-gray-300 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">TimeBlocks</h2>
            <div className="flex gap-2">
              {/* Types Manager Button */}
              <button
                onClick={handleOpenTypesManager}
                className="bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700 transition-colors shadow text-sm font-medium"
                title="Manage Types"
              >
                Types
              </button>
              {/* Create Event Button */}
              <button
                onClick={handleCreateTemplate}
                className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg text-xl font-bold"
                title="Create New Event Template"
              >
                +
              </button>
            </div>
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
                  onDelete={handleDeleteTemplate}
                  types={types}
                />
            ))}
          </div>
          )}
          
          {/* Instructions */}
          <div className="mt-8 p-4 bg-white rounded-lg shadow text-sm text-gray-600">
            <p className="font-semibold mb-2">How to use:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Click <strong>Types</strong> to manage event categories</li>
              <li>Click <strong>+</strong> to create event templates</li>
              <li>Click template to edit, trash icon to delete</li>
              <li>Drag templates to schedule on calendar</li>
              <li>Ctrl+Scroll to zoom calendar</li>
            </ul>
          </div>
        </div>

        {/* ========================================
            RIGHT PANEL: Calendar
        ======================================== */}
        <div className="w-2/3 overflow-y-auto" id="calendar-container">
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              {/* Date Navigation */}
              <div className="flex items-center gap-4">
                <DateNav
                  value={selectedDate}
                  onChange={setDate}
                  onPrev={prevDay}
                  onNext={nextDay}
                  onToday={goToday}
                />
              </div>
              
              {/* Zoom Info */}
              <span className="text-sm font-normal text-gray-600">
                Zoom: {((pixelsPerSlot / DEFAULT_PIXELS_PER_SLOT) * 100).toFixed(0)}% 
                <span className="ml-2 text-xs text-gray-500">(Ctrl+Scroll to zoom)</span>
              </span>
            </div>
            <CalendarGrid 
              scheduledItems={scheduledItems} 
              ghostPosition={ghostPosition} 
              pixelsPerSlot={pixelsPerSlot}
              onZoom={handleZoom}
              calendarDomRef={calendarDomRef}
              resizeDraft={isResizing ? resizeDraft : null}
              onResizeStart={(item, edge, clientY) => handleResizeStart(item, edge, clientY)}
              isResizing={isResizing}
            />
          </div>
        </div>
      </div>

      {/* ========================================
          DRAG OVERLAY: Shows item while dragging
          Safely renders with fallback if activeItem is undefined
      ======================================== */}
      <DragOverlay>
        {activeItem ? (
          <div className="opacity-90">
            <TaskBlock
              task={
                activeId?.startsWith('template-')
                  ? { 
                      ...activeItem, 
                      label: activeItem.name || activeItem.label,
                      typeId: activeItem.typeId || null,
                    }
                  : {
                      name: activeItem.label || activeItem.name,
                      label: activeItem.label || activeItem.name,
                      color: activeItem.color || 'bg-gray-500',
                      duration: activeItem.duration || 30,
                      typeId: activeItem.typeId || null,
                    }
              }
              types={types}
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
        types={types}
      />

      {/* ========================================
          TYPES MANAGER MODAL
      ======================================== */}
      <TypeManagerModal
        isOpen={showTypesManager}
        types={types}
        onSave={handleSaveType}
        onDelete={handleDeleteType}
        onClose={() => setShowTypesManager(false)}
        eventTemplates={taskTemplates}
      />
    </DndContext>
  );
}

export default App;


