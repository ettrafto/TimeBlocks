# 📏 Event Resizing Feature Guide

## ✅ Implementation Complete!

Your time-blocking calendar now supports **vertical event resizing**:

1. **📏 Drag Top Edge** - Adjust start time and duration
2. **📏 Drag Bottom Edge** - Adjust end time (duration only)
3. **⚡ Live Preview** - See changes in real-time while dragging
4. **🎯 Snap-to-Grid** - Automatically snaps to 15-minute increments
5. **⚠️ Overlap Detection** - Warns if resize creates conflicts
6. **🔍 Zoom-Aware** - Works correctly at all zoom levels

---

## 🎯 How to Use

### **Resize Bottom Edge (Change Duration):**
```
1. Place an event on the calendar (e.g., "Meeting" at 10:00 AM, 30 min)
2. Hover over the bottom edge
3. Cursor changes to vertical resize (↕️)
4. Click and drag down
5. Watch the event grow and time update in real-time
6. Release to apply
```

### **Resize Top Edge (Change Start Time & Duration):**
```
1. Hover over the top edge of an event
2. Cursor changes to vertical resize (↕️)
3. Click and drag up or down
4. Start time adjusts, duration compensates
5. Watch live preview
6. Release to apply
```

---

## 🎨 Visual Design

### **Resize Handles:**

**Top Handle:**
```
┌─────────────────────┐
│ ▬▬▬▬                │ ← White nub (visible on hover)
│ Team Meeting        │
│ 10:00 AM - 10:30 AM │
│                     │
└─────────────────────┘
```

**Bottom Handle:**
```
┌─────────────────────┐
│ Team Meeting        │
│ 10:00 AM - 10:30 AM │
│                     │
│ ▬▬▬▬                │ ← White nub (visible on hover)
└─────────────────────┘
```

### **During Resize:**
```
Original (30% opacity):    Live Preview (full opacity):
┌─────────────────────┐   ┌─────────────────────┐
│ Meeting             │   │ Meeting             │
│ 10:00 - 10:30       │   │ 10:00 - 11:00       │ ← Updated!
└─────────────────────┘   │                     │
                           │            60 min   │
                           └─────────────────────┘
```

---

## 🔧 Technical Implementation

### **Resize State:**
```javascript
const [isResizing, setIsResizing] = useState(false);
const [resizeTarget, setResizeTarget] = useState({
  id: 'scheduled-1',
  edge: 'end',              // 'start' or 'end'
  originalStart: 120,        // 10:00 AM
  originalDuration: 30,
  startClientY: 452.5,
});
const [resizeDraft, setResizeDraft] = useState({
  ...item,
  startMinutes: 120,
  duration: 60,              // Live updated during resize
});
```

### **Resize Logic:**

#### **Bottom Edge (Change Duration):**
```javascript
if (edge === 'end') {
  // User drags bottom edge
  const newEnd = minuteAtPointer;  // Where mouse is now
  
  // Calculate new range
  const { start, duration } = computeSnappedRange(
    originalStart,  // Keep start time
    newEnd          // New end time
  );
  
  // Result: Start stays same, duration changes
}
```

#### **Top Edge (Change Start & Duration):**
```javascript
if (edge === 'start') {
  // User drags top edge
  const newStart = minuteAtPointer;  // Where mouse is now
  
  // Calculate new range
  const { start, duration } = computeSnappedRange(
    newStart,       // New start time
    originalEnd     // Keep end time
  );
  
  // Result: Start changes, duration compensates
}
```

### **Snapping Algorithm:**
```javascript
function computeSnappedRange(startMin, endMin) {
  // Snap both to 15-min increments
  const snappedStart = snapToIncrement(startMin);
  const snappedEnd   = snapToIncrement(endMin);
  
  // Ensure proper order
  const start = Math.min(snappedStart, snappedEnd);
  const end   = Math.max(snappedStart, snappedEnd);
  
  // Calculate duration with minimum of 15 min
  const duration = clampDuration(end - start);
  
  return { start, duration };
}
```

---

## 📊 Examples

### **Example 1: Extend Meeting**
```
Original:
  Meeting: 10:00 AM - 10:30 AM (30 min)

User drags bottom edge to 10:52 AM

Live Preview:
  Meeting: 10:00 AM - 10:45 AM (45 min)
  (Snapped to nearest 15-min: 10:45)

Result:
  Meeting: 10:00 AM - 10:45 AM (45 min) ✓
```

### **Example 2: Move Start Time Earlier**
```
Original:
  Lunch: 12:00 PM - 12:45 PM (45 min)

User drags top edge to 11:47 AM

Live Preview:
  Lunch: 11:45 AM - 12:45 PM (60 min)
  (Start snapped to 11:45, end stays at 12:45)

Result:
  Lunch: 11:45 AM - 12:45 PM (60 min) ✓
```

