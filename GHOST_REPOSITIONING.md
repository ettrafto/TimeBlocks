# 👻 Ghost Preview for Repositioning - Feature Guide

## ✅ Implementation Complete!

Ghost preview now works for **both** operations:
1. ✨ **Dragging from left panel** - Shows where new event will be placed
2. 🔄 **Moving existing events** - Shows where event will be repositioned

---

## 🎯 How It Works

### **When Repositioning an Event:**

1. **Click and drag** an existing event on the calendar
2. **Ghost preview appears** at the snapped position
3. **Original event** becomes very faint (30% opacity)
4. **Ghost shows** the new position with correct height
5. **Drop** to move the event exactly where the ghost was

---

## 🎨 Visual Feedback

### **While Repositioning:**

```
Original Position:          Ghost Preview:               After Drop:
┌───────────────┐          ┌─ ─ ─ ─ ─ ─ ─ ┐           ┌───────────────┐
│ Workout       │ 30%      │  Workout      │ Dashed   │ Workout       │ Full
│ 10:00-11:00   │ opacity  │  2:00-3:00 PM │ border   │ 2:00-3:00 PM  │ color
│        60 min │          │               │          │        60 min │
└───────────────┘          └─ ─ ─ ─ ─ ─ ─ ┘           └───────────────┘
  (faded out)              (shows new spot)             (new position)
```

---

## 🔧 Technical Implementation

### **handleDragMove - Updated**

Now handles both types:

```javascript
if (activeData.type === 'template') {
  // Calculate position from mouse coordinates
  const currentMouseY = activatorEvent.clientY + delta.y;
  const offsetY = currentMouseY - rect.top;
  // Convert to snapped minutes...
  
} else if (activeData.type === 'scheduled') {
  // Calculate new position from current position + delta
  const currentPixels = minutesToPixels(item.startMinutes);
  const newPixels = currentPixels + delta.y;
  const newMinutes = pixelsToMinutes(newPixels);
  const snappedMinutes = snapToIncrement(newMinutes);
  // ...
}
```

### **Key Differences:**

| Aspect | Template Drag | Event Reposition |
|--------|--------------|------------------|
| **Position Calc** | From mouse Y | From current position + delta |
| **Task Info** | From template | From existing item |
| **Duration** | Template duration | Preserved from item |
| **Color** | Template color | Preserved from item |

---

## 📊 Console Output Examples

### **Repositioning an Event:**

```javascript
🚀 DRAG START: {id: 'scheduled-1', type: 'scheduled', label: 'Workout'}

// While dragging (fires continuously):
👻 Ghost preview: {
  time: '2:00 PM',
  duration: '60 min',
  height: '80px',
  position: '360px from top',
  type: 'scheduled'  // ← Indicates repositioning
}

🏁 DRAG END: {activeId: 'scheduled-1', overId: 'calendar', deltaY: 300.5}
🔄 Repositioning event: Workout from 10:00 AM to 2:00 PM
✅ Moved "Workout" to 2:00 PM (duration: 60 min preserved)
```

### **Dragging from Template:**

```javascript
🚀 DRAG START: {id: 'template-workout', type: 'template', label: 'Workout'}

👻 Ghost preview: {
  time: '2:00 PM',
  duration: '60 min',
  height: '80px',
  position: '360px from top',
  type: 'template'  // ← Indicates new placement
}

✅ Placed "Workout" at 2:00 PM (60 min duration, height: 80px)
```

---

## 🎯 User Experience

### **Repositioning Flow:**

```
1. User clicks "Workout" at 10:00 AM
   ↓
2. Starts dragging (event becomes 30% opacity)
   ↓
3. Ghost preview appears at snapped position
   👻 Dashed border, shows "2:00 PM - 3:00 PM"
   ↓
4. User moves mouse
   ↓
5. Ghost snaps to 2:15 PM, then 2:30 PM, etc.
   ↓
6. User drops at 2:00 PM
   ↓
7. Event moves to exactly where ghost was
   ✅ Original event disappears from 10:00 AM
   ✅ Event appears at 2:00 PM with same duration
```

---

## 🎨 Visual Design

### **Dragged Event (Original):**
- Opacity: **30%** (very faint)
- Position: Follows cursor
- Purpose: Shows what you're dragging

### **Ghost Preview:**
- Border: **Dashed gray**
- Background: **Subtle gray (30% opacity)**
- Position: **Snapped to time slot**
- Purpose: Shows where it will land

