# 🧪 Test All Features - Quick Reference

## 🚀 Open the App

**URL:** http://localhost:5173  
**Console:** Open F12 (watch for emoji logs!)

---

## ✅ 5-Minute Complete Test

### **1. Types Management (1 min)**
```
✓ Click "Types" button
✓ See 2 demo types: Work (2 events), Personal (1 event)
✓ Add new type: "Exercise", Orange color
✓ Click edit (✏️) on "Personal" → Change to "Life"
✓ Click delete (🗑️) on "Work" → See warning: "1 event(s)"
✓ Confirm deletion → "Team Meeting" loses type badge
Console: 🗑️ Deleted type: type-work - affected events: 1
```

### **2. Event Creation (1 min)**
```
✓ Click + button
✓ Create event:
  - Name: "Gym Session"
  - Duration: 60 minutes
  - Color: Red
  - Type: Exercise
✓ Event appears with "📁 Exercise" badge
Console: ➕ Created template: Gym Session
```

### **3. Event Deletion (30 sec)**
```
✓ Hover over "Lunch Break"
✓ See ✏️ and 🗑️ icons appear
✓ Click 🗑️
✓ Confirm deletion
✓ Template removed
Console: 🗑️ Deleted event: template-demo2 name: Lunch Break
```

### **4. Drag & Drop (1 min)**
```
✓ Drag "Gym Session" to calendar
✓ Watch ghost preview (dashed border, 80px tall)
✓ Drop at ~2:15 PM
✓ Event appears at 2:15 PM (red, 60 min)
Console: 👻 Ghost preview → ✅ Placed "Gym Session"
```

### **5. Overlap Detection (30 sec)**
```
✓ Drag another event to overlap "Gym Session"
✓ Modal appears: "Time Conflict Detected"
✓ Shows: Gym Session (2:15 PM - 3:15 PM)
✓ Click "Allow"
✓ Both events visible
Console: ⚠️ Overlap detected → ✅ User allowed overlap
```

### **6. Zoom & Scroll (1 min)**
```
✓ Hold Ctrl + Scroll Up → Calendar grows
✓ Header shows: "Zoom: 200%"
✓ Events get taller (maintain aspect ratio)
✓ Ctrl + Scroll Down → Calendar shrinks
✓ Click empty calendar space + Drag → Pans
Console: 🔍 Zoom → 📜 Scroll drag
```

---

## 📋 Checklist - All Features

### **Types System:**
- [ ] Types button visible
- [ ] Can create types
- [ ] Can edit types
- [ ] Can delete types
- [ ] Deletion shows warning if events reference type
- [ ] Type color swatches display
- [ ] Duplicate names prevented
- [ ] Event count shown per type

### **Event Templates:**
- [ ] Plus button visible
- [ ] Can create events
- [ ] Can edit events
- [ ] Can delete events
- [ ] Type dropdown works
- [ ] Type badge shows on cards
- [ ] Edit/delete icons on hover
- [ ] Duration options (15-120 min)
- [ ] Color picker works (10 colors)

### **Calendar:**
- [ ] Events drag from left panel
- [ ] Ghost preview appears
- [ ] Events snap to 15-min slots
- [ ] Events have correct height
- [ ] Can reposition events
- [ ] Ghost shows for repositioning
- [ ] Overlap detection works
- [ ] Modal shows conflicts

### **Zoom & Navigation:**
- [ ] Ctrl+Scroll zooms
- [ ] Zoom range: 50-400%
- [ ] Zoom indicator updates
- [ ] Click-drag scrolls
- [ ] Cursor changes to grab

### **Console Logs:**
- [ ] Type CRUD logs (➕ ✏️ 🗑️)
- [ ] Event CRUD logs (➕ ✏️ 🗑️)
- [ ] Drag logs (🚀 👻 ✅)
- [ ] Overlap logs (⚠️)
- [ ] Zoom logs (🔍)
- [ ] Scroll logs (📜)

---

## 🎯 Critical Tests

### **Test A: Type Deletion Cascade**
```
1. Note: "Team Meeting" has type "Work"
2. Click "Types"
3. Delete "Work" type
4. Confirm warning
5. Verify: "Team Meeting" no longer shows type badge
6. Verify: Event still works (drag to calendar)
```

