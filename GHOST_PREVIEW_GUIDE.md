# 👻 Ghost Preview System - Implementation Guide

## Overview

The time-blocking calendar now uses a **shadow/ghost preview** system that shows exactly where an event will be placed **before** you drop it. This provides precise visual feedback and eliminates the awkward "grab offset" problem.

---

## 🎯 How It Works

### 1. **Drag Start**
When you start dragging a task from the left panel:
- The `handleDragStart` function is called
- Active item ID is stored
- Ghost position is cleared (reset to null)

### 2. **Drag Move (The Magic)**
As you move the mouse over the calendar:
- The `handleDragMove` function fires continuously
- It calculates the current mouse position relative to the calendar
- Converts the Y position to minutes
- **Snaps to the nearest 15-minute increment**
- Updates the ghost position state
- The ghost preview renders at the snapped position

```javascript
handleDragMove(event) {
  // Get mouse position
  const currentMouseY = activatorEvent.clientY + delta.y;
  const offsetY = currentMouseY - calendarRect.top;
  
  // Convert to minutes and snap
  const minutes = pixelsToMinutes(offsetY);
  const snappedMinutes = snapToIncrement(minutes); // Nearest 15-min slot
  
  // Update ghost preview
  setGhostPosition({
    startMinutes: snappedMinutes,
    task: draggedTask
  });
}
```

### 3. **Visual Feedback**
The `GhostEvent` component renders a semi-transparent preview:
- Same size and color as the actual event
- 50% opacity with white border
- Shows "👻 Preview" label
- Displays the snapped time slot
- **Cannot be interacted with** (pointer-events-none)

### 4. **Drop**
When you release the mouse:
- The `handleDragEnd` function is called
- It uses the **ghost position** (already snapped!) as the final placement
- Creates a new scheduled event at that exact position
- Clears the ghost preview

```javascript
handleDragEnd(event) {
  // Use the ghost's snapped position
  const finalMinutes = ghostPosition.startMinutes;
  
  // Create event at ghost position
  const newItem = {
    id: `scheduled-${nextId}`,
    startMinutes: finalMinutes, // Already snapped!
    ...
  };
  
  // Clear the ghost
  setGhostPosition(null);
}
```

---

## 🧩 Component Architecture

### 1. **App Component** (Main Controller)
```javascript
function App() {
  const [ghostPosition, setGhostPosition] = useState(null);
  
  // Handlers
  handleDragStart() { ... }
  handleDragMove() { ... }  // Updates ghost position
  handleDragEnd() { ... }   // Uses ghost position
}
```

**State:**
- `ghostPosition`: `{ startMinutes: number, task: object }` or `null`

### 2. **GhostEvent Component** (Preview Renderer)
```javascript
function GhostEvent({ ghostPosition }) {
  if (!ghostPosition) return null;
  
  return (
    <div className="opacity-50 border-2 border-white pointer-events-none">
      {/* Semi-transparent preview */}
    </div>
  );
}
```

**Key Features:**
- Only renders when `ghostPosition` is not null
- Positioned absolutely at `top: ${minutesToPixels(startMinutes)}px`
- `z-index: 20` (above scheduled items but below drag overlay)
- Non-interactive (`pointer-events-none`)

### 3. **CalendarGrid Component** (Container)
```javascript
function CalendarGrid({ scheduledItems, ghostPosition }) {
  return (
    <div ref={setNodeRef} data-droppable-id="calendar">
      {/* Time grid lines */}
      {/* Scheduled items */}
      <GhostEvent ghostPosition={ghostPosition} />
    </div>
  );
}
```

**Responsibilities:**
- Renders the droppable calendar area
- Displays scheduled events
- Renders the ghost preview on top

---

## 🎨 Visual Design

### Ghost Preview Styling
```css
opacity: 50%                  /* Semi-transparent */
border: 2px solid white       /* Distinguishes from real events */
z-index: 20                   /* Above events, below cursor */
pointer-events: none          /* Can't interact with it */
```

### Color Coding
- **Ghost preview**: Same color as task template, 50% opacity
- **Real event**: Full color, 100% opacity
- **Drag overlay**: Follows cursor, full opacity

---

## 📊 User Experience Flow

```
1. User grabs "Meeting" from left panel
   ↓
2. Drags over calendar at ~10:17 AM
   ↓
3. Ghost preview appears at 10:15 AM (snapped)
   👻 "Meeting" block at 10:15 AM (semi-transparent)
   ↓
4. User moves mouse to ~10:22 AM
   ↓
5. Ghost updates to 10:15 AM (still snapped)
   ↓
6. User moves mouse to ~10:27 AM
   ↓
7. Ghost jumps to 10:30 AM (snapped to next slot)
   ↓
8. User releases mouse
   ↓
9. Event placed at 10:30 AM (where ghost was)
   ✅ Ghost disappears, real event appears
```

---

## 🔧 Technical Details

### Snap Logic
```javascript
function snapToIncrement(minutes) {
  return Math.round(minutes / MINUTES_PER_SLOT) * MINUTES_PER_SLOT;
}

// Example:
snapToIncrement(127) // 127 minutes → 8.467 slots → round(8.467) = 8 → 120 minutes (10:00 AM)
snapToIncrement(133) // 133 minutes → 8.867 slots → round(8.867) = 9 → 135 minutes (10:15 AM)
```

