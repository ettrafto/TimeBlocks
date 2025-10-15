# 🔧 Debug Guide - Event Repositioning

## Issue: Unable to Move Events

I've added detailed console logging to diagnose the issue. Let's test!

---

## 🧪 Quick Test

### Step 1: Place an Event
1. Open http://localhost:5173
2. Open browser console (F12)
3. Drag "Meeting" from left panel to 10:00 AM
4. **Expected console output:**
   ```
   🚀 DRAG START: { id: "template-meeting", type: "template", label: "Meeting" }
   👻 Ghost preview: { time: "10:00 AM", duration: "30 min", ... }
   🏁 DRAG END: { activeId: "template-meeting", overId: "calendar", activeType: "template" }
   ✅ Placed "Meeting" at 10:00 AM (30 min duration, height: 40px)
   ```

### Step 2: Try to Move the Placed Event
1. **Try to drag the "Meeting" block** you just placed
2. Drag it to 11:00 AM
3. **Check console output**

---

## 📊 What to Look For

### If Drag Doesn't Start:
```
(No console output at all)
```
**Issue:** Event isn't responding to mouse/touch
**Possible causes:**
- Z-index issue
- Pointer events blocked
- Drag sensor not attached

### If Drag Starts But Nothing Happens:
```
🚀 DRAG START: { id: "scheduled-1", type: "scheduled", label: "Meeting" }
🏁 DRAG END: { activeId: "scheduled-1", overId: "calendar", activeType: "scheduled" }
🔄 Repositioning event: Meeting from 10:00 AM
✅ Moved "Meeting" to 11:00 AM (duration: 30 min preserved)
```
**Issue:** Logs show it worked, but event didn't move visually
**Check:** React DevTools - is state updating?

### If Drop Not Detected:
```
🚀 DRAG START: { id: "scheduled-1", type: "scheduled", label: "Meeting" }
🏁 DRAG END: { activeId: "scheduled-1", overId: null, activeType: "scheduled" }
⚠️ Not dropped on calendar, ignoring
```
**Issue:** Calendar not detecting drop
**Fix needed:** Droppable zone configuration

---

## 🔍 Expected Behavior

### When Moving a Scheduled Event:

**Console Output:**
```
1. 🚀 DRAG START: { id: "scheduled-1", type: "scheduled", label: "Meeting" }
2. 🏁 DRAG END: { activeId: "scheduled-1", overId: "calendar", activeType: "scheduled" }
3. 🔄 Repositioning event: Meeting from 10:00 AM
4. ✅ Moved "Meeting" to 2:30 PM (duration: 30 min preserved)
```

**Visual:**
- Event follows cursor while dragging (at 50% opacity)
- Event snaps to new time slot on drop
- Height/duration stays the same
- Only position changes

---

## 🐛 Common Issues & Fixes

### Issue 1: Can't Click Event
**Symptom:** Cursor doesn't change to grab icon
**Debug:**
1. Inspect element in DevTools
2. Check computed styles: `cursor: grab`
3. Check z-index: should be 10
4. Check pointer-events: should NOT be none

**Quick Fix:**
- Make sure event has `cursor-grab` class
- Verify no overlapping elements

### Issue 2: Drag Starts But Drop Fails
**Symptom:** Console shows drag start but overId is null
**Debug:**
- Calendar droppable zone might not be covering full area
- Check calendar element has `data-droppable-id="calendar"`

### Issue 3: Event Moves But Snaps Back
**Symptom:** Event moves during drag but returns to original position
**Debug:**
- Check React state update in console
- Verify `🔄 Repositioning` and `✅ Moved` logs appear
- Check for state update errors

---

## 🔬 Manual Checks

### 1. Verify Event is Draggable
Open DevTools Elements tab:
```html
<div class="... cursor-grab active:cursor-grabbing z-10 ...">
  <!-- Event content -->
</div>
```
Should have:
- ✅ `cursor-grab` class
- ✅ `z-10` class
- ✅ `ref` from useDraggable
- ✅ No `pointer-events-none`

### 2. Check ScheduledItem Data
In React DevTools, find ScheduledItem component:
```javascript
props: {
  item: {
    id: "scheduled-1",
    label: "Meeting",
    color: "bg-purple-500",
    startMinutes: 120,
    duration: 30
  }
}
```

### 3. Verify Droppable Zone
Find the calendar grid element:
```html
<div data-droppable-id="calendar" class="relative bg-white ...">
  <!-- Calendar content -->
</div>
```

---

## 📝 Report Template

After testing, please report:

```
DRAG START LOG:
[Paste the 🚀 DRAG START log here]

DRAG END LOG:
[Paste the 🏁 DRAG END log here]

REPOSITIONING LOGS (if any):
[Paste the 🔄 and ✅ logs here]

VISUAL BEHAVIOR:
- Can you click the event? [Yes/No]
- Does cursor change to grab icon? [Yes/No]
- Does event follow mouse when dragging? [Yes/No]
- Does event move to new position on drop? [Yes/No]

BROWSER:
[Chrome/Firefox/Safari version]
```

---

## 🚀 If Everything Works

You should see:
1. ✅ Click event → cursor becomes grab icon
2. ✅ Drag event → it follows cursor (semi-transparent)
3. ✅ Drop event → it snaps to new time slot
4. ✅ Console shows all repositioning logs
5. ✅ Duration/height preserved

---

## 💡 Quick Fixes to Try

### Fix 1: Cursor Not Changing
Make sure the event block itself is receiving mouse events:
```javascript
className="... cursor-grab active:cursor-grabbing ..."
```

### Fix 2: Event Not Dragging
Check if drag sensor is active:
- Should see drag start log when you click and move
- If not, sensor might not be detecting pointer events

### Fix 3: Drop Not Working
Calendar might not be detecting drops:
- Verify droppable setup
- Check collision detection algorithm

---

Please test and paste the console output so I can diagnose the exact issue! 🔍

