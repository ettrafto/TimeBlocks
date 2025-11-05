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

import React, { useState, useSyncExternalStore, useMemo } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  useDndMonitor,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { format, formatISO } from 'date-fns';
import { dateStore } from './state/dateStore';
import { eventsStore } from './state/eventsStoreWithBackend';
import { uiStore } from './state/uiStore';
import { layoutStore } from './state/layoutStore';
import { MOVE_POLICY, CONFLICT_BEHAVIOR } from './config/policies';
import DateStrip from './components/DateStrip';
import MultiDayCalendar from './components/MultiDayCalendar';
import TopNav from './components/TopNav';
import CreatePage from './pages/CreatePage';
import DiagnosticsPage from './pages/DiagnosticsPage';
import { computeEventLayout } from './utils/overlap';
import BackendTest from './pages/BackendTest';
import { eventTypesApi, libraryEventsApi } from './services/api';

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
  // Round to integer to prevent sub-pixel jiggle
  return Math.round(minutes * pixelsPerMinute);
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

// ========================================
// ROBUST CONFLICT DETECTION (bitset-based, per-day slot occupancy)
// ========================================

// Debug flag - set to true to see conflict detection logs
const DEBUG_CONFLICTS = false;

const SLOT_MIN = 15; // minutes per slot
const DAY_SLOTS = Math.floor((24 * 60) / SLOT_MIN); // 96 slots per day

// Convert minute to slot index (0..95)
function minToSlot(min) {
  const s = Math.floor(min / SLOT_MIN);
  return Math.max(0, Math.min(DAY_SLOTS - 1, s));
}

// Canonicalize event interval to slot range [sStart, sEnd) - half-open
// Enforce at least 1 slot and valid bounds
function toSlotRange(ev) {
  // Extract start and end from event (support both formats)
  const startMin = ev.startMinutes || ev.start || 0;
  const endMin = ev.endMinutes || ev.end || (startMin + (ev.duration || SLOT_MIN));
  
  const a = Math.max(0, Math.min(startMin, endMin));
  const b = Math.max(a + SLOT_MIN, Math.max(startMin, endMin));
  const sStart = minToSlot(a);
  const sEnd = minToSlot(b);
  return [sStart, Math.max(sStart + 1, Math.min(sEnd, DAY_SLOTS))];
}

// Bitset: Uint32Array of length 3 (3*32 = 96 bits)
function makeEmptyBits() {
  return new Uint32Array(3);
}

// Set bits [sStart, sEnd) in the bitset
function setRange(bits, sStart, sEnd) {
  for (let s = sStart; s < sEnd; s++) {
    const i = (s / 32) | 0;
    const o = s % 32;
    bits[i] |= (1 << o) >>> 0;
  }
}

// Test overlap of [sStart, sEnd) against bits
function hasOverlap(bits, sStart, sEnd) {
  for (let s = sStart; s < sEnd; s++) {
    const i = (s / 32) | 0;
    const o = s % 32;
    if (bits[i] & ((1 << o) >>> 0)) return true;
  }
  return false;
}

// Build day->bits occupancy map from events (excluding specified id)
function buildDayOccupancy(events, excludeId = null) {
  const map = new Map(); // dayKey -> Uint32Array(3)
  
  if (DEBUG_CONFLICTS) {
    console.log('🔧 buildDayOccupancy:', {
      totalEvents: events.length,
      excludeId,
      eventsWithDateKey: events.filter(e => e.dateKey).length,
    });
  }
  
  for (const ev of events) {
    if (!ev.dateKey) {
      if (DEBUG_CONFLICTS) console.warn('⚠️ Event without dateKey:', ev);
      continue;
    }
    if (excludeId && ev.id === excludeId) {
      if (DEBUG_CONFLICTS) console.log('  → Excluding:', ev.id);
      continue;
    }
    
    const [s, e] = toSlotRange(ev);
    let bits = map.get(ev.dateKey);
    if (!bits) {
      bits = makeEmptyBits();
      map.set(ev.dateKey, bits);
    }
    setRange(bits, s, e);
    
    if (DEBUG_CONFLICTS) {
      console.log(`  → Occupying ${ev.dateKey} slots ${s}-${e} (${ev.id}:`, ev.label || ev.name, ')');
    }
  }
  
  if (DEBUG_CONFLICTS) {
    console.log('✅ Occupancy map built:', {
      days: Array.from(map.keys()),
      totalDays: map.size,
    });
  }
  
  return map;
}

// Check if candidate conflicts with occupancy map
function isConflicting(candidate, occupancy) {
  if (!candidate || !candidate.dateKey) {
    if (DEBUG_CONFLICTS) console.warn('⚠️ isConflicting: Invalid candidate', candidate);
    return false;
  }
  
  const [s, e] = toSlotRange(candidate);
  const bits = occupancy.get(candidate.dateKey);
  
  if (!bits) {
    if (DEBUG_CONFLICTS) {
      console.log('ℹ️ isConflicting: No occupancy for day', candidate.dateKey);
    }
    return false; // Empty day -> no conflicts
  }
  
  const conflict = hasOverlap(bits, s, e);
  
  if (DEBUG_CONFLICTS) {
    console.log('🔍 isConflicting:', {
      candidate: {
        id: candidate.id,
        dateKey: candidate.dateKey,
        startMinutes: candidate.startMinutes || candidate.start,
        endMinutes: candidate.endMinutes || candidate.end,
        slots: `${s}-${e}`,
      },
      hasConflict: conflict,
      dayHasEvents: !!bits,
    });
  }
  
  return conflict;
}

// Find IDs of events that conflict with candidate (for modal)
function listConflictingEventIds(candidate, events, excludeId = null) {
  if (!candidate || !candidate.dateKey) return [];
  
  const [sC, eC] = toSlotRange(candidate);
  const sameDay = events.filter(
    (ev) => ev.dateKey === candidate.dateKey && (!excludeId || ev.id !== excludeId)
  );
  
  const ids = [];
  for (const ev of sameDay) {
    const [s, e] = toSlotRange(ev);
    if (sC < e && s < eC) ids.push(ev.id);
  }
  return ids;
}

