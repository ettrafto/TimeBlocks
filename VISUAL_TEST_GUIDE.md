# Visual Test Guide - All Features

## Quick Visual Testing Checklist

Open http://localhost:5175 and follow this guide to verify all features.

---

## 🎨 Part 1: View Mode Toggle

### Visual Check
```
Expected to see:
┌─────────────────────────────┐
│ [W] [3] [D]                 │  ← Three buttons
│ ← Oct 15, 2025 → [Today]   │  ← Date navigation below
└─────────────────────────────┘
```

### Test Steps
1. **Visual:** Buttons should have dark semi-transparent background by default
2. **Click W:** Button turns bright white, header shows "Mon, Oct 14 – Sun, Oct 20, 2025 Schedule"
3. **Click → arrow:** Date jumps 7 days forward (entire week)
4. **Click 3:** Header shows "Mon, Oct 21 – Wed, Oct 23, 2025 Schedule" (3 consecutive days)
5. **Click → arrow:** Date moves 1 day forward (rolling window to Oct 22-24)
6. **Click D:** Header shows "Tue, Oct 22, 2025 Schedule" (single day)
7. **Click Today:** Jumps to current date, preserves D mode

**Expected Result:** ✅ All mode switches work, header updates correctly

---

## 📅 Part 2: Date Navigation

### Arrow Navigation
1. **Click ←:** Goes to previous period (mode-aware)
2. **Click →:** Goes to next period (mode-aware)
3. **Keyboard ←:** Same as clicking ← button
4. **Keyboard →:** Same as clicking → button

**Expected Result:** ✅ All navigation methods work

### Today Button
1. **Click Today:** Jumps to current date
2. **Press t key:** Same as clicking Today button

**Expected Result:** ✅ Both methods jump to today

### Calendar Picker
1. **Click date text:** Calendar popup opens
2. **Click any date:** Calendar closes, header updates to that date
3. **Click outside:** Calendar closes without change
4. **Press Escape:** Calendar closes without change
5. **Press c key:** Toggles calendar open/closed

**Expected Result:** ✅ All picker interactions work

---

## 🔄 Part 3: Drag & Drop (Verify No Regression)

### Template → Calendar
1. **Drag "Team Meeting" from left panel to calendar**
2. **Expected:** Ghost preview shows where event will land
3. **Release:** Event appears on calendar at snapped 15-min slot

**Expected Result:** ✅ Drag and drop works normally

### Reposition Event
1. **Drag scheduled event up or down on calendar**
2. **Expected:** Ghost preview follows mouse
3. **Release:** Event moves to new snapped position

**Expected Result:** ✅ Repositioning works normally

---

## 📏 Part 4: Resize (Verify Snapped Labels)

### Visual Test
1. **Create event on calendar** (drag from left panel)
2. **Hover over event:** Should see top and bottom resize handles (white nubs)
3. **Click and drag bottom handle down slowly**
4. **Watch time labels on event while dragging:**
   - Should show **clean 15-minute increments**
   - Example: "8:00 - 8:15", "8:00 - 8:30", "8:00 - 8:45"
   - Should NOT show raw times like "8:07 - 8:52"
5. **Release:** Event snaps to grid, final time matches what label showed

**Expected Result:** ✅ Time labels show snapped times during resize

### Edge Cases
1. **Resize very small:** Label should show minimum 15 minutes
2. **Resize across hour boundary:** Should show clean hour transitions (8:45 - 9:00)
3. **Resize to end of day:** Should clamp to 5:00 PM

**Expected Result:** ✅ All edge cases handled gracefully

---

## 🔍 Part 5: Zoom & Pan (Verify No Regression)

### Zoom
1. **Hold Ctrl and scroll up:** Calendar zooms in (larger slots)
2. **Hold Ctrl and scroll down:** Calendar zooms out (smaller slots)
3. **Check header:** Zoom percentage updates (50% - 400%)

**Expected Result:** ✅ Zoom works normally

### Pan
1. **Click and drag on empty calendar space:** Scrolls vertically
2. **Middle mouse drag:** Also scrolls

**Expected Result:** ✅ Drag-to-scroll works normally

---

## ⚠️ Part 6: Overlap Detection (Verify No Regression)

### Test Overlap
1. **Create first event:** Drop "Team Meeting" at 9:00 AM (30 min)
2. **Create overlapping event:** Drop "Lunch Break" at 9:15 AM (45 min)
3. **Expected:** Modal appears warning about overlap
4. **Click Allow:** Both events appear (overlapping)
5. **Try again with Cancel:** Event is discarded

**Expected Result:** ✅ Overlap detection works normally

---

## 🎨 Part 7: Visual Styling