### Position Calculation
```javascript
// Mouse Y → Offset from calendar top
const offsetY = currentMouseY - calendarRect.top;

// Offset → Minutes from start
const minutes = Math.round(offsetY / PIXELS_PER_MINUTE);

// Minutes → Snapped to 15-min
const snappedMinutes = Math.round(minutes / 15) * 15;

// Snapped minutes → Pixels for rendering
const ghostTopPosition = snappedMinutes * PIXELS_PER_MINUTE;
```

### Constants
```javascript
PIXELS_PER_HOUR = 80        // 80px = 1 hour
PIXELS_PER_MINUTE = 1.333   // ~1.33px = 1 minute
MINUTES_PER_SLOT = 15       // 15-minute increments
PIXELS_PER_SLOT = 20        // 20px = 15 minutes
```

---

## 🚀 Advantages Over Grab Offset Approach

### Previous Approach (Grab Offset):
❌ Complex calculation tracking where user clicked  
❌ Confusing when dragging from different parts of block  
❌ No visual feedback until drop  
❌ Hard to predict final position  

### Current Approach (Ghost Preview):
✅ **Visual feedback** - see exactly where it will land  
✅ **Intuitive** - preview matches final position  
✅ **Simple logic** - just snap current mouse position  
✅ **Predictable** - no surprises on drop  

---

## 📝 Console Logging

### During Drag Move:
```
👻 Ghost preview at: 10:15 AM (135 minutes, 180px)
👻 Ghost preview at: 10:15 AM (135 minutes, 180px)
👻 Ghost preview at: 10:30 AM (150 minutes, 200px)
```

### On Drop:
```
✅ Placed "Meeting" at 10:30 AM (ghost position)
```

---

## 🎯 Key Code Locations

### State Management
**File:** `App.jsx`, lines ~220-222
```javascript
const [ghostPosition, setGhostPosition] = useState(null);
```

### Drag Move Handler
**File:** `App.jsx`, lines ~242-296
```javascript
function handleDragMove(event) {
  // Calculate position
  // Snap to 15-min
  // Update ghost
}
```

### Ghost Component
**File:** `App.jsx`, lines ~163-179
```javascript
function GhostEvent({ ghostPosition }) {
  // Render preview
}
```

### Drop Handler
**File:** `App.jsx`, lines ~310-336
```javascript
if (activeData.type === 'template') {
  const finalMinutes = ghostPosition.startMinutes; // Use ghost!
}
```

---

## 🧪 Testing the Feature

### Test 1: Basic Snapping
1. Drag "Meeting" over calendar
2. Move slowly from 10:00 to 10:30
3. **Expected:** Ghost should jump between:
   - 10:00 AM
   - 10:15 AM
   - 10:30 AM
4. **No intermediate positions**

### Test 2: Visual Feedback
1. Drag "Workout" to 2:17 PM
2. **Expected:** Ghost shows at 2:15 PM (snapped)
3. Move to 2:23 PM
4. **Expected:** Ghost jumps to 2:30 PM
5. Drop
6. **Expected:** Event appears exactly where ghost was

### Test 3: Edge Cases
1. Drag above 8:00 AM
2. **Expected:** Ghost clamps to 8:00 AM
3. Drag below 5:00 PM
4. **Expected:** Ghost clamps to max valid time

### Test 4: Cancel Drop
1. Drag event over calendar
2. Ghost appears
3. Drag back to left panel (off calendar)
4. Release
5. **Expected:** Ghost disappears, no event created

---

## 🎨 Customization Options

### Change Ghost Opacity
```javascript
// In GhostEvent component
className="opacity-50"  // Change to opacity-30 or opacity-70
```

### Change Ghost Border
```javascript
border-2 border-white   // Try border-dashed or different colors
```

### Add Animation
```css
transition-all duration-150  // Smooth ghost movement
```

### Change Preview Label
```javascript
<div className="text-xs italic mt-1">👻 Preview</div>
// Change to "Drop here" or remove entirely
```

---

## 🔄 Comparison: Before vs After

### Before (No Preview):
```
User drags → ??? → Drop → Surprise! (Event at unexpected position)
```

### After (Ghost Preview):
```
User drags → 👻 Ghost shows exact position → Drop → ✓ Event at expected position
```

---

## 💡 Future Enhancements

Possible improvements to the ghost preview system:

1. **Duration Preview**: Show ghost with correct height (30min, 60min, etc.)
2. **Conflict Detection**: Red ghost if overlapping with existing event
3. **Snap Indicator**: Visual line showing the 15-min grid slot
4. **Multi-day**: Ghost preview across multiple day columns
5. **Resize Preview**: Ghost for drag-to-resize operations

---

## ✅ Summary

The ghost preview system provides:
- ✨ **Real-time visual feedback** while dragging
- 🎯 **Precise snapping** to 15-minute increments
- 🔮 **Predictable placement** - no surprises
- 🎨 **Clear visual distinction** between preview and real events
- 🚀 **Intuitive UX** - see before you commit

**Result:** Users can now confidently place events exactly where they want them, with full visual confirmation before dropping!

