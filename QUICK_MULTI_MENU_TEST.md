# Quick Test Guide: Multi-Menu Header

## Visual Test

Open http://localhost:5175

---

## ✅ Part 1: View Mode Dropdown

**Look for:**
```
[ Day ▼ ] ☑ Include weekends       Zoom: 100%
```

**Test:**
1. Click dropdown → Should show: Day, 3-Day, Week (Mon–Fri)
2. Select **Week** → Should see 5 date menus appear
3. Select **3-Day** → Should see 3 date menus appear
4. Select **Day** → Should see 1 date menu

**Expected:** ✅ Dropdown controls number of menus

---

## ✅ Part 2: Multi-Menu Display

### Week View (5 Menus)
```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ ← Mon, Oct 14 → │ Tue, Oct 15 │ Wed, Oct 16 │ Thu, Oct 17 │ Fri, Oct 18 │
│   [Today] ▼     │      ▼      │      ▼      │      ▼      │      ▼      │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

**Expected:**
- 5 menus in a row
- Only first menu has ← → arrows and Today button
- All menus have ▼ dropdown
- Even spacing

### 3-Day View (3 Menus)
```
┌─────────────┬─────────────┬─────────────┐
│ ← Mon, Oct 14 → │ Tue, Oct 15 │ Wed, Oct 16 │
│   [Today] ▼     │      ▼      │      ▼      │
└─────────────┴─────────────┴─────────────┘
```

**Expected:**
- 3 menus in a row
- Only first menu has controls

### Day View (1 Menu)
```
┌─────────────┐
│ ← Mon, Oct 14 → │
│   [Today] ▼     │
└─────────────┘
```

**Expected:**
- Single menu (unchanged from before)

---

## ✅ Part 3: Weekend Exclusion (Default)

**Initial State:** Checkbox **unchecked** (weekends excluded)

### Test in Week View
1. Select **Week** mode
2. Note the 5 days shown (should be Mon-Fri)
3. Click **→ arrow**
4. **Expected:** Jumps to **next Monday** (skips Sat/Sun)
5. Click **← arrow** multiple times
6. **Expected:** Always shows Mon-Fri, never Sat/Sun

### Test Weekend Snap
1. Click any menu's date to open picker
2. Select a **Saturday** in the calendar
3. **Expected:** Window snaps to **Monday** (2 days forward)
4. Try selecting **Sunday**
5. **Expected:** Window snaps to **Monday** (1 day forward)

### Test 3-Day Spanning Weekend
1. Select **3-Day** mode
2. Navigate to a **Friday**
3. **Expected:** Shows Fri, Mon, Tue (skips Sat/Sun)

---

## ✅ Part 4: Weekend Inclusion

**Enable:** Check "Include weekends" checkbox

### Test in Week View
1. Select **Week** mode with weekends enabled
2. Navigate to include a weekend
3. **Expected:** Can see Sat/Sun in the week view
4. Arrows move by literal 5/7 days (depending on implementation)

### Test Weekend Selection
1. Open any menu's picker
2. Select **Saturday**
3. **Expected:** Window includes Saturday (no snap to Monday)

---

## ✅ Part 5: Individual Menu Pickers

### Test Each Menu
1. **Week mode:** Click the **3rd menu** (Wednesday)
2. Picker should open under that menu
3. Select **October 20**
4. **Expected:** 
   - All menus update
   - Window now shows Oct 20-24 (Wed-Mon range)
   - Third menu shows Oct 22 (Wednesday of new week)

### Test Picker Behavior
1. Open a picker
2. Click outside → Picker closes without change
3. Open a picker
4. Press Escape → Picker closes without change
5. Open first menu's picker
6. Open second menu's picker → First closes, second opens

**Expected:** Only one picker open at a time

---

## ✅ Part 6: Header Updates

### Dynamic Header Text

**Week mode (weekends excluded):**
```
Mon, Oct 14 – Fri, Oct 18, 2025 Schedule
```

**Week mode (weekends included, spanning weekend):**
```
Sat, Oct 19 – Fri, Oct 25, 2025 Schedule
```

**3-Day mode:**
```
Mon, Oct 14 – Wed, Oct 16, 2025 Schedule
```

**Day mode:**
```
Mon, Oct 14, 2025 Schedule
```

**Test:** Switch between modes and verify header updates correctly

---

## ✅ Part 7: Navigation Edge Cases

### Friday → Monday (Weekend Excluded)
1. Navigate to **Friday, Oct 18**
2. Click **→ arrow** in Week mode
3. **Expected:** Jumps to **Monday, Oct 21** (shows Oct 21-25)

### Wednesday → Wednesday (Week Jump)
1. Navigate to **Wednesday, Oct 16**
2. In Week mode, click **→ arrow**
3. **Expected:** Shows **Oct 21-25** (Monday anchored, 5 days forward)

### Business Day Math
1. Navigate to **Monday, Oct 14**
2. Click **→ arrow** twice in Day mode
3. **Expected:** Shows **Wednesday, Oct 16** (2 business days forward)

---

## ✅ Part 8: Verify No Regressions

### Drag & Drop
1. **Create event:** Drag "Team Meeting" to calendar
2. **Expected:** Works normally, ghost preview shows

### Resize
1. **Resize event:** Drag bottom handle
2. **Expected:** Time labels show snapped times (8:00, 8:15, etc.)
3. **Expected:** Final time commits correctly

### Zoom
1. **Ctrl+Scroll** on calendar
2. **Expected:** Zooms in/out, percentage updates

### Modals
1. **Create overlapping events**
2. **Expected:** Overlap modal appears
3. **Test:** Allow and Cancel both work

---

## ✅ Part 9: Keyboard Shortcuts

| Key | Expected Action | Test |
|-----|----------------|------|
| `←` | Previous window | Navigate back, verify all menus update |
| `→` | Next window | Navigate forward, verify all menus update |
| `t` | Today | Jump to today, verify current mode preserved |
| `c` | Toggle picker | First menu's picker opens/closes |
| `Escape` | Close picker | Any open picker closes |

---

## ✅ Part 10: Responsive Layout

### Wide Screen
- All 5 menus visible side-by-side in Week view
- Even spacing maintained

### Narrow Screen
- Menus should stack or scroll (CSS Grid handles this)
- Controls remain accessible

**Test:** Resize browser window, verify layout adapts

---

## Expected Visuals

### Week View (Weekends Excluded)
```
View: [Week (Mon–Fri) ▼]  ☐ Include weekends     Zoom: 100%