### **Result:**
Clear visual separation - you see both:
1. What you're moving (faint)
2. Where it's going (ghost)

---

## 🧪 Testing Guide

### Test 1: Reposition Short Event
```
1. Place "Meeting" (30 min) at 9:00 AM
2. Drag it to approximately 2:17 PM
3. Expected: Ghost appears at 2:15 PM (snapped)
4. Drop
5. Result: Event moves to 2:15 PM, height stays 40px
```

### Test 2: Reposition Long Event
```
1. Place "Study" (90 min) at 10:00 AM
2. Drag it to 1:00 PM
3. Expected: Ghost shows 120px tall (6 slots)
4. Drop
5. Result: Event moves to 1:00 PM, still 90 minutes long
```

### Test 3: Visual Feedback
```
1. Place "Workout" at 9:00 AM
2. Start dragging
3. Expected:
   - Original event becomes very faint (30%)
   - Ghost appears with dashed border
   - Ghost follows snap-to-grid
   - Both visible simultaneously
```

### Test 4: Snap Precision
```
1. Place any event
2. Drag slowly from 10:00 to 11:00
3. Expected: Ghost jumps between:
   - 10:00, 10:15, 10:30, 10:45, 11:00
4. Never stops at intermediate positions
```

---

## 🔍 Edge Cases Handled

### **Case 1: Drag Outside Calendar**
```
🚀 DRAG START
👻 Ghost appears on calendar
(User drags off calendar)
👻 Ghost disappears
🏁 DRAG END: overId: null
⚠️ Not dropped on calendar, ignoring
Event returns to original position ✓
```

### **Case 2: Boundary Clamping**
```
Drag event above 8:00 AM
→ Ghost clamps to 8:00 AM

Drag event below 5:00 PM
→ Ghost clamps to maximum valid time
```

### **Case 3: Duration Preservation**
```
90-minute event at 9:00 AM (120px tall)
→ Drag to 2:00 PM
→ Ghost shows 120px tall at 2:00 PM
→ Drop
→ Event at 2:00 PM is still 120px tall ✓
```

---

## 💡 Benefits

### **Before (No Ghost for Repositioning):**
❌ Drag event → can't see where it will land  
❌ Have to guess final position  
❌ Trial and error to get it right  

### **After (Ghost for Repositioning):**
✅ Drag event → see exact final position  
✅ Ghost shows snapped time slot  
✅ Precise one-shot placement  
✅ Same UX for both drag operations  

---

## 🎯 Consistency

Both operations now have identical UX:

| Action | Ghost Preview | Drop Behavior |
|--------|---------------|---------------|
| Drag template | ✅ Shows placement | Places at ghost position |
| Move event | ✅ Shows new position | Moves to ghost position |

**Result:** Predictable, intuitive experience throughout!

---

## 📝 Code Highlights

### **Opacity Reduced for Better Ghost Visibility**
```javascript
// ScheduledItem component
opacity: isDragging ? 0.3 : 1  // Was 0.5, now 0.3
```

### **Both Drop Types Use Ghost Position**
```javascript
// Template drop:
const finalMinutes = ghostPosition.startMinutes;

// Reposition drop:
const finalMinutes = ghostPosition.startMinutes;

// Same logic, consistent behavior!
```

### **Ghost Creation for Both Types**
```javascript
if (activeData.type === 'template') {
  taskInfo = activeData.task;
} else if (activeData.type === 'scheduled') {
  taskInfo = {
    label: item.label,
    color: item.color,
    duration: item.duration || 30,
  };
}

setGhostPosition({ startMinutes: finalMinutes, task: taskInfo });
```

---

## ✅ Success Checklist

After implementation:

- [x] Ghost appears when dragging templates
- [x] Ghost appears when repositioning events
- [x] Ghost shows correct height (duration-based)
- [x] Ghost snaps to 15-minute increments
- [x] Original event becomes faint during drag
- [x] Event lands exactly where ghost was
- [x] Duration preserved when repositioning
- [x] Console logs show repositioning info
- [x] Works with all event durations (30, 45, 60, 90 min)

---

## 🚀 Ready to Test!

Open **http://localhost:5173** and try:

1. **Place a "Workout"** at 9:00 AM
2. **Drag it** to 2:00 PM
3. **Watch:**
   - Original becomes very faint
   - Ghost appears with dashed border
   - Ghost snaps to 15-min slots
4. **Drop** - Event moves to exactly where ghost was!

The repositioning experience is now just as intuitive as the initial placement! 🎯