// Helper: Get actual event objects that conflict
function listConflicts(allEvents, candidate, excludeId = null) {
  const ids = listConflictingEventIds(candidate, allEvents, excludeId);
  return allEvents.filter(ev => ids.includes(ev.id));
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
// CALENDAR POPOVER UTILITY FUNCTIONS
// ========================================

function startOfCalendarGrid(d) {
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const day = first.getDay(); // 0-6
  const start = new Date(first);
  start.setDate(first.getDate() - day);
  return start;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function sameDay(a, b) {
  if (!a || !b) return false;
  return a.getFullYear() === b.getFullYear() && 
         a.getMonth() === b.getMonth() && 
         a.getDate() === b.getDate();
}

function formatActiveDay(d) {
  return d?.toLocaleDateString?.(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) ?? String(d);
}

// ========================================
// COMPONENT: InlineCalendarPopover (for active day selector)
// ========================================

function InlineCalendarPopover({ monthStart, currentDate, onSelect, onClose, onMonthChange }) {
  const start = startOfCalendarGrid(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="select-none">
      {/* Month header with navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          className="px-2 py-1 rounded border border-gray-600 hover:bg-gray-700 text-xs text-gray-200"
          onClick={() => onMonthChange(addMonths(monthStart, -1))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <div className="text-sm font-medium text-gray-200">
          {monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </div>
        <button
          type="button"
          className="px-2 py-1 rounded border border-gray-600 hover:bg-gray-700 text-xs text-gray-200"
          onClick={() => onMonthChange(addMonths(monthStart, 1))}
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 text-[11px] text-gray-400 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((w, i) => (
          <div key={i} className="text-center py-1">{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const isCurrentMonth = d.getMonth() === monthStart.getMonth();
          const isSelected = sameDay(d, currentDate);
          const isToday = sameDay(d, new Date());
          
          return (
            <button
              key={d.toISOString()}
              type="button"
              className={`h-8 rounded text-sm border transition ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-500'
                  : isToday
                  ? 'bg-gray-700 text-white border-gray-600'
                  : isCurrentMonth
                  ? 'hover:bg-gray-700 text-gray-200 border-transparent'
                  : 'text-gray-500 hover:bg-gray-700/40 border-transparent'
              }`}
              onClick={() => onSelect(d)}
              aria-label={d.toLocaleDateString()}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Close button */}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          className="px-2 py-1 rounded border border-gray-600 hover:bg-gray-700 text-xs text-gray-200"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
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

function ScheduledItemPreview({ 
  item, 
  pixelsPerSlot,
  layoutStyle = { leftPct: 0, widthPct: 100, columnIndex: 0, overlapCount: 1 },
  showDebug = false,
}) {
  const topPosition = minutesToPixels(item.startMinutes, pixelsPerSlot);
  const duration = item.duration || 30;
  const height = minutesToPixels(duration, pixelsPerSlot);
  const endMinutes = item.startMinutes + duration;
  
  const { leftPct, widthPct } = layoutStyle;

  return (
    <div
      className={`absolute ${item.color} text-white px-3 py-2 rounded shadow-lg z-10 flex flex-col justify-between overflow-visible`}
      style={{
        top: `${topPosition}px`,
        height: `${height}px`,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
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

function ScheduledItem({ 
  item, 
  pixelsPerSlot, 
  onResizeStart, 
  isBeingResized = false, 
  isResizing = false,
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
  
  // Extract layout positioning
  const { leftPct, widthPct } = layoutStyle;
  
  // Apply transform for dragging
  // CRITICAL: Only apply transform when actually dragging AND drag is allowed
  const style = {
    top: `${topPosition}px`,
    height: `${height}px`,
    left: `${leftPct}%`,
    width: `${widthPct}%`,
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
      className={`absolute ${item.color} text-white px-3 py-2 rounded shadow-lg ${allowDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} z-10 flex flex-col justify-between overflow-visible`}
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

function GhostEvent({ 
  ghostPosition, 
  pixelsPerSlot,
  layoutStyle = { leftPct: 0, widthPct: 100, columnIndex: 0, overlapCount: 1 },
  showDebug = false,
}) {
  if (!ghostPosition) return null;

  const { startMinutes, task } = ghostPosition;
  const topPosition = minutesToPixels(startMinutes, pixelsPerSlot);
  
  // Calculate height based on task duration - using dynamic slot height
  const duration = task.duration || 30; // Default 30 minutes
  const height = minutesToPixels(duration, pixelsPerSlot);
  
  // Calculate end time for preview
  const endMinutes = startMinutes + duration;
  
  const { leftPct, widthPct } = layoutStyle;

  return (
    <div
      className="absolute border-2 border-gray-400 border-dashed rounded bg-gray-50 bg-opacity-30 z-20 pointer-events-none px-3 py-2 flex flex-col justify-between"
      style={{ 
        top: `${topPosition}px`,
        height: `${height}px`,
        left: `${leftPct}%`,
        width: `${widthPct}%`,
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

/**
 * NEW PROPS (optional, for multi-day support):
 * - dayDate: Date         // The date this grid represents
 * - dayKey: string        // ISO date key 'YYYY-MM-DD' for persistence/queries
 * - idNamespace: string   // unique prefix to namespace droppable IDs (e.g. 'day:2025-10-15')
 * - onDrop: (payload) => void  // callback when an item is dropped in this grid
 */
function CalendarGrid({ 
  scheduledItems, 
  ghostPosition, 
  pixelsPerSlot, 
  onZoom, 
  calendarDomRef, 
  resizeDraft, 
  onResizeStart, 
  isResizing,
  // New props for multi-day support (optional)
  dayDate,
  dayKey,
  idNamespace,
  onDrop,
}) {
  const timeSlots = generateTimeSlots();
  // Round to integer pixels to prevent sub-pixel jiggle
  const calendarHeight = Math.round((END_HOUR - START_HOUR) * 60 * (pixelsPerSlot / MINUTES_PER_SLOT));
  
  const containerRef = React.useRef(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0, scrollTop: 0 });

  // Consume UI store for drag/resize state (centralized)
  const ui = useUiStore();
  
  // Only show ghost in this grid if it's currently hovered
  const isHoveringThisGrid = idNamespace ? (ui.dragOverNamespace === idNamespace) : true;
  
  // Only show resize draft if it's for this day
  const showResizeDraft = resizeDraft && (!idNamespace || resizeDraft.dateKey === dayKey);
  
  // ========================================
  // HORIZONTAL LAYOUT FOR OVERLAPPING EVENTS (Google Calendar style)
  // ========================================
  const layout = React.useMemo(() => {
    console.log('📊 CalendarGrid computing layout for', scheduledItems.length, 'items');
    const result = computeEventLayout(scheduledItems);
    console.log('📊 Layout result:', result);
    return result;
  }, [scheduledItems]);
  
  const showDebugLabels = false; // Debug labels hidden

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
      className={`relative bg-white ${!idNamespace ? 'border-l border-gray-300' : ''} ${isDragging ? 'cursor-grabbing' : 'cursor-default'} no-scrollbar overflow-hidden box-border`}
      style={{ 
        height: `${calendarHeight}px`, 
        touchAction: 'pan-y',
        contain: 'layout paint size',
      }}
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
            layoutStyle={layout[resizeDraft.id] || { leftPct: 0, widthPct: 100, columnIndex: 0, overlapCount: 1 }}
            showDebug={showDebugLabels}
          />
        </div>
      )}

      {/* Ghost/shadow preview - shows where dragged item will land */}
      {/* Only render ghost in the grid that's currently hovered */}
      {isHoveringThisGrid && (
        <GhostEvent 
          ghostPosition={ghostPosition} 
          pixelsPerSlot={pixelsPerSlot}
          layoutStyle={{ leftPct: 0, widthPct: 100, columnIndex: 0, overlapCount: 1 }}
          showDebug={showDebugLabels}
        />
      )}
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

// Subscribe to stores (tiny external-store pattern)
function useDateStore() {
  const snapshot = useSyncExternalStore(
    dateStore.subscribe,
    dateStore.get,
    dateStore.get
  );
  return { ...snapshot, ...dateStore.actions, utils: dateStore.utils };
}

function useEventsStore() {
  const snapshot = useSyncExternalStore(
    eventsStore.subscribe,
    eventsStore.get,
    eventsStore.get
  );
  return { ...snapshot, ...eventsStore };
}

function useUiStore() {
  const snapshot = useSyncExternalStore(
    uiStore.subscribe,
    uiStore.get,
    uiStore.get
  );
  return { ...snapshot, ...uiStore };
}


// Helper to parse namespace from droppable ID
function parseNs(id) {
  if (!id) return null;
  const s = String(id);
  const idx = s.indexOf('::');
  return idx === -1 ? s : s.slice(0, idx);
}

// DnD Monitor Bridge - Must be child of DndContext
function DndMonitorBridge() {
  useDndMonitor({
    onDragOver: ({ over }) => {
      uiStore.setDragOverNs(parseNs(over?.id));
    },
    onDragCancel: () => uiStore.clearDragOverNs(),
    onDragEnd: () => uiStore.clearDragOverNs(),
  });
  return null;
}

// ========================================
// SMOOTH SIDEBAR RESIZE (drag proxy + snap-on-commit)
// ========================================

// Utility: clamp helper
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Utility: compute allowed max based on viewport
const computeMaxWidth = () => Math.floor(window.innerWidth * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-max-frac') || '0.5'));

// Utility: choose a snap candidate (coarse during drag)
function getSnapCandidate(px, snapPoints, hysteresis = 12) {
  // prefer the closest snap point if within hysteresis; else return raw px
  let best = { d: Infinity, s: px };
  for (const s of snapPoints) {
    const d = Math.abs(px - s);
    if (d < best.d) best = { d, s };
  }
  return best.d <= hysteresis ? best.s : px;
}

// A thin vertical handle at the right edge of the sidebar
function SidebarResizeHandle({ onPointerDown }) {
  return (
    <div
      aria-label="Resize sidebar"
      onPointerDown={onPointerDown}
      className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none z-40"
      style={{ touchAction: "none" }}
    >
      {/* Centered grab icon overlay */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        aria-hidden="true"
      >
        {/* Simple SVG grip (two dots) – lightweight and neutral */}
        <svg width="10" height="20" viewBox="0 0 10 20" fill="none">
          <circle cx="5" cy="6" r="1.5" fill="rgba(75,85,99,0.9)" />
          <circle cx="5" cy="14" r="1.5" fill="rgba(75,85,99,0.9)" />
        </svg>
      </div>
    </div>
  );
}

// The on-screen proxy line that follows the cursor during drag
function DragProxy({ x, visible }) {
  if (!visible) return null;
  return (
    <div
      className="drag-proxy"
      style={{ left: x }}
    />
  );
}

// Compact sticky header for left pane with controls
function LeftPaneHeader({
  onOpenCreateEvent,
  onOpenTypes,
}) {
  return (
    <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="text-sm font-semibold text-gray-700">
        Event Templates
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenTypes}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400/50 shadow-sm"
          aria-label="Manage Types"
          title="Manage Types"
        >
          {/* simple icon: tags */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 10L12 2H4v8l8 8 8-8z" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="7" cy="7" r="1.5" fill="currentColor" />
          </svg>
          <span className="ml-1.5">Types</span>
        </button>

        <button
          type="button"
          onClick={onOpenCreateEvent}
          className="inline-flex items-center rounded-md bg-blue-600 text-white px-2.5 py-1.5 text-xs font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400/50 shadow-sm"
          aria-label="Add Event"
          title="Add Event"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="ml-1.5">Add</span>
        </button>
      </div>
    </div>
  );
}

// ========================================
// CENTRALIZED CONFLICT GATE (single source of truth for all commits)
// ========================================

// Unified conflict gate used by resize/move/place
function assertNoConflictOrStageConfirm({
  candidate,         // {id?, dayKey, start, end} or {id?, dateKey, startMinutes, endMinutes/duration}
  events,            // current scheduled events
  setPendingAction,  // state setter to stage modal payload
  openConflictModal, // () => void
  onCommitSafe,      // (candidate) => void - called only when no conflict
  isCommittingRef,   // React.useRef to prevent double-commits
}) {
  console.log('🚪 CONFLICT GATE CALLED:', {
    candidate,
    totalEvents: events.length,
    isCommittingRefLocked: isCommittingRef?.current,
  });
  
  // Normalize candidate to bitset format
  const normalized = {
    id: candidate.id,
    dateKey: candidate.dateKey || candidate.dayKey,
    start: candidate.startMinutes || candidate.start,
    end: candidate.endMinutes || candidate.end || (candidate.startMinutes + candidate.duration) || (candidate.start + 30),
  };
  
  console.log('📋 Normalized candidate:', normalized);
  
  // Exclude the event itself (if moving/resizing an existing one)
  const excludeId = normalized.id ?? null;
  const occ = buildDayOccupancy(events, excludeId);

  if (isConflicting(normalized, occ)) {
    const neighbors = listConflicts(events, normalized, excludeId);
    console.log('❌ CONFLICT DETECTED! Neighbors:', neighbors);
    setPendingAction({ kind: "conflict", candidate, neighbors });
    openConflictModal();
    return false;
  }

  // Safe path - no conflicts
  console.log('✅ NO CONFLICT - Committing safely');
  onCommitSafe(candidate);
  if (isCommittingRef) {
    isCommittingRef.current = false;
  }
  return true;
}

// Lightweight resizer controller (rAF + CSS var + commit-on-release)
function useSidebarResizeController(initialWidth = 320) {
  const isDraggingRef = React.useRef(false);
  const startXRef = React.useRef(0);
  const startWidthRef = React.useRef(initialWidth);
  const liveRawRef = React.useRef(initialWidth); // raw pixel width under cursor
  const rafRef = React.useRef(0);

  const [proxy, setProxy] = React.useState({ visible: false, x: 0 });

  // Snap points (coarse preview during drag); tweak as desired
  const snapPoints = useMemo(() => [240, 280, 320, 360, 400, 460, 520], []);

  // Load from localStorage once
  React.useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem("sidebarWidth") || "", 10);
      if (!Number.isNaN(saved)) {
        startWidthRef.current = saved;
        liveRawRef.current = saved;
        document.documentElement.style.setProperty("--sidebar-w", `${saved}px`);
      } else {
        document.documentElement.style.setProperty("--sidebar-w", `${initialWidth}px`);
      }
    } catch {
      document.documentElement.style.setProperty("--sidebar-w", `${initialWidth}px`);
    }
  }, [initialWidth]);

  // Pointer handlers
  const onPointerDown = React.useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    const style = getComputedStyle(document.documentElement);
    const current = parseInt(style.getPropertyValue("--sidebar-w"), 10) || startWidthRef.current;
    startWidthRef.current = current;
    liveRawRef.current = current;

    document.body.classList.add("body--sidebar-dragging");

    const onPointerMove = (ev) => {
      if (!isDraggingRef.current) return;

      const min = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-min"), 10) || 240;
      const max = computeMaxWidth();
      const dx = ev.clientX - startXRef.current;
      const raw = clamp(startWidthRef.current + dx, min, max);
      liveRawRef.current = raw;

      // Coarse snap PREVIEW (proxy snaps visually)
      const snapped = getSnapCandidate(raw, snapPoints, 12);

      // Update proxy once per frame
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setProxy({ visible: true, x: `${snapped}px` });
          rafRef.current = 0;
        });
      }
    };

    const onPointerUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;

      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      document.body.classList.remove("body--sidebar-dragging");

      // Final commit with snapping
      const min = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--sidebar-min"), 10) || 240;
      const max = computeMaxWidth();
      const raw = clamp(liveRawRef.current, min, max);
      const snapped = getSnapCandidate(raw, snapPoints, 12);

      // Single style write commit
      document.documentElement.style.setProperty("--sidebar-w", `${snapped}px`);

      // Persist once
      try {
        localStorage.setItem("sidebarWidth", String(snapped));
      } catch {}

      // Hide proxy
      setProxy((p) => ({ ...p, visible: false }));
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });

    // show proxy at current edge
    setProxy({ visible: true, x: `${current}px` });
  }, [snapPoints]);

  React.useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      document.body.classList.remove("body--sidebar-dragging");
    };
  }, []);

  return { onPointerDown, proxyState: proxy };
}

// ========================================
// MAIN APP COMPONENT
// ========================================

function App() {
  // ========================================
  // POLICY DEBUG (show on mount)
  // ========================================
  React.useEffect(() => {
    console.log('🔧 POLICIES LOADED:', {
      MOVE_POLICY,
      CONFLICT_BEHAVIOR,
      willShowModalOnConflict: MOVE_POLICY === 'confirm-then-commit',
      willCommitImmediately: MOVE_POLICY === 'always',
    });
  }, []);
  
  // ========================================
  // SIDEBAR RESIZE CONTROLLER
  // ========================================
  
  const { onPointerDown, proxyState } = useSidebarResizeController(320);
  
  // ========================================
  // DATE STORE
  // ========================================
  
  const { selectedDate, weekStartsOn, viewMode, includeWeekends } = useDateStore();
  const { setDate, setViewMode, setIncludeWeekends, nextWindow, prevWindow, goToday } = dateStore.actions;
  const { getDisplayedDays, getVisibleKeys, getDateKey } = dateStore.utils;
  
  const displayedDays = useMemo(() => getDisplayedDays(), [selectedDate, viewMode, includeWeekends]);
  const visibleKeys = useMemo(() => getVisibleKeys(), [selectedDate, viewMode, includeWeekends]);
  const dateKey = getDateKey();
  
  // When a specific slot's date changes via a menu, re-anchor to that date
  const handleChangeDay = (index, newDate) => {
    setDate(newDate);
  };
  
  // ========================================
  // EVENTS STORE
  // ========================================
  
  const { byId, byDate, getEventsForDate, moveEventToDay, upsertEvent, findConflictsSameDay } = useEventsStore();
  
  // ========================================
  // STATE INITIALIZATION WITH DEMO DATA
  // ========================================
  
  // State: Types (categories for events) - loaded from backend
  const [types, setTypes] = useState([]);
  const [typesLoaded, setTypesLoaded] = useState(false);

  // Load types from backend on mount
  React.useEffect(() => {
    let cancelled = false;
    const loadTypes = async () => {
      try {
        const backendTypes = await eventTypesApi.getAll();
        if (cancelled) return;
        // Convert backend format to frontend format
        const frontendTypes = Array.isArray(backendTypes) ? backendTypes.map(t => ({
          id: t.id,
          name: t.name,
          color: t.color,
          icon: t.icon,
        })) : [];
        setTypes(frontendTypes);
        setTypesLoaded(true);
        console.log('✅ Types loaded from backend:', frontendTypes.length);
      } catch (error) {
        console.error('❌ Failed to load types from backend:', error);
        if (cancelled) return;
        // Still mark as loaded to allow UI to render with empty list
        setTypes([]);
        setTypesLoaded(true);
      }
    };
    loadTypes();
    return () => { cancelled = true; };
  }, []);
  
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
  const [pendingAction, setPendingAction] = useState(null); // For centralized conflict gate
  
  // Ref: Prevent double-commits while modal is open
  const isCommittingRef = React.useRef(false);
  
  // Debug: Watch for unexpected state changes
  React.useEffect(() => {
    if (scheduledItems.length > 0) {
      console.log('📋 scheduledItems CHANGED:', {
        count: scheduledItems.length,
        items: scheduledItems.map(e => ({ id: e.id, label: e.label, dateKey: e.dateKey })),
      });
    }
  }, [scheduledItems]);
  
  // State: Event editor modal
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // State: Types manager modal
  const [showTypesManager, setShowTypesManager] = useState(false);

  // State: Active navigation view
  const [activeView, setActiveView] = useState('calendar');

  // State: Calendar popover for active day selector
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonthStart, setVisibleMonthStart] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  // Update visible month when selected date changes
  React.useEffect(() => {
    setVisibleMonthStart(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }, [selectedDate]);

  // Ref: Calendar DOM element for resize calculations
  const calendarDomRef = React.useRef(null);
  
  // Ref: Track if window listeners are attached (prevent duplicate attachment)
  const resizeListenersAttached = React.useRef(false);

  // Update global resize state for duplicate detection
  React.useEffect(() => {
    setResizingState(isResizing);
  }, [isResizing]);

  // ========================================
  // CONFLICT DETECTION (bitset-based, draft-aware)
  // ========================================
  
  // Track which event is being moved/resized (exclude from occupancy to avoid self-conflict)
  const movingId = useMemo(() => {
    if (resizeDraft && resizeDraft.id) return resizeDraft.id;
    if (activeId && activeId.startsWith('scheduled-')) return activeId;
    return null;
  }, [resizeDraft, activeId]);
  
  // Build draft candidate from current ghost position or resize draft
  const draftCandidate = useMemo(() => {
    // Priority 1: Resize draft (active resize operation)
    if (resizeDraft && resizeDraft.dateKey) {
      const draft = {
        id: resizeDraft.id,
        dateKey: resizeDraft.dateKey,
        startMinutes: resizeDraft.startMinutes,
        endMinutes: resizeDraft.startMinutes + (resizeDraft.duration || MINUTES_PER_SLOT),
        duration: resizeDraft.duration || MINUTES_PER_SLOT,
      };
      if (DEBUG_CONFLICTS) console.log('📝 Draft from RESIZE:', draft);
      return draft;
    }
    
    // Priority 2: Ghost position (dragging new or existing event)
    if (ghostPosition && ghostPosition.startMinutes != null) {
      const duration = ghostPosition.task?.duration || ghostPosition.duration || MINUTES_PER_SLOT;
      const targetDayKey = ghostPosition.dayKey || dateKey;
      const draft = {
        id: movingId || `ghost-${Date.now()}`,
        dateKey: targetDayKey,
        startMinutes: ghostPosition.startMinutes,
        endMinutes: ghostPosition.startMinutes + duration,
        duration: duration,
      };
      if (DEBUG_CONFLICTS) console.log('📝 Draft from GHOST:', draft);
      return draft;
    }
    
    if (DEBUG_CONFLICTS && (resizeDraft || ghostPosition)) {
      console.log('⚠️ Draft conditions not met:', { resizeDraft, ghostPosition });
    }
    
    return null;
  }, [resizeDraft, ghostPosition, movingId, dateKey]);
  
  // Build occupancy map (exclude moving event to avoid self-conflict)
  const occupancy = useMemo(
    () => buildDayOccupancy(scheduledItems, movingId || null),
    [scheduledItems, movingId]
  );
  
  // Check if draft has live conflict
  const liveConflict = useMemo(() => {
    if (!draftCandidate) {
      if (DEBUG_CONFLICTS && (resizeDraft || ghostPosition)) {
        console.log('⚠️ liveConflict: No draftCandidate despite resize/ghost state');
      }
      return false;
    }
    
    const conflict = isConflicting(draftCandidate, occupancy);
    
    if (DEBUG_CONFLICTS) {
      console.log('🎯 Live Conflict Check:', {
        draftCandidate,
        hasConflict: conflict,
        occupancyDays: Array.from(occupancy.keys()),
      });
    }
    
    return conflict;
  }, [draftCandidate, occupancy, resizeDraft, ghostPosition]);
  
  // Conflict UI state for passing to calendar
  const conflictUi = useMemo(() => {
    const ui = {
      dayKey: draftCandidate?.dateKey || null,
      liveConflict,
      draftCandidate,
      movingId,
    };
    
    if (DEBUG_CONFLICTS && liveConflict) {
      console.log('🔴 CONFLICT UI STATE:', ui);
    }
    
    return ui;
  }, [draftCandidate, liveConflict, movingId]);

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
  const handleSaveType = async (typeData) => {
    const existingType = types.find(t => t.id === typeData.id);
    
    try {
      if (existingType) {
        // Update existing type on backend
        await eventTypesApi.update(typeData.id, {
          ...typeData,
          workspaceId: 'ws_dev',
          defaultsJsonb: '{}',
        });
        setTypes(prev => prev.map(t => t.id === typeData.id ? typeData : t));
        console.log('✅ Type updated on backend:', typeData.id);
      } else {
        // Create new type on backend
        const created = await eventTypesApi.create({
          ...typeData,
          workspaceId: 'ws_dev',
          defaultsJsonb: '{}',
        });
        setTypes(prev => [...prev, { ...typeData, id: created.id }]);
        console.log('✅ Type created on backend:', created.id);
      }
    } catch (error) {
      console.error('❌ Failed to save type on backend:', error);
      // Still update local state for offline support
      if (existingType) {
        setTypes(prev => prev.map(t => t.id === typeData.id ? typeData : t));
      } else {
        setTypes(prev => [...prev, typeData]);
      }
    }
  };
  
  // Delete type
  const handleDeleteType = async (typeId) => {
    // Remove type from types list locally
    setTypes(prev => prev.filter(t => t.id !== typeId));
    
    // Set typeId to null for all events that referenced this type
    setTaskTemplates(prev => 
      prev.map(t => t.typeId === typeId ? { ...t, typeId: null } : t)
    );
    
    // Also update any scheduled items (if they store typeId)
    setScheduledItems(prev =>
      prev.map(item => item.typeId === typeId ? { ...item, typeId: null } : item)
    );

    // Delete from backend
    try {
      await eventTypesApi.delete(typeId);
      console.log('✅ Type deleted from backend:', typeId);
    } catch (error) {
      console.error('❌ Failed to delete type from backend:', error);
    }
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
    console.log('✅ CONFIRM OVERLAP CLICKED:', {
      pendingEvent,
      isCommittingRefLocked: isCommittingRef.current,
    });
    
    if (pendingEvent) {
      // Check if this is a new event or a repositioned existing event
      const isExistingEvent = scheduledItems.some(e => e.id === pendingEvent.id);
      
      console.log('  → Is existing event?', isExistingEvent);
      
      if (isExistingEvent) {
        // Repositioning existing event
        console.log('  → Updating existing event position');
        setScheduledItems((prev) =>
          prev.map((schedItem) =>
            schedItem.id === pendingEvent.id
              ? pendingEvent
              : schedItem
          )
        );
      } else {
        // Adding new event
        console.log('  → Adding new event');
        setScheduledItems((prev) => {
          const updated = [...prev, pendingEvent];
          console.log('  → scheduledItems updated to:', updated);
          return updated;
        });
        setNextId((prev) => prev + 1);
      }
    }
    
    // Close modal and clear pending state
    console.log('  → Closing modal and clearing state');
    setShowOverlapModal(false);
    setPendingEvent(null);
    setOverlappingEvents([]);
    setPendingAction(null);
    
    // CRITICAL: Also clear resize state if this was from a resize operation
    setIsResizing(false);
    setResizeTarget(null);
    setResizeDraft(null);
    
    // Release commit lock
    console.log('  → Releasing commit lock');
    isCommittingRef.current = false;
  }, [pendingEvent, scheduledItems]);
  
  // User cancels - discard the pending event
  const handleCancelOverlap = React.useCallback(() => {
    console.log('❌ CANCEL OVERLAP CLICKED:', {
      pendingEvent,
      isCommittingRefLocked: isCommittingRef.current,
    });
    
    // Close modal and clear pending state
    console.log('  → Closing modal without saving');
    setShowOverlapModal(false);
    setPendingEvent(null);
    setOverlappingEvents([]);
    setPendingAction(null);
    
    // CRITICAL: Also clear resize state if this was from a resize operation
    setIsResizing(false);
    setResizeTarget(null);
    setResizeDraft(null);
    
    // Release commit lock
    console.log('  → Releasing commit lock');
    isCommittingRef.current = false;
  }, [pendingEvent]);

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

    // Overlap check excluding itself, only within same day
    const others = scheduledItems.filter(e => 
      e.id !== updated.id && 
      (e.dateKey === updated.dateKey || (!e.dateKey && !updated.dateKey))
    );
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
      const isOverCalendar = over?.id === 'calendar' || over?.id?.includes('::calendar');
      if (!over || !isOverCalendar) {
        setGhostPosition(null);
        return;
      }
    }
    // For scheduled items, continue even if over is null (use delta.y from current position)

    // Get calendar element to calculate position
    // FIX: Null-safe lookup chain - over can be undefined after resize
    // Handle both namespaced and non-namespaced calendar IDs
    const calendarElement = over?.node?.current || calendarDomRef.current || 
      document.querySelector('[data-droppable-id="calendar"]') ||
      document.querySelector('[data-droppable-id*="::calendar"]');
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
    window._dragMoveCount = 0; // Reset counter
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('🎬 handleDragEnd CALLED');
    console.log('═══════════════════════════════════════');
    console.log('  Active ID:', event.active.id);
    console.log('  Over ID:', event.over?.id);
    console.log('  Active Data:', event.active.data.current);
    console.log('  Delta:', event.delta);
    console.log('═══════════════════════════════════════');
    console.log('');
    
    // ========================================
    // IGNORE DRAG END IF CURRENTLY RESIZING
    // ========================================
    if (isResizing) {
      console.log('⏸️ Ignoring drag end (currently resizing)');
      setActiveId(null);
      return;
    }

    const { active, over, delta } = event;
    
    setActiveId(null);

    const activeData = active.data.current;

    // FIX: Only require 'over' for template drags (new placements)
    // For scheduled drags (repositioning), allow fallback calculation even if over is null
    if (activeData?.type === 'template') {
      // Templates must be dropped on a calendar (handle both namespaced and non-namespaced IDs)
      const isCalendarDrop = over?.id === 'calendar' || over?.id?.includes('::calendar');
      if (!isCalendarDrop) {
        setGhostPosition(null);
        return;
      }
    }
    // For scheduled items, continue even if over is missing (resilient to post-resize collision detection issues)

    if (activeData.type === 'template') {
      console.log('📥 TEMPLATE DROP (from left pane)');
      
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

      // Extract target dayKey from drop zone (if multi-day)
      const targetDayKey = over?.data?.current?.dayKey || dateKey;
      
      const newItem = {
        id: `scheduled-${nextId}`,
        label: task.name || task.label, // Support both name and label
        color: task.color,
        startMinutes: finalMinutes,
        duration: duration,
        typeId: task.typeId || null, // Preserve type association
        dateKey: targetDayKey, // NEW: Associate with target day
      };
      
      console.log('📦 New item to place:', newItem);

      // ========================================
      // APPLY MOVE POLICY for template drops (uses centralized conflict gate)
      // ========================================
      console.log('📊 Current MOVE_POLICY:', MOVE_POLICY);
      console.log('📊 Current scheduledItems count:', scheduledItems.length);
      console.log('📊 Target dayKey:', targetDayKey);
      
      if (MOVE_POLICY === 'always') {
        console.log('⚡ ALWAYS MODE: Committing immediately WITHOUT conflict gate');
        
        // COMMIT THE CREATION IMMEDIATELY
        setScheduledItems((prev) => [...prev, newItem]);
        setNextId((prev) => prev + 1);
        setGhostPosition(null);
        
        // Optional: Check conflicts for informational purposes
        if (CONFLICT_BEHAVIOR === 'inform') {
          console.log('ℹ️ INFORM MODE: Checking conflicts post-commit');
          const candidate = {
            dateKey: newItem.dateKey,
            startMinutes: newItem.startMinutes,
            endMinutes: newItem.startMinutes + newItem.duration,
          };
          const occ = buildDayOccupancy(scheduledItems, newItem.id);
          
          if (isConflicting(candidate, occ)) {
            console.log('ℹ️ Conflict found (informational only)');
            const conflicts = listConflicts(scheduledItems, newItem);
            setPendingEvent(null); // Not pending - already committed
            setOverlappingEvents(conflicts);
            setShowOverlapModal(true);
          }
        } else {
          console.log('🔕 ALLOW MODE: No conflict checking at all');
        }
      } else {
        // LEGACY: confirm-then-commit policy (uses bitset conflict gate)
        console.log('🔐 Using confirm-then-commit policy for template drop');
        
        if (isCommittingRef.current) {
          console.warn('⚠️ Already committing, ignoring');
          return;
        }
        isCommittingRef.current = true;
        
        console.log('🚪 Calling conflict gate for template drop...');
        
        console.log('  → isCommittingRef.current BEFORE gate:', isCommittingRef.current);
        
        const gateResult = assertNoConflictOrStageConfirm({
          candidate: {
            id: newItem.id,
            dateKey: newItem.dateKey,
            startMinutes: newItem.startMinutes,
            endMinutes: newItem.startMinutes + newItem.duration,
          },
          events: scheduledItems,
          setPendingAction: (action) => {
            console.log('📌 Setting pending action from template drop:', action);
            setPendingEvent(newItem);
            setOverlappingEvents(action.neighbors);
          },
          openConflictModal: () => {
            console.log('🚨 Opening conflict modal for template drop');
            setShowOverlapModal(true);
          },
          onCommitSafe: () => {
            console.log('✅ Template drop safe - committing');
            setScheduledItems((prev) => {
              const updated = [...prev, newItem];
              console.log('  → Updated scheduledItems:', updated);
              return updated;
            });
            setNextId((prev) => prev + 1);
          },
          isCommittingRef,
        });
        
        console.log('🏁 Conflict gate returned:', gateResult);
        console.log('  → isCommittingRef.current AFTER gate:', isCommittingRef.current);
        
        if (!gateResult) {
          console.log('⚠️ Gate blocked commit (conflict), should NOT add to scheduledItems');
          console.log('  → Modal should be open, waiting for user choice');
        }
        
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

      // Extract target dayKey from drop zone (if multi-day, allow cross-day moves)
      const targetDayKey = over?.data?.current?.dayKey || item.dateKey || dateKey;
      
      // Create updated event object (may include new dateKey if dropped on different day)
      const updatedItem = { 
        ...item, 
        startMinutes: finalMinutes,
        dateKey: targetDayKey, // Update dateKey if moving to different day
      };
      
      // ========================================
      // APPLY MOVE POLICY: 'always' commits first, then optionally informs
      // ========================================
      if (MOVE_POLICY === 'always') {
        // COMMIT THE MOVE IMMEDIATELY (no blocking confirmation)
        setScheduledItems((prev) =>
          prev.map((schedItem) =>
            schedItem.id === item.id
              ? updatedItem
              : schedItem
          )
        );
        setGhostPosition(null);
        
        // Optional: Check conflicts for informational purposes
        if (CONFLICT_BEHAVIOR === 'inform') {
          const candidate = {
            id: updatedItem.id,
            dateKey: updatedItem.dateKey,
            startMinutes: updatedItem.startMinutes,
            endMinutes: updatedItem.startMinutes + (updatedItem.duration || 30),
          };
          const occ = buildDayOccupancy(scheduledItems, updatedItem.id);
          
          if (isConflicting(candidate, occ)) {
            const conflicts = listConflicts(scheduledItems, updatedItem, updatedItem.id);
            setPendingEvent(null); // Not pending - already committed
            setOverlappingEvents(conflicts);
            setShowOverlapModal(true);
          }
        }
      } else {
        // LEGACY: confirm-then-commit policy (uses bitset conflict gate)
        if (isCommittingRef.current) return;
        isCommittingRef.current = true;
        
        assertNoConflictOrStageConfirm({
          candidate: {
            id: updatedItem.id,
            dateKey: updatedItem.dateKey,
            startMinutes: updatedItem.startMinutes,
            endMinutes: updatedItem.startMinutes + (updatedItem.duration || 30),
          },
          events: scheduledItems,
          setPendingAction: (action) => {
            setPendingEvent(updatedItem);
            setOverlappingEvents(action.neighbors);
          },
          openConflictModal: () => setShowOverlapModal(true),
          onCommitSafe: () => {
            setScheduledItems((prev) =>
              prev.map((schedItem) =>
                schedItem.id === item.id
                  ? updatedItem
                  : schedItem
              )
            );
          },
          isCommittingRef,
        });
        
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

  // Route handling using React Router
  const location = useLocation();
  const navigate = useNavigate();
  const showDiagnostics = import.meta.env.VITE_SHOW_DIAGNOSTICS === 'true';

  // Determine active view from pathname
  const getActiveView = () => {
    if (location.pathname === '/create') return 'create';
    if (location.pathname === '/admin/diagnostics') return 'settings';
    return activeView;
  };

  // If on special routes, render without DndContext wrapper
  if (location.pathname === '/backend-test') {
    return <BackendTest />;
  }

  if (location.pathname === '/create') {
    return (
      <>
        <TopNav 
          activeView="create"
          onViewChange={(view) => {
            if (view === 'create') navigate('/create');
            else if (view === 'calendar') navigate('/');
            else navigate('/');
          }}
          onQuickAdd={() => {}}
          onToggleSidebar={() => layoutStore.toggle()}
        />
        <CreatePage />
      </>
    );
  }

  if (location.pathname === '/admin/diagnostics' && showDiagnostics) {
    return (
      <>
        <TopNav 
          activeView="settings"
          onViewChange={(view) => {
            if (view === 'create') navigate('/create');
            else if (view === 'calendar') navigate('/');
            else navigate('/');
          }}
          onQuickAdd={() => {}}
          onToggleSidebar={() => layoutStore.toggle()}
        />
        <DiagnosticsPage />
      </>
    );
  }

  // Main calendar app (default route) - needs DndContext
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      autoScroll={false}
      modifiers={[restrictToWindowEdges]}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      {/* PHASE 1 DIAGNOSTIC: Monitor must be child of DndContext */}
      <DndEventMonitor 
        isResizing={isResizing}
      />
      
      {/* UI State Monitor: Track drag hover namespace */}
      <DndMonitorBridge />
      
      {/* ========================================
          TOP NAVIGATION BAR
      ======================================== */}
      <TopNav 
        activeView={getActiveView()}
        onViewChange={(view) => {
          if (view === 'create') navigate('/create');
          else {
            setActiveView(view);
            if (view !== 'calendar') navigate('/');
          }
        }}
        onQuickAdd={handleCreateTemplate}
        onToggleSidebar={() => layoutStore.toggle()}
      />

      <div className="flex flex-col h-screen bg-gray-50 pt-[57px]">
        
        {/* ========================================
            VIEW ROUTING: Show different content based on activeView
            Note: /create is handled by early return above
        ======================================== */}
        {activeView !== 'calendar' && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                {activeView === 'home' && '🏠 Home'}
                {activeView === 'settings' && '⚙️ Settings'}
              </h2>
              <p className="text-gray-600 mb-4">
                This view is coming soon!
              </p>
              <button
                onClick={() => setActiveView('calendar')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Calendar
              </button>
            </div>
          </div>
        )}
        
        {/* ========================================
            APP GRID LAYOUT (CSS Grid with var(--sidebar-w))
            Only shown when activeView is 'calendar'
        ======================================== */}
        {activeView === 'calendar' && (
        <div className="app-grid flex-1 relative">
          {/* LEFT SIDEBAR: Custom Event Templates */}
          <aside className="sidebar relative flex flex-col h-full bg-gray-100 overflow-hidden">
            <LeftPaneHeader
              onOpenCreateEvent={handleCreateTemplate}
              onOpenTypes={handleOpenTypesManager}
            />

            {/* Scrollable events list area */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                {!typesLoaded ? (
                  <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                    <p className="mb-4">Loading types...</p>
                  </div>
                ) : taskTemplates.length === 0 ? (
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
            </div>

            {/* Resize Handle */}
            <SidebarResizeHandle onPointerDown={onPointerDown} />
          </aside>

          {/* RIGHT MAIN: Calendar */}
          <main className="main-area h-full overflow-y-auto box-border" id="calendar-container" style={{ contain: 'layout paint' }}>
          <div className="p-6">
            {/* ========================================
                CALENDAR HEADER: 3-Zone Layout with Active Day
            ======================================== */}
            <header className="w-full mb-4">
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                {/* LEFT: Empty spacer for balance */}
                <div className="justify-self-start" />

                {/* CENTER: ‹ [Today or Date] › (always centered) */}
                <div className="justify-self-center relative">
                  <div className="flex items-center gap-2">
                    {/* Previous */}
                    <button
                      type="button"
                      onClick={prevWindow}
                      className="px-2 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition"
                      aria-label="Previous range"
                    >
                      ‹
                    </button>

                    {/* Active Day / Today Button (clickable for calendar popover) */}
                    <button
                      type="button"
                      onClick={() => setCalendarOpen(v => !v)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setCalendarOpen(v => !v);
                        } else if (e.key === 'Escape') {
                          setCalendarOpen(false);
                        }
                      }}
                      className="px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm transition min-w-[140px]"
                      aria-haspopup="dialog"
                      aria-expanded={calendarOpen ? 'true' : 'false'}
                      aria-controls="active-day-calendar"
                    >
                      {sameDay(selectedDate, new Date()) ? 'Today' : formatActiveDay(selectedDate)}
                    </button>

                    {/* Next */}
                    <button
                      type="button"
                      onClick={nextWindow}
                      className="px-2 py-1 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 shadow-sm transition"
                      aria-label="Next range"
                    >
                      ›
                    </button>
                  </div>

                  {/* Calendar Popover (positioned relative to center button) */}
                  {calendarOpen && (
                    <>
                      {/* Backdrop to close on outside click */}
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setCalendarOpen(false)}
                        aria-hidden="true"
                      />
                      
                      {/* Popover - centered below button */}
                      <div
                        id="active-day-calendar"
                        role="dialog"
                        aria-label="Choose date"
                        className="absolute z-50 mt-2 left-1/2 -translate-x-1/2 w-72 rounded-lg border border-gray-300 bg-white shadow-xl p-3"
                      >
                        <InlineCalendarPopover
                          monthStart={visibleMonthStart}
                          currentDate={selectedDate}
                          onSelect={(d) => {
                            setDate(d);
                            setCalendarOpen(false);
                          }}
                          onClose={() => setCalendarOpen(false)}
                          onMonthChange={setVisibleMonthStart}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* RIGHT: View Selector + Weekend Toggle + Zoom */}
                <div className="justify-self-end flex items-center gap-3">
                  {/* View Mode Tabs */}
                  <div className="inline-flex rounded-md overflow-hidden border border-gray-300 bg-gray-100">
                    <button
                      onClick={() => setViewMode('day')}
                      className={`px-3 py-1.5 text-sm font-medium transition ${
                        viewMode === 'day'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Day
                    </button>
                    <button
                      onClick={() => setViewMode('3day')}
                      className={`px-3 py-1.5 text-sm font-medium transition border-x border-gray-300 ${
                        viewMode === '3day'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      3-Day
                    </button>
                    <button
                      onClick={() => setViewMode('week')}
                      className={`px-3 py-1.5 text-sm font-medium transition ${
                        viewMode === 'week'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Week
                    </button>
                  </div>

                  {/* Weekend Toggle */}
                  <label className="flex items-center gap-2 text-sm text-gray-700 font-medium">
                    <input
                      type="checkbox"
                      checked={includeWeekends}
                      onChange={(e) => setIncludeWeekends(e.target.checked)}
                      className="accent-blue-600 w-4 h-4"
                    />
                    Weekends
                  </label>

                  {/* Zoom Info */}
                  <span className="text-sm font-normal text-gray-600">
                    Zoom: {((pixelsPerSlot / DEFAULT_PIXELS_PER_SLOT) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </header>
            
            {/* Multi-column calendar grid */}
            <MultiDayCalendar
              days={displayedDays}
              CalendarGrid={CalendarGrid}
              gridProps={{
                scheduledItems: scheduledItems, // Still pass for backward compat, but getEventsForDay is primary
                ghostPosition: ghostPosition,
                pixelsPerSlot: pixelsPerSlot,
                onZoom: handleZoom,
                calendarDomRef: calendarDomRef,
                resizeDraft: isResizing ? resizeDraft : null,
                onResizeStart: (item, edge, clientY) => handleResizeStart(item, edge, clientY),
                isResizing: isResizing,
                conflictUi: conflictUi, // Pass conflict UI state (includes live conflict flag)
              }}
              getEventsForDay={(dayKey) => {
                // Get events from store for this day, plus legacy events from scheduledItems
                const storeEvents = getEventsForDate(dayKey);
                const legacyEvents = scheduledItems.filter(item => 
                  item.dateKey === dayKey || (!item.dateKey && dayKey === visibleKeys[0])
                );
                return [...storeEvents, ...legacyEvents];
              }}
              onDropToDay={(day, payload) => {
                // Cross-day drop handling is done in handleDragEnd via over.data.current.dayKey
                // This callback is available for future enhancements
              }}
              onResizeOnDay={(day, payload) => {
                // Day-scoped resize handling
                // Already handled in handleResizeEnd
              }}
            />
                </div>
              </main>

          {/* Drag Proxy: Follows cursor during resize */}
          <DragProxy x={proxyState.x} visible={proxyState.visible} />
        </div>
        )}
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
          Supports both blocking (pendingEvent exists) and informational (pendingEvent null) modes
      ======================================== */}
      <Modal
        isOpen={showOverlapModal}
        title={pendingEvent ? "⚠️ Time Conflict Detected" : "ℹ️ Overlap Detected"}
        onConfirm={handleConfirmOverlap}
        onCancel={handleCancelOverlap}
        confirmText={pendingEvent ? "Schedule Anyway" : "OK"}
        cancelText={pendingEvent ? "Cancel" : null}
      >
        <div className="space-y-3">
          {pendingEvent ? (
            <>
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
            </>
          ) : (
            <>
              <p>
                The event was moved successfully, but it now overlaps with {overlappingEvents.length > 1 ? 'these events' : 'this event'}:
              </p>
              <ul className="list-disc list-inside space-y-1 bg-blue-50 border border-blue-200 rounded p-3">
                {overlappingEvents.map((event) => {
                  const endTime = event.startMinutes + (event.duration || 30);
                  return (
                    <li key={event.id} className="text-sm">
                      <strong>{event.label}</strong> ({formatTime(event.startMinutes)} - {formatTime(endTime)})
                    </li>
                  );
                })}
              </ul>
              <p className="text-sm text-gray-600">
                You can adjust the times manually if needed.
              </p>
            </>
          )}
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