← Mon, Oct 14 →  Tue, Oct 15  Wed, Oct 16  Thu, Oct 17  Fri, Oct 18
  [Today]  ▼        ▼            ▼            ▼            ▼

Mon, Oct 14 – Fri, Oct 18, 2025 Schedule
```

### 3-Day View
```
View: [3-Day ▼]  ☐ Include weekends     Zoom: 100%

← Mon, Oct 14 →  Tue, Oct 15  Wed, Oct 16
  [Today]  ▼        ▼            ▼

Mon, Oct 14 – Wed, Oct 16, 2025 Schedule
```

### Day View
```
View: [Day ▼]  ☐ Include weekends     Zoom: 100%

← Mon, Oct 14 →
  [Today]  ▼

Mon, Oct 14, 2025 Schedule
```

---

## Common Issues & Solutions

### Issue: Infinite Loop
**Symptom:** Browser freezes, "Maximum update depth exceeded"  
**Cause:** State not cached in dateStore  
**Solution:** ✅ Already fixed (cachedState pattern)

### Issue: Menus Don't Update Together
**Symptom:** Clicking arrows only updates one menu  
**Cause:** Not all menus listening to same store  
**Solution:** ✅ All use shared dateStore singleton

### Issue: Weekend Appears in Week View
**Symptom:** Saturday shows up when it shouldn't  
**Cause:** includeWeekends is true  
**Solution:** Uncheck "Include weekends" checkbox

### Issue: Picker Doesn't Close
**Symptom:** Multiple pickers open at once  
**Cause:** Outside click listener not working  
**Solution:** ✅ Each menu manages its own open state

---

## Quick Checklist

Run through these quickly to verify everything works:

1. [ ] Open http://localhost:5175
2. [ ] See Day/3-Day/Week dropdown
3. [ ] See "Include weekends" checkbox (unchecked)
4. [ ] Select Week → See 5 menus (Mon-Fri)
5. [ ] Click → arrow → Jumps to next Mon-Fri
6. [ ] Select 3-Day → See 3 menus
7. [ ] Select Day → See 1 menu
8. [ ] Click any menu date → Picker opens
9. [ ] Select new date → Window updates
10. [ ] Check "Include weekends" → Can navigate to Sat/Sun
11. [ ] Uncheck → Snaps back to weekday
12. [ ] Verify drag/drop still works
13. [ ] Verify resize still works
14. [ ] No console errors

---

**Test URL:** http://localhost:5175  
**Status:** Ready for testing  
**Expected Result:** All features working, no regressions

