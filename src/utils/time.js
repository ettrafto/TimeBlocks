import { START_HOUR, END_HOUR, MINUTES_PER_SLOT, DEFAULT_PIXELS_PER_SLOT } from '../constants/calendar';

// ========================================
// TIME CONVERSION UTILITIES
// ========================================

// Convert pixels to time (minutes from start) - using dynamic slot height
export function pixelsToMinutes(pixels, pixelsPerSlot = DEFAULT_PIXELS_PER_SLOT) {
  const pixelsPerMinute = pixelsPerSlot / MINUTES_PER_SLOT;
  return Math.round(pixels / pixelsPerMinute);
}

// Convert time (minutes from start) to pixels - using dynamic slot height
export function minutesToPixels(minutes, pixelsPerSlot = DEFAULT_PIXELS_PER_SLOT) {
  const pixelsPerMinute = pixelsPerSlot / MINUTES_PER_SLOT;
  return minutes * pixelsPerMinute;
}

// Snap minutes to nearest 15-minute increment
export function snapToIncrement(minutes) {
  return Math.round(minutes / MINUTES_PER_SLOT) * MINUTES_PER_SLOT;
}

// ========================================
// RESIZE UTILITIES
// ========================================

// Clamp minutes to calendar day bounds (0 to total calendar minutes)
export function clampMinutesToDay(m) {
  const total = (END_HOUR - START_HOUR) * 60;
  return Math.max(0, Math.min(m, total));
}

// Clamp duration to minimum one slot
export function clampDuration(d) {
  return Math.max(MINUTES_PER_SLOT, d);
}

// Given top (start) and bottom (end) minute marks, return snapped start/duration
export function computeSnappedRange(startMin, endMin) {
  const snappedStart = snapToIncrement(startMin);
  const snappedEnd   = snapToIncrement(endMin);
  const start = Math.min(snappedStart, snappedEnd);
  const end   = Math.max(snappedStart, snappedEnd);
  const duration = clampDuration(end - start);
  return { start, duration };
}

// ========================================
// TIME FORMATTING
// ========================================

// Format minutes to time string (e.g., "9:30 AM")
export function formatTime(totalMinutes) {
  const hour = Math.floor(totalMinutes / 60) + START_HOUR;
  const minute = totalMinutes % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

// Generate time slots for the calendar
export function generateTimeSlots() {
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

