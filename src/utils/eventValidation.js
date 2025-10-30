// Event validation utilities to prevent ghost/invalid events

/**
 * Validates an event for rendering and persistence
 * @param {Object} event - Event to validate
 * @returns {boolean} - True if event is valid
 */
export function isValidEvent(event) {
  if (!event) return false;
  
  // Must have an ID
  if (!event.id || event.id === '') return false;
  
  // Must have a label or name
  if (!event.label && !event.name && !event.title) return false;
  
  // Check for ghost/draft flags
  if (event.isGhost || event.isDraft || event.placeholder) return false;
  if (event.hidden || event.visibility === 'hidden') return false;
  if (event.opacity === 0) return false;
  
  // Check for valid time properties
  if (event.startMinutes !== undefined && event.startMinutes !== null) {
    if (isNaN(event.startMinutes) || event.startMinutes < 0) return false;
  }
  
  if (event.duration !== undefined && event.duration !== null) {
    if (isNaN(event.duration) || event.duration <= 0) return false;
  }
  
  // For backend events with UTC timestamps
  if (event.startUtc && event.endUtc) {
    const start = new Date(event.startUtc);
    const end = new Date(event.endUtc);
    if (isNaN(start) || isNaN(end) || start >= end) return false;
  }
  
  // Filter out system/non-user events unless explicitly allowed
  if (event.origin && event.origin !== 'user') return false;
  
  return true;
}

/**
 * Finds suspicious events for diagnostics
 * @param {Array} events - Array of events to check
 * @returns {Object} - Diagnostic report
 */
export function diagnoseEvents(events) {
  if (!Array.isArray(events)) return { total: 0, suspicious: [], valid: [] };
  
  const suspicious = [];
  const valid = [];
  
  events.forEach(e => {
    const issues = [];
    
    // Check various issues
    if (!e.id) issues.push('missing-id');
    if (!e.label && !e.name && !e.title) issues.push('missing-label');
    if (e.isGhost) issues.push('isGhost-flag');
    if (e.isDraft) issues.push('isDraft-flag');
    if (e.placeholder) issues.push('placeholder-flag');
    if (e.hidden) issues.push('hidden-flag');
    if (e.visibility === 'hidden') issues.push('visibility-hidden');
    if (e.opacity === 0) issues.push('opacity-zero');
    
    if (e.startMinutes !== undefined && (isNaN(e.startMinutes) || e.startMinutes < 0)) {
      issues.push('invalid-startMinutes');
    }
    
    if (e.duration !== undefined && (isNaN(e.duration) || e.duration <= 0)) {
      issues.push('invalid-duration');
    }
    
    if (e.startUtc && e.endUtc) {
      const start = new Date(e.startUtc);
      const end = new Date(e.endUtc);
      if (isNaN(start)) issues.push('invalid-startUtc');
      if (isNaN(end)) issues.push('invalid-endUtc');
      if (start >= end) issues.push('startUtc>=endUtc');
    }
    
    if (e.origin && e.origin !== 'user') {
      issues.push(`origin-${e.origin}`);
    }
    
    // Check for ghosty names
    const title = String(e.title || e.label || e.name || '').toLowerCase();
    if (['ghost', 'placeholder', 'draft', 'temp'].some(k => title.includes(k))) {
      issues.push('ghost-name');
    }
    
    if (issues.length > 0) {
      suspicious.push({ event: e, issues });
    } else {
      valid.push(e);
    }
  });
  
  return {
    total: events.length,
    suspicious,
    valid,
    suspiciousCount: suspicious.length,
    validCount: valid.length,
  };
}

/**
 * Cleans an array of events by removing invalid ones
 * @param {Array} events - Events to clean
 * @returns {Array} - Only valid events
 */
export function cleanEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.filter(isValidEvent);
}

/**
 * Normalizes event input for creation/update
 * @param {Object} event - Event to normalize
 * @returns {Object} - Normalized event
 */
export function normalizeEvent(event) {
  const normalized = { ...event };
  
  // Ensure has an ID
  if (!normalized.id || normalized.id === '') {
    normalized.id = `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }
  
  // Tag as user-created
  normalized.origin = 'user';
  
  // Remove ghost flags
  delete normalized.isGhost;
  delete normalized.isDraft;
  delete normalized.placeholder;
  delete normalized.hidden;
  
  // Ensure visibility
  if (normalized.visibility === 'hidden') {
    normalized.visibility = 'visible';
  }
  if (normalized.opacity === 0) {
    normalized.opacity = 1;
  }
  
  return normalized;
}

