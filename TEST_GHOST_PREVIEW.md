# 🧪 Quick Test - Ghost Preview System

## ✅ Ready to Test!

The dev server is already running at **http://localhost:5173**

---

## 🎯 What to Expect

### 1. **Start Dragging**
- Grab any task from the left panel (e.g., "Meeting")
- Start dragging it toward the calendar

### 2. **See the Ghost** 👻
As soon as your cursor enters the calendar area:
- A **semi-transparent preview** block appears
- Same color as the task you're dragging
- Has a white border to distinguish it from real events
- Shows "👻 Preview" label

### 3. **Watch It Snap**
As you move your mouse vertically:
- The ghost **jumps** to the nearest 15-minute time slot
- It doesn't follow your cursor smoothly
- It snaps: 10:00 → 10:15 → 10:30 → 10:45, etc.

### 4. **Drop to Place**
When you release the mouse:
- The ghost disappears
- A real event appears **exactly where the ghost was**
- No surprises - it lands precisely where you saw the preview

---

## 🎬 Try These Tests

### Test 1: Basic Drag and Drop
```
1. Drag "Meeting" from left panel
2. Move it slowly over the calendar from 10:00 to 11:00
3. Watch the ghost snap to each 15-minute slot
4. Drop at ~10:27 AM
5. Expected: Event appears at 10:30 AM (where ghost was)
```

### Test 2: Visual Feedback
```
1. Drag "Workout" over the calendar
2. Position it between 2:00 PM and 2:15 PM
3. Notice: Ghost shows at either 2:00 or 2:15 (whichever is closer)
4. Move slightly - ghost might jump to the other slot
5. This shows the snap-to-grid in action!
```

### Test 3: Console Output
```
Open browser console (F12) and drag an event:

You'll see continuous logging:
  👻 Ghost preview at: 10:15 AM (135 minutes, 180px)
  👻 Ghost preview at: 10:30 AM (150 minutes, 200px)
  
Then on drop:
  ✅ Placed "Meeting" at 10:30 AM (ghost position)
```

### Test 4: Canceled Drag
```
1. Start dragging "Lunch"
2. Move over calendar (ghost appears)
3. Drag back to left panel (off calendar)
4. Release mouse
5. Expected: Ghost disappears, no event created
```

---

## 🎨 What You Should See

### The Ghost Preview:
- **Color**: Same as the task (blue for Workout, purple for Meeting, etc.)
- **Opacity**: 50% transparent
- **Border**: 2px white border
- **Position**: Snapped to 15-min grid
- **Label**: Shows task name + time + "👻 Preview"

### Comparison:
```
Left Panel Task:    Solid, full color, in left panel
Ghost Preview:      Semi-transparent, on calendar, shows where it will go
Real Event:         Solid, full color, on calendar, final placement
```

---

## 📊 Visual Example

```
8:00 AM  ─────────────
8:15     ─────────────
8:30     ─────────────    ← You move mouse here (8:27 AM)
         ╔═══════════╗
8:45     ║  Meeting  ║    ← Ghost snaps here (8:30 AM)
         ║  8:30 AM  ║
9:00 AM  ║👻 Preview ║
         ╚═══════════╝
9:15     ─────────────
```

---

## ✅ Success Checklist

After testing, verify:

- [ ] Ghost appears when dragging over calendar
- [ ] Ghost is semi-transparent (you can see grid lines through it)
- [ ] Ghost snaps to 15-minute increments (not smooth scrolling)
- [ ] Dropped event appears exactly where ghost was
- [ ] Ghost disappears after drop
- [ ] Can drag multiple events (ghost works each time)
- [ ] Console shows ghost position logs
- [ ] Dragging off calendar makes ghost disappear

---

## 🐛 Troubleshooting

### Issue: Ghost doesn't appear
**Check:**
- Is the cursor over the calendar grid?
- Check console - any errors?
- Try refreshing the page

### Issue: Ghost follows cursor exactly (not snapping)
**This is wrong!** Should snap to 15-min slots.
**Check:** Console for ghost position - should be multiples of 15

### Issue: Event appears at wrong position
**Check:** Did you drop on the calendar or off it?
**Look for:** Console message `✅ Placed "..." at [time] (ghost position)`

---

## 🎯 Expected Console Output

```
// When you start dragging:
(nothing - ghost doesn't exist yet)

// As you move over calendar:
👻 Ghost preview at: 10:00 AM (120 minutes, 160px)
👻 Ghost preview at: 10:00 AM (120 minutes, 160px)
👻 Ghost preview at: 10:15 AM (135 minutes, 180px)
👻 Ghost preview at: 10:15 AM (135 minutes, 180px)
👻 Ghost preview at: 10:30 AM (150 minutes, 200px)

// When you drop:
✅ Placed "Meeting" at 10:30 AM (ghost position)
```

---

## 💡 Pro Tips

1. **Precise Placement**: Watch the ghost, not your cursor
2. **Snap Zones**: Each 15-min slot has a "zone" - ghost snaps when you enter it
3. **Visual Confirmation**: Only drop when ghost is where you want the event
4. **Reusable Templates**: Tasks in left panel never disappear - drag them multiple times!

---

## 🚀 Ready?

Open **http://localhost:5173** and try dragging a task!

The ghost preview will guide you to the perfect time slot. ✨