### **Test B: Event Deletion Independence**
```
1. Drag "Team Meeting" to 10:00 AM
2. Drag "Team Meeting" to 2:00 PM (2nd instance)
3. Delete "Team Meeting" template
4. Verify: Both scheduled instances remain
5. Verify: Can't drag "Team Meeting" anymore (template gone)
```

### **Test C: Zoom Consistency**
```
1. Place event at 10:00 AM (default zoom)
2. Zoom to 200%
3. Event height doubles
4. Ghost preview also doubles
5. Drop new event → Correct height
6. Zoom to 50%
7. All events shrink proportionally
```

---

## 📊 Expected Results

### **After 5-Minute Test:**
- ✅ 1 type deleted (Work)
- ✅ 1 type created (Exercise)
- ✅ 1 type edited (Personal → Life)
- ✅ 1 event deleted (Lunch Break)
- ✅ 1 event created (Gym Session)
- ✅ 2+ events scheduled on calendar
- ✅ 1+ overlap detected and allowed
- ✅ Zoom tested (150-200%)
- ✅ Scroll-drag tested

### **Console Should Show:**
```
🗑️ Deleted type: type-work - affected events: 1
➕ Created type: Exercise
✏️ Updated type: Life
🗑️ Deleted event: template-demo2 name: Lunch Break
➕ Created template: Gym Session
👻 Ghost preview: ... (multiple)
✅ Placed "Gym Session" at 2:15 PM
⚠️ Overlap detected with: Gym Session
✅ User allowed overlap - processing event: ...
🔍 Zoom: {from: '20.0px/slot', to: '40.0px/slot', percentage: '200%'}
```

---

## 🎬 Advanced Test Scenarios

### **Scenario 1: Type Reorganization**
```
Goal: Reorganize work events into new categories

1. Create types: "Meetings", "Focus", "Admin"
2. Edit existing events to use new types
3. Delete old "Work" type
4. Verify all events reassigned
```

### **Scenario 2: Template Library**
```
Goal: Build reusable template library

1. Create 10+ event templates
2. Assign types to organize
3. Use various durations (15-120 min)
4. Use all 10 colors
5. Schedule a full day
```

### **Scenario 3: Conflict Resolution**
```
Goal: Test overlap handling

1. Place event at 10:00 AM (60 min)
2. Try placing at 10:15 AM
3. Get overlap warning
4. Allow overlap
5. Try repositioning first event
6. Get overlap warning again
7. Cancel this time
```

---

## 💡 Pro Testing Tips

1. **Keep Console Open:** Watch logs in real-time
2. **Test Edge Cases:** Delete types with many events
3. **Try Extremes:** Zoom to 400%, create 120-min events
4. **Rapid Actions:** Click multiple things quickly
5. **Error Handling:** Try invalid inputs

---

## 📸 Screenshots to Verify

If sharing results, capture:

1. **Left Panel:** With multiple custom events and type badges
2. **Types Modal:** Showing types list with counts
3. **Calendar:** With events at different times/durations
4. **Overlap Modal:** Showing conflict warning
5. **Console:** With emoji logs visible
6. **Zoomed View:** At 200% showing larger slots

---

## ✅ Success Criteria

**All features working if:**
- ✅ Can create/edit/delete types
- ✅ Type deletion shows warning
- ✅ Can create/edit/delete events
- ✅ Events show type badges
- ✅ Ghost preview appears correctly
- ✅ Overlap detection triggers
- ✅ Zoom scales everything
- ✅ Scroll-drag pans calendar
- ✅ Console shows all expected logs
- ✅ No JavaScript errors
- ✅ Demo data loads on start

---

## 🎯 Quick Smoke Test (60 seconds)

```bash
1. Open app → See 2 demo events ✓
2. Click "Types" → See 2 types ✓
3. Delete "Work" → See warning ✓
4. Confirm → Event loses badge ✓
5. Close types modal ✓
6. Hover event → See icons ✓
7. Click delete → Confirm ✓
8. Click + → Create new ✓
9. Drag to calendar → Places ✓
10. Ctrl+Scroll → Zooms ✓
```

**All ✓? You're good to go!** 🎉

---

**Ready for comprehensive testing!** Start with the 5-minute test above! 🚀

