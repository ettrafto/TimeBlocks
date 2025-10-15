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

// ========================================
// GOOGLE CALENDAR-STYLE HORIZONTAL LAYOUT
// ========================================

/**
 * Compute horizontal layout for overlapping events (Google Calendar style)
 * 
 * Algorithm:
 * - Events that overlap in time share horizontal space
 * - Earlier starting events are placed left
 * - If same start time, shorter events go left
 * - Each event gets equal share: width = 100% / overlapCount
 * 
 * @param {Array} events - Array of events with {id, startMinutes, duration}
 * @returns {Object} Layout map: { [id]: { columnIndex, overlapCount, leftPct, widthPct } }
 */
export function computeEventLayout(events) {
  console.log('🎨 computeEventLayout CALLED:', {
    eventCount: events?.length || 0,
    events: events?.map(e => ({ 
      id: e.id, 
      label: e.label || e.name,
      start: e.startMinutes, 
      dur: e.duration 
    })) || [],
  });
  
  if (!events || events.length === 0) {
    console.log('  → No events, returning empty layout');
    return {};
  }

  // Normalize events to have explicit endMinutes
  const norm = events.map(e => ({
    ...e,
    endMinutes: e.startMinutes + (e.duration || 30),
  }));
  
  console.log('📐 Normalized events:', norm.map(e => ({
    id: e.id,
    label: e.label || e.name,
    start: e.startMinutes,
    end: e.endMinutes,
  })));

  // Create time points for sweep-line algorithm
  const points = [];
  for (const e of norm) {
    points.push({ t: e.startMinutes, type: +1, id: e.id, dur: e.duration || 30 });
    points.push({ t: e.endMinutes, type: -1, id: e.id, dur: e.duration || 30 });
  }

  // Sort by:
  // 1. Time (ascending)
  // 2. Type (ends before starts at same time)
  // 3. Duration (shorter first for same start time)
  points.sort((a, b) => 
    (a.t - b.t) || 
    (b.type - a.type) || 
    (a.dur - b.dur)
  );

  const active = new Set();       // Currently active event IDs
  const columns = [];             // Column slots (null = free, id = occupied)
  const colOf = new Map();        // Event ID → column index
  const stats = new Map();        // Event ID → { maxConcurrent }

  // Update max concurrent count for all active events
  const touchStats = () => {
    const k = active.size;
    active.forEach(id => {
      const s = stats.get(id) || { maxConcurrent: 1 };
      if (k > s.maxConcurrent) s.maxConcurrent = k;
      stats.set(id, s);
    });
  };

  // Sweep through time points
  for (const p of points) {
    if (p.type === +1) {
      // Event starting - find leftmost free column
      let idx = columns.findIndex(v => v == null);
      if (idx === -1) { 
        idx = columns.length; 
        columns.push(null); 
      }
      columns[idx] = p.id;
      colOf.set(p.id, idx);
      active.add(p.id);
      touchStats();
    } else {
      // Event ending - free its column
      const idx = colOf.get(p.id);
      if (idx != null) columns[idx] = null;
      active.delete(p.id);
      touchStats();
    }
  }

  // Build final layout object
  const out = {};
  for (const e of norm) {
    const maxC = (stats.get(e.id)?.maxConcurrent) ?? 1;
    const col = colOf.get(e.id) ?? 0;
    const widthPct = 100 / maxC;
    const leftPct = col * widthPct;
    out[e.id] = { 
      columnIndex: col, 
      overlapCount: maxC, 
      leftPct, 
      widthPct 
    };
    
    console.log(`  → Event ${e.id} (${e.label || e.name}):`, {
      column: col,
      maxConcurrent: maxC,
      left: `${leftPct}%`,
      width: `${widthPct}%`,
    });
  }
  
  console.log('✅ Layout computed:', out);
  
  return out;
}

