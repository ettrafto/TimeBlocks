// ========================================
// OVERLAP DETECTION UTILITY
// ========================================

// Check if a new event overlaps with any existing events
export function checkOverlap(newEvent, existingEvents) {
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