### Header Controls Contrast
**Look for:**
- **Arrow buttons (← →):** Should be clearly visible, not faint
- **Date text:** Should be bold and readable
- **Today button:** Should be clearly visible
- **All buttons:** Should look "active/pressed" by default
- **Hover:** Buttons should become more subtle on hover (reverse effect)

**Expected Result:** ✅ All controls have good contrast

### View Mode Toggle
**Look for:**
- **Inactive buttons (W/3/D):** Dark semi-transparent background
- **Active button:** Bright white background with dark text
- **Hover inactive:** Becomes more transparent
- **Hover active:** Slightly lighter white

**Expected Result:** ✅ Reversed styling creates modern depth effect

---

## ⌨️ Part 8: Keyboard Shortcuts

### Test All Shortcuts
| Key | Expected Action | Visual Feedback |
|-----|----------------|-----------------|
| `←` | Previous period (mode-aware) | Header date updates |
| `→` | Next period (mode-aware) | Header date updates |
| `t` | Jump to today | Header shows current date |
| `c` | Toggle calendar picker | Calendar opens/closes |
| `Escape` | Close calendar picker | Calendar closes |

**Expected Result:** ✅ All keyboard shortcuts work

---

## 🐛 Part 9: Error States

### Console Check
1. **Open browser console** (F12)
2. **Look for errors:** Should see NONE
3. **Look for warnings:** May see a few (normal React warnings)
4. **No infinite loops:** Page should be stable

**Expected Result:** ✅ Clean console, no errors

### Edge Cases
1. **Rapidly click mode buttons:** Should not crash or flicker
2. **Rapidly navigate dates:** Should update smoothly
3. **Resize while switching modes:** Should handle gracefully
4. **Drag while switching modes:** Should handle gracefully

**Expected Result:** ✅ Robust error handling

---

## 📱 Part 10: Responsive Design

### Test Window Sizes
1. **Full screen:** All controls visible
2. **Narrow window:** Controls should still be accessible
3. **Zoom browser (Ctrl+Plus):** UI should scale properly

**Expected Result:** ✅ Responsive layout works

---

## ✅ Final Verification

### Checklist
- [ ] View mode toggle (W/3/D) renders and works
- [ ] Date navigation arrows work in all modes
- [ ] Today button jumps to current date
- [ ] Calendar picker opens/closes correctly
- [ ] Date range header updates per mode
- [ ] Week mode: arrows jump 1 week
- [ ] 3-day mode: shows 3 consecutive days
- [ ] Day mode: original behavior preserved
- [ ] Resize labels show snapped times (8:00, 8:15, not 8:07)
- [ ] Header controls are clearly visible (dark text)
- [ ] Reversed styling works (buttons look "active" by default)
- [ ] Keyboard shortcuts work (← → t c Escape)
- [ ] Drag & drop works
- [ ] Resize works
- [ ] Zoom works
- [ ] Pan works
- [ ] Overlap detection works
- [ ] No console errors
- [ ] No infinite loops
- [ ] Build succeeds

---

## 🎯 Expected Results Summary

After testing all features:

✅ **No regressions** - All original features work  
✅ **New features work** - View modes, navigation, snapped labels  
✅ **Good UX** - Clear contrast, smooth interactions  
✅ **Clean console** - No errors or debug logs  
✅ **Responsive** - Works at different screen sizes  
✅ **Accessible** - Keyboard navigation works

---

## 📸 Visual Reference

### Expected Header Layout

```
┌──────────────────────────────────────────────────┐
│                                                   │
│  [W] [3] [D]                        Zoom: 100%   │
│  ← Wed, Oct 15, 2025 ▼ → [Today]                │
│                                                   │
│  Wed, Oct 15, 2025 Schedule                      │
│                                                   │
└──────────────────────────────────────────────────┘
     ↑ View toggle
        ↑ Date navigation  
           ↑ Dynamic header
```

### Expected Button States

**View Mode Toggle:**
```
[W] [3] [D]  ← All dark (inactive)

[W] [3] [D]  ← W is bright white (active)
 ▓
```

**Date Navigation:**
```
← Oct 15, 2025 → [Today]  ← All look "pressed" by default

← Oct 15, 2025 → [Today]  ← On hover, becomes subtle/transparent
   ░░░░░
```

---

## 🚀 Ready to Ship!

If all tests pass, the application is production-ready with:
- Clean codebase (no debug logs)
- Comprehensive documentation
- Modern UX (view modes, date navigation)
- Robust error handling
- Future-proof architecture

**Test URL:** http://localhost:5175

---

**Last Updated:** October 15, 2025  
**Test Status:** Ready for manual verification  
**Automated Tests:** None (manual testing required)

