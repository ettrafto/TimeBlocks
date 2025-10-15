# 📏 Duration-Based Heights & Ghost Preview Guide

## ✅ Implementation Complete!

Your time-blocking calendar now has:
1. ✨ **Duration-based event heights** - Events scale vertically based on their duration
2. 👻 **Border-only ghost preview** - Clear, unobtrusive placement indicator
3. 🎯 **Precise visual feedback** - See exactly where and how long the event will be

---

## 🎯 Key Features

### 1. **Task Templates with Duration**

Each task now has a specific duration:

| Task    | Duration | Height (4 slots = 1 hour) |
|---------|----------|---------------------------|
| Meeting | 30 min   | 40px (2 slots)            |
| Lunch   | 45 min   | 60px (3 slots)            |
| Workout | 60 min   | 80px (4 slots)            |
| Study   | 90 min   | 120px (6 slots)           |

**Calculation:**
```javascript
PIXELS_PER_HOUR = 80px
PIXELS_PER_MINUTE = 80 / 60 = 1.333px
MINUTES_PER_SLOT = 15

// Example: 60-minute event
height = 60 * 1.333 = 80px
```

---

### 2. **Ghost Preview (Border-Only)**

When dragging, you see a **dashed gray border** preview:

**Visual Design:**
- ✅ Border: 2px dashed gray (#9CA3AF)
- ✅ Background: Subtle gray (30% opacity)
- ✅ Height: Matches task duration
- ✅ Shows: Task name, start time, end time
- ✅ No solid fill or shadow

**Example:**
```
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
│  Workout          │  ← Ghost preview
│  2:00 PM - 3:00 PM│     (dashed border)
│                   │     Height = 80px (60 min)
└─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

---

### 3. **Scheduled Events (Full Display)**

Placed events show:
- ✅ Full color background
- ✅ Start and end times
- ✅ Duration label (for events > 30 min)
- ✅ Correct height based on duration

**Example - 90-minute Study block:**
```
┌───────────────────┐
│ Study             │ ← Blue background
│ 10:00 AM - 11:30 AM│
│                   │
│                   │  Height = 120px (90 min)
│                   │
│           90 min  │ ← Duration indicator
└───────────────────┘
```

---

## 🔧 Technical Implementation

### Height Calculation

```javascript
// Duration in minutes → Height in pixels
function minutesToPixels(minutes) {
  return minutes * PIXELS_PER_MINUTE;
}

// Examples:
minutesToPixels(15)  // = 20px  (1 slot)
minutesToPixels(30)  // = 40px  (2 slots)
minutesToPixels(60)  // = 80px  (4 slots)
minutesToPixels(90)  // = 120px (6 slots)
```

### Component Updates

#### **1. GhostEvent Component**
```javascript
function GhostEvent({ ghostPosition }) {
  const { startMinutes, task } = ghostPosition;
  const duration = task.duration || 30;
  const height = minutesToPixels(duration); // Calculate height!
  
  return (
    <div
      className="border-2 border-gray-400 border-dashed bg-gray-50 bg-opacity-30"
      style={{ 
        top: `${minutesToPixels(startMinutes)}px`,
        height: `${height}px`, // Duration-based height
      }}
    >
      {/* Preview content */}
    </div>
  );
}
```

**Key Changes:**
- Border: `border-2 border-gray-400 border-dashed` (no solid fill)
- Background: `bg-gray-50 bg-opacity-30` (subtle, not opaque)
- Height: Dynamically calculated from task duration
- Z-index: 20 (above events, visible during drag)

#### **2. ScheduledItem Component**
```javascript
function ScheduledItem({ item }) {
  const duration = item.duration || 30;
  const height = minutesToPixels(duration);
  const endMinutes = item.startMinutes + duration;
  
  return (
    <div
      style={{ 
        top: `${minutesToPixels(item.startMinutes)}px`,
        height: `${height}px`, // Scales with duration
      }}
    >
      <div className="font-semibold">{item.label}</div>
      <div className="text-xs">
        {formatTime(item.startMinutes)} - {formatTime(endMinutes)}
      </div>
      {duration > 30 && (
        <div className="text-xs">{duration} min</div>
      )}
    </div>
  );
}
```

**Key Features:**
- Height based on duration
- Shows time range (start - end)
- Duration label for longer events
- Flex layout for content spacing

#### **3. Task Templates (with Duration)**
```javascript
const TASK_TEMPLATES = [
  { id: 'workout', label: 'Workout', color: 'bg-blue-500', duration: 60 },
  { id: 'meeting', label: 'Meeting', color: 'bg-purple-500', duration: 30 },
  { id: 'lunch', label: 'Lunch', color: 'bg-green-500', duration: 45 },
  { id: 'study', label: 'Study', color: 'bg-orange-500', duration: 90 },
];
```

#### **4. Drop Handler (with Duration)**
```javascript
const newItem = {
  id: `scheduled-${nextId}`,
  label: task.label,
  color: task.color,
  startMinutes: finalMinutes,
  duration: task.duration || 30, // Include duration!
};
```

---

## 📊 Visual Comparison

### Ghost Preview vs. Real Event

```
GHOST PREVIEW (While Dragging):          REAL EVENT (After Drop):
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ┐                   ┌───────────────────┐
│  Meeting          │ Dashed border    │ Meeting           │ Solid color
│  2:00 - 2:30 PM   │ Gray text        │ 2:00 - 2:30 PM    │ White text
└─ ─ ─ ─ ─ ─ ─ ─ ─ ┘ 40px height      └───────────────────┘ 40px height
```

---

## 🎨 Height Scaling Examples

### Visual Grid Reference
```
Each slot = 15 minutes = 20px

8:00 AM  ═══════════════  ─┐
8:15     ───────────────   │ 30 min event
8:30     ───────────────  ─┤ = 40px (2 slots)
8:45     ───────────────  ─┘
9:00 AM  ═══════════════  ─┐
9:15     ───────────────   │
9:30     ───────────────   │ 60 min event
9:45     ───────────────   │ = 80px (4 slots)
10:00 AM ═══════════════  ─┘
10:15    ───────────────  ─┐
10:30    ───────────────   │
10:45    ───────────────   │
11:00 AM ───────────────   │ 90 min event
11:15    ───────────────   │ = 120px (6 slots)
11:30    ───────────────   │
11:45    ───────────────  ─┘
```

---

## 🧪 Testing Guide

### Test 1: Ghost Preview Height
```
1. Drag "Meeting" (30 min) over calendar
2. Expected: Ghost is 40px tall (2 time slots)
3. Drag "Workout" (60 min) over calendar
4. Expected: Ghost is 80px tall (4 time slots)
5. Drag "Study" (90 min) over calendar
6. Expected: Ghost is 120px tall (6 time slots)
```

### Test 2: Scheduled Event Height
```
1. Drop "Meeting" at 10:00 AM
2. Expected: Block spans 10:00 to 10:30 (2 slots)
3. Drop "Workout" at 2:00 PM
4. Expected: Block spans 2:00 to 3:00 (4 slots)
5. Drop "Study" at 9:00 AM
6. Expected: Block spans 9:00 to 10:30 (6 slots)
```

### Test 3: Ghost vs. Real Alignment
```
1. Drag "Lunch" (45 min) to 12:00 PM
2. Check: Ghost preview height
3. Drop the event
4. Verify: Real event has exact same height as ghost
5. Both should span 12:00 to 12:45 (3 slots)
```

### Test 4: Visual Distinction
```
1. Place a "Meeting" at 10:00 AM (solid purple)
2. Drag "Workout" over 11:00 AM (dashed border)
3. Expected: Clear visual difference:
   - Scheduled = solid color, shadow
   - Ghost = dashed border, no shadow
```

---

## 📝 Console Output Examples

### While Dragging:
```javascript
👻 Ghost preview: {
  time: '10:30 AM',
  duration: '60 min',
  height: '80px',
  position: '140px from top'
}
```

### On Drop:
```javascript
✅ Placed "Workout" at 2:00 PM (60 min duration, height: 80px)
```

---

## 🎯 Height Calculation Formula

```
Given:
- PIXELS_PER_HOUR = 80
- MINUTES_PER_SLOT = 15

Calculate:
1. PIXELS_PER_MINUTE = 80 / 60 = 1.333...
2. PIXELS_PER_SLOT = 1.333 * 15 = 20px

For any duration:
height = duration (minutes) × PIXELS_PER_MINUTE

Examples:
- 15 min: 15 × 1.333 = 20px   (1 slot)
- 30 min: 30 × 1.333 = 40px   (2 slots)
- 45 min: 45 × 1.333 = 60px   (3 slots)
- 60 min: 60 × 1.333 = 80px   (4 slots)
- 90 min: 90 × 1.333 = 120px  (6 slots)
```

---

## 🔍 Troubleshooting

### Issue: Ghost preview is too tall/short
**Check:**
```javascript
// In GhostEvent component
const duration = task.duration || 30;
const height = minutesToPixels(duration);
console.log('Ghost height:', height, 'for duration:', duration);
```

### Issue: Scheduled event wrong height
**Check:**
```javascript
// In ScheduledItem component
const duration = item.duration || 30;
const height = minutesToPixels(duration);
console.log('Event height:', height, 'for duration:', duration);
```

### Issue: Heights don't match time slots
**Verify:**
```javascript
// Expected values
minutesToPixels(15) === 20   // 1 slot
minutesToPixels(30) === 40   // 2 slots
minutesToPixels(60) === 80   // 4 slots
```

---

## 🎨 Styling Classes Reference

### Ghost Preview:
```css
border-2              /* 2px border width */
border-gray-400       /* Medium gray color */
border-dashed         /* Dashed style (not solid) */
bg-gray-50            /* Very light gray background */
bg-opacity-30         /* 30% opacity (subtle) */
rounded               /* Rounded corners */
```

### Scheduled Event:
```css
{task.color}          /* Full color background (e.g., bg-blue-500) */
text-white            /* White text */
shadow-lg             /* Large shadow for depth */
rounded               /* Rounded corners */
```

---

## ✅ Success Checklist

After implementation, verify:

- [ ] Task templates show duration (e.g., "30 minutes")
- [ ] Ghost preview has dashed gray border
- [ ] Ghost preview height matches task duration
- [ ] Dropped events have correct height
- [ ] Events show start time, end time, and duration
- [ ] 30-min event = 40px tall (2 slots)
- [ ] 60-min event = 80px tall (4 slots)
- [ ] 90-min event = 120px tall (6 slots)
- [ ] Ghost and real event heights match
- [ ] Console logs show duration and height info

---

## 🚀 Quick Test Commands

Open **http://localhost:5173** and:

1. **Check Task Templates:**
   - Look at left panel
   - Each task should show duration below name

2. **Test Ghost Preview:**
   - Drag "Meeting" (30 min)
   - Ghost should be 40px tall with dashed border
   - Drag "Study" (90 min)
   - Ghost should be 120px tall

3. **Test Real Events:**
   - Drop "Workout" at 10:00 AM
   - Should span exactly from 10:00 to 11:00 (80px)
   - Shows "10:00 AM - 11:00 AM" and "60 min"

4. **Check Console:**
   - Should see ghost height logs while dragging
   - Should see placement logs with duration on drop

---

## 💡 Key Improvements

### Before:
❌ Events had fixed height  
❌ Ghost preview was solid/opaque  
❌ No duration information  
❌ Hard to predict event length  

### After:
✅ Events scale with duration  
✅ Ghost preview is subtle border  
✅ Duration shown in multiple places  
✅ Visual preview matches final result  

---

## 🎬 User Experience Flow

```
1. User sees "Workout - 60 minutes" in left panel
   ↓
2. Starts dragging
   ↓
3. Ghost preview appears with dashed border (80px tall)
   ↓
4. Ghost shows "Workout 2:00 PM - 3:00 PM"
   ↓
5. User drops at 2:00 PM
   ↓
6. Solid blue block appears (80px tall)
   ↓
7. Block shows "Workout 2:00 PM - 3:00 PM 60 min"
   ↓
8. Perfect! Height matches 1-hour duration
```

---

## 📏 Height Reference Table

| Duration | Slots | Pixels | Visual Size      |
|----------|-------|--------|------------------|
| 15 min   | 1     | 20px   | Tiny             |
| 30 min   | 2     | 40px   | Small (Meeting)  |
| 45 min   | 3     | 60px   | Medium (Lunch)   |
| 60 min   | 4     | 80px   | Large (Workout)  |
| 90 min   | 6     | 120px  | X-Large (Study)  |
| 120 min  | 8     | 160px  | 2X-Large         |

---

Your calendar now provides **perfect visual feedback** - users can see exactly where events will land and how much time they'll occupy! 🎯

