// ========================================
// PHASE 1 DIAGNOSTICS - Duplicate Draggable Detection
// ========================================
// Module-level map to track how many ScheduledItems render per ID
const renderCountsPerFrame = new Map();
let frameCheckScheduled = false;
let isCurrentlyResizing = false; // Track if we're in a resize state

export function setResizingState(resizing) {
  isCurrentlyResizing = resizing;
}

export function trackScheduledItemRender(itemId) {
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