### **Example 3: Shrink Event**
```
Original:
  Workout: 2:00 PM - 3:00 PM (60 min)

User drags bottom edge up to 2:23 PM

Live Preview:
  Workout: 2:00 PM - 2:15 PM (15 min)
  (Cannot go below 15 min minimum)

Result:
  Workout: 2:00 PM - 2:15 PM (15 min) ✓
```

---

## 🧪 Testing Scenarios

### **Test 1: Basic Bottom Resize**
```
1. Place "Meeting" at 10:00 AM (30 min)
2. Hover bottom edge → Cursor changes to ↕️
3. Drag down to approximately 11:07 AM
4. Watch: Event grows, time updates to "10:00 AM - 11:00 AM"
5. Release
6. Expected: Event is now 60 minutes (4 slots tall)
```

### **Test 2: Basic Top Resize**
```
1. Place "Lunch" at 12:00 PM (45 min)
2. Hover top edge → Cursor changes to ↕️
3. Drag up to approximately 11:47 AM
4. Watch: Start time updates to "11:45 AM - 12:45 PM"
5. Release
6. Expected: Event starts earlier, duration increased
```

### **Test 3: Minimum Duration**
```
1. Place event (any duration)
2. Drag bottom edge very close to top
3. Expected: Stops at 15 minutes minimum
4. Cannot make it smaller
```

### **Test 4: Boundary Clamping**
```
1. Place event at 8:15 AM
2. Drag top edge above 8:00 AM
3. Expected: Clamps to 8:00 AM (cannot go earlier)

4. Place event at 4:45 PM
5. Drag bottom edge below 5:00 PM
6. Expected: Clamps to 5:00 PM (cannot go later)
```

### **Test 5: Overlap Detection on Resize**
```
1. Place "Meeting" at 10:00 AM (30 min)
2. Place "Lunch" at 11:00 AM (45 min)
3. Drag "Meeting" bottom edge down to overlap "Lunch"
4. Release
5. Expected: Overlap modal appears
6. Shows: "Meeting overlaps with Lunch (11:00-11:45)"
7. Click "Allow" → Both events visible
```

### **Test 6: Zoom Compatibility**
```
1. Place event at 100% zoom
2. Zoom to 200%
3. Resize event (drag handles)
4. Expected: Resize works correctly at new zoom
5. Snapping still precise (15-min increments)
6. Visual handles scale appropriately
```

---

## 📝 Console Logging

### **Resize Start:**
```javascript
🔧 Resize START: {
  event: 'Team Meeting',
  edge: 'end',
  startTime: '10:00 AM'
}
```

### **Resize End (No Overlap):**
```javascript
🔧 Resize END: {
  event: 'Team Meeting',
  newStart: '10:00 AM',
  newDuration: '60 min'
}
✅ Resize applied: Team Meeting
```

### **Resize End (With Overlap):**
```javascript
🔧 Resize END: {
  event: 'Team Meeting',
  newStart: '10:00 AM',
  newDuration: '90 min'
}
⚠️ Resize creates overlap with: Lunch Break
// Modal appears
✅ User allowed overlap - processing event: Team Meeting
```

---

## 🎯 Resize Handle Behavior

### **Visual Feedback:**
- **Cursor:** Changes to `ns-resize` (↕️) on hover
- **Highlight:** Handle area brightens on hover
- **Nub:** Small white bar shows exact drag point
- **Height:** Handle is 2px tall (invisible but clickable)
- **Position:** Top handle at -1px, bottom at -1px (slightly outside event)

### **Interaction:**
- **Click & Hold:** Starts resize
- **Drag:** Updates live preview
- **Release:** Applies change (or shows overlap modal)
- **Quick Click:** No change (no accidental resizes)

---

## 🔧 Edge Cases Handled

### **1. Minimum Duration Enforcement:**
```
Try to resize to 5 minutes
→ Clamps to 15 minutes minimum
→ Cannot create events shorter than 1 slot
```

### **2. Calendar Boundary Clamping:**
```
Drag top edge above 8:00 AM
→ Clamps to 8:00 AM

Drag bottom edge below 5:00 PM
→ Clamps to 5:00 PM (total calendar minutes)
```

### **3. Snap-to-Grid:**
```
Drag to 10:07 AM
→ Snaps to 10:00 AM

Drag to 10:23 AM
→ Snaps to 10:15 AM

Always rounds to nearest 15-minute increment
```

### **4. Overlap During Resize:**
```
Resize creates conflict
→ Shows existing overlap modal
→ User can Allow or Cancel
→ Cancel reverts to original size
→ Allow applies new size
```

### **5. Drag vs Resize:**
```
Click middle of event
→ Starts drag-to-move (existing behavior)

Click top/bottom edge
→ Starts resize (new behavior)

stopPropagation() prevents conflicts
```

### **6. Resize During Active Drag:**
```
If user somehow triggers resize while dragging
→ Resize handlers check isResizing state
→ Prevents conflicting operations
```

---

## 💡 Use Cases

### **Use Case 1: Meeting Ran Long**
```
Scheduled: Team Meeting 10:00-10:30 (30 min)
Reality: Meeting went until 11:00
Action: Drag bottom edge down to 11:00
Result: Updated to reflect actual 60 minutes
```

### **Use Case 2: Start Earlier Than Planned**
```
Scheduled: Lunch 12:00-12:45 (45 min)
Reality: Started eating at 11:45
Action: Drag top edge up to 11:45
Result: Event now 11:45-12:45 (60 min)
```

### **Use Case 3: Quick Task Took Longer**
```
Scheduled: Email 2:00-2:15 (15 min)
Reality: Took 45 minutes
Action: Drag bottom edge to 2:45
Result: Event now 2:00-2:45 (45 min)
```

---

## 🎨 Visual States

### **Normal State:**
```
┌─────────────────────┐
│ Team Meeting        │  No special cursor
│ 10:00 AM - 10:30 AM │  Normal grab cursor on body
└─────────────────────┘
```

### **Hover Top Edge:**
```
┌─────────────────────┐
│ ▬▬▬▬                │  ↕️ ns-resize cursor
│ Team Meeting        │
│ 10:00 AM - 10:30 AM │
└─────────────────────┘
```

### **Hover Bottom Edge:**
```
┌─────────────────────┐
│ Team Meeting        │
│ 10:00 AM - 10:30 AM │
│ ▬▬▬▬                │  ↕️ ns-resize cursor
└─────────────────────┘
```

### **During Resize:**
```
Original (faint):          Live Preview (solid):
┌─────────────────┐       ┌─────────────────┐
│ Meeting         │ 30%   │ Meeting         │ 100%
│ 10:00 - 10:30   │       │ 10:00 - 11:00   │
└─────────────────┘       │                 │
                           │        60 min   │
                           └─────────────────┘
```

---

## 🔍 Zoom Behavior

### **At 100% Zoom (Default):**
- 15 min = 20px
- 30 min = 40px
- 60 min = 80px
- Handles easy to see and click

### **At 200% Zoom:**
- 15 min = 40px
- 30 min = 80px
- 60 min = 160px
- Larger hit targets, easier to resize precisely

### **At 50% Zoom:**
- 15 min = 10px
- 30 min = 20px
- 60 min = 40px
- Smaller handles, more compact view

**Resize works correctly at all zoom levels!**

---

## 📊 Calculation Examples

### **Example: Extending 30-min Meeting to 60 min**

```
Initial State:
- Start: 10:00 AM (120 minutes)
- Duration: 30 minutes
- End: 10:30 AM (150 minutes)
- Height: 40px (at 100% zoom)

User drags bottom to 11:07 AM:
1. Mouse at: ~300px from calendar top
2. Convert to minutes: 300 ÷ 1.33 = 225 minutes
3. Snap to 15-min: round(225/15)*15 = 15*15 = 225 minutes (11:00 AM)
4. Calculate duration: 225 - 120 = 105 minutes
5. Snap duration: Already at 15-min boundary
6. Clamp duration: max(15, 105) = 105 minutes

Result:
- Start: 10:00 AM (unchanged)
- Duration: 105 minutes (changed)
- End: 11:45 AM (calculated)
- Height: 140px (at 100% zoom)
```

---

## 🚨 Edge Cases & Limits

### **Minimum Duration: 15 Minutes**
```
Cannot resize below 1 time slot
- Try to drag bottom edge to top
- Stops at 15-minute minimum
- Prevents invalid durations
```

### **Calendar Boundaries:**
```
Start cannot be < 8:00 AM (0 minutes)
End cannot be > 5:00 PM (540 minutes)

Resize clamps to these bounds automatically
```

### **Snap Behavior:**
```
Every drag movement snaps to 15-minute grid:
- Drag to 10:07 → Snaps to 10:00
- Drag to 10:23 → Snaps to 10:30
- No intermediate positions
```

### **Overlap Modal Reuse:**
```
Same modal used for:
- Drag-and-drop conflicts
- Repositioning conflicts
- RESIZE conflicts (NEW!)

Consistent UX across all operations
```

---

## 🎯 Interaction Matrix

| User Action | Original Behavior | New Behavior |
|-------------|-------------------|--------------|
| Click event body | Drag to move | Drag to move (unchanged) |
| Click top edge | Drag to move | Resize from top (NEW!) |
| Click bottom edge | Drag to move | Resize from bottom (NEW!) |
| Hover top/bottom | Grab cursor | Vertical resize cursor (NEW!) |
| During resize | N/A | Live preview updates (NEW!) |

---

## 📝 Implementation Details

### **Components Modified:**

#### **1. App Component:**
- Added resize state (isResizing, resizeTarget, resizeDraft)
- Added calendarDomRef
- Added resize handlers (Start, Move, End)
- Added window event listeners
- Pass new props to CalendarGrid

#### **2. ScheduledItem Component:**
- Added onResizeStart prop
- Added top resize handle (div)
- Added bottom resize handle (div)
- Handles call onResizeStart with stopPropagation
- Visual nubs for better UX

#### **3. CalendarGrid Component:**
- Accept calendarDomRef prop
- Set ref in combined ref callback
- Accept resizeDraft prop
- Accept onResizeStart prop
- Render resizeDraft over normal items
- Pass onResizeStart to ScheduledItem

#### **4. Utility Functions:**
- `clampMinutesToDay()` - Keep within 0-540 minutes
- `clampDuration()` - Minimum 15 minutes
- `computeSnappedRange()` - Snap start and end, calculate duration

---

## 🧪 Complete Test Plan

### **Test Suite 1: Bottom Edge Resize**
```
✓ Resize 30-min event to 45 min
✓ Resize 30-min event to 60 min
✓ Resize 60-min event to 90 min
✓ Try to resize to 5 min → Stops at 15 min
✓ Resize down 3 slots (45 min increase)
✓ Resize at 200% zoom
✓ Resize at 50% zoom
```

### **Test Suite 2: Top Edge Resize**
```
✓ Move start time 15 min earlier
✓ Move start time 30 min earlier
✓ Move start time later (shrink event)
✓ Try to move above 8:00 AM → Clamps
✓ Resize while zoomed
```

### **Test Suite 3: Overlap Detection**
```
✓ Resize into another event
✓ See overlap modal
✓ Click "Allow" → Both events visible
✓ Resize again
✓ Click "Cancel" → Reverts to original size
```

### **Test Suite 4: Live Preview**
```
✓ While dragging, see time update
✓ While dragging, see duration update
✓ No flicker or jitter
✓ Smooth updates at all zoom levels
```

### **Test Suite 5: Edge Cases**
```
✓ Quick click (no move) → No change
✓ Resize then drag (both work)
✓ Drag then resize (both work)
✓ Zoom during resize → Still works
✓ Multiple rapid resizes → All work
```

---

## 💡 Pro Tips

### **Tip 1: Precise Resizing**
```
Zoom in to 200% before resizing
→ Larger handles
→ Easier to grab
→ More precise control
```

### **Tip 2: Quick Duration Adjustments**
```
Need to add 15 minutes?
→ Drag bottom edge down one slot
→ Snap ensures exactness
```

### **Tip 3: Reshaping Events**
```
Want to shift earlier without changing duration?
→ Drag top edge up same amount as bottom edge down
→ Or just use drag-to-move!
```

### **Tip 4: Visual Confirmation**
```
Watch the time label update in real-time
Shows exactly what you'll get
No surprises on release
```

---

## 🎓 Advanced Usage

### **Scenario: Back-to-Back Meetings**
```
1. Morning standup: 9:00-9:15 (15 min)
2. Team meeting: 9:15-10:00 (45 min)
3. Standup ran long → Resize to 9:30
4. Team meeting auto-detects overlap
5. Allow overlap (meetings overlapped in reality)
6. Both show on calendar
```

### **Scenario: Flexible Lunch Break**
```
1. Schedule lunch: 12:00-12:45
2. Started early → Drag top to 11:45
3. Finished late → Drag bottom to 1:00
4. Final: 11:45-1:00 (75 minutes)
5. Accurate representation of actual time
```

---

## ✅ Success Checklist

After implementation:

- [x] Can drag bottom edge to change duration
- [x] Can drag top edge to change start time
- [x] Handles visible on hover
- [x] Cursor changes to ns-resize
- [x] Live preview updates smoothly
- [x] Snaps to 15-minute increments
- [x] Minimum 15 minutes enforced
- [x] Calendar bounds respected
- [x] Overlap detection works
- [x] Overlap modal appears if needed
- [x] Works at all zoom levels
- [x] Console logs resize operations
- [x] Drag-to-move still works
- [x] No conflicts between drag and resize

---

## 🚀 Try It Now!

1. **Open** http://localhost:5173
2. **Drag** "Team Meeting" to 10:00 AM
3. **Hover** over the top or bottom edge
4. **See** cursor change to ↕️
5. **Click and drag** to resize
6. **Watch** the time update live
7. **Release** to apply!

**Your events are now fully resizable!** 📏✨

