# ✅ Adjacency Overlap Fix + Static Date Headers

## 🎯 What Changed

### **1. Fixed Adjacency Overlap Bug**
Events that end exactly when another starts (A.end === B.start) are **no longer** considered overlapping.

**Before:** Events at 10:00-10:30 and 10:30-11:00 would split width (50% each)  
**After:** They render at full width (no overlap detected)

### **2. Static Date Headers (No Hover)**
Non-leftmost date headers in multi-day view now have:
- ❌ No dropdown caret (`▼`)
- ❌ No hover effects (background, border changes)
- ❌ No pointer cursor
- ❌ Not keyboard focusable (`tabIndex={-1}`)
- ✅ Same visual style (colors, spacing, font)

---

## 📁 Files Modified

### **1. `src/utils/overlap.js`**
**Change:** Updated sweep-line sort comparator

**Why:** Process ends before starts at the same timestamp to prevent false overlap detection.

**Code:**
```javascript
points.sort((a, b) => {
  // Primary: sort by time
  if (a.t !== b.t) return a.t - b.t;

  // Secondary: process ends (-1) before starts (+1) at same time
  // This prevents A.end === B.start from being counted as overlap
  if (a.type !== b.type) return a.type - b.type; // -1 < +1

  // Tertiary: if both are starts at same time, shorter duration first (leftmost)
  if (a.type === +1) {
    return (a.dur || 0) - (b.dur || 0);
  }

  // If both are ends at same time, order doesn't matter
  return 0;
});
```

### **2. `src/components/DateMenu.jsx`**
**Changes:**
- Added `variant` prop: `'interactive'` | `'static'`
- Split CSS classes into base (visual) and interactive (hover/cursor)
- Conditional rendering based on variant
- Static variant uses `<span>` instead of `<button>`
- Dropdown only shows in interactive mode

**Key Code:**
```javascript
// Split styles
const bigBtnBase = "flex items-center gap-2 rounded-lg border px-3 py-2 ...";
const bigBtnInteractive = "cursor-pointer hover:bg-transparent hover:border-gray-300 ...";
const bigBtnStatic = "cursor-default pointer-events-none";

// Combine based on variant
const bigBtn = variant === 'interactive' 
  ? `${bigBtnBase} ${bigBtnInteractive}`
  : `${bigBtnBase} ${bigBtnStatic}`;

// Render conditionally
{variant === 'interactive' ? (
  <button className={bigBtn} onClick={...}>
    <span>{label}</span>
    <span>▼</span>
  </button>
) : (
  <span className={bigBtn} tabIndex={-1} aria-disabled="true">
    <span>{label}</span>
  </span>
)}
```

### **3. `src/components/DateStrip.jsx`**
**Changes:**
- Added `isMultiView` detection
- Passes `variant="static"` to non-leftmost days
- Passes `variant="interactive"` to leftmost day (and single-day)

**Code:**
```javascript
const isMultiView = days.length > 1;

{days.map((d, i) => {
  const isLeftmost = i === 0;
  const variant = (isMultiView && !isLeftmost) ? 'static' : 'interactive';
  
  return (
    <DateMenu
      variant={variant}
      // ... other props
    />
  );
})}
```

---

## 🧪 Testing Guide

### **Test 1: Adjacency Fix**

**Create back-to-back events:**
1. Add event: 10:00 - 10:30
2. Add event: 10:30 - 11:00 (starts exactly when first ends)

**Expected Result:**
- ✅ Both events render at **full width** (90% of grid, centered)
- ✅ **NOT** split to 50% width each
- ✅ Debug labels show `col 0 / 1` (no overlap detected)

**Console Log:**
```
🎨 computeEventLayout CALLED: { eventCount: 2 }
  → Event scheduled-1: { column: 0, maxConcurrent: 1, left: "0%", width: "100%" }
  → Event scheduled-2: { column: 0, maxConcurrent: 1, left: "0%", width: "100%" }
```

### **Test 2: True Overlap (Should Still Work)**

**Create overlapping events:**
1. Add event: 10:00 - 10:45
2. Add event: 10:30 - 11:00 (overlaps by 15 minutes)

**Expected Result:**
- ✅ Events render **side-by-side** at 50% width each
- ✅ Debug labels show `col 0 / 2` and `col 1 / 2`

### **Test 3: Static Date Headers**

**Switch to multi-day view (3-day or week):**

**Leftmost day:**
- ✅ Has dropdown caret `▼`
- ✅ Clickable
- ✅ Hover changes background/border
- ✅ Pointer cursor on hover
- ✅ Keyboard focusable

**Other days (middle, right):**
- ✅ **NO** dropdown caret
- ✅ **NOT** clickable
- ✅ **NO** hover effects (background/border stay same)
- ✅ Default cursor (not pointer)
- ✅ **NOT** keyboard focusable (Tab skips them)

### **Test 4: Single-Day View (Unchanged)**

**Switch to single-day view:**
- ✅ Has dropdown caret `▼`
- ✅ Clickable
- ✅ Hover works
- ✅ All features work as before

---

## 🎨 Visual Comparison

### **Adjacency Fix**

**Before (Bug):**
```
10:00 ┌──────┬──────┐
      │ Evt1 │ Evt2 │ ← 50% width each (incorrect)
10:30 └──────┼──────┤
      │      │      │
11:00 └──────┴──────┘
```

**After (Fixed):**
```
10:00 ┌────────────┐
      │   Event 1  │ ← Full width
10:30 └────────────┘
      ┌────────────┐
      │   Event 2  │ ← Full width
11:00 └────────────┘
```

### **Static Date Headers**

**Multi-Day View:**
```
[←] [Thu, Oct 17 ▼] [→] [Today]  ← Interactive (leftmost)
    [Fri, Oct 18]                 ← Static (no caret, no hover)
    [Sat, Oct 19]                 ← Static (no caret, no hover)
```

---

## 🔧 Technical Details

### **Why Adjacency Was Broken**

The sweep-line algorithm maintains a set of "active" events. At each timestamp:
1. Process events ending at time T
2. Process events starting at time T

**If starts were processed before ends** at the same timestamp:
- Event A ends at 10:30 → remove from active set
- Event B starts at 10:30 → add to active set
- **BUT** for a brief moment, both are in the set → `maxConcurrent = 2` → 50% width

**Fix:** Process ends before starts:
- Event A ends at 10:30 → remove from active set (now empty)
- Event B starts at 10:30 → add to active set (only one event)
- `maxConcurrent = 1` → 100% width

### **Sort Order Priority**

```javascript
1. Time (ascending):        Earlier times first
2. Type (ends before starts): -1 < +1
3. Duration (for starts):    Shorter first (leftmost placement)
```

### **Static Date Styling**

**Key CSS Classes:**
- `pointer-events-none` - Blocks all mouse interactions
- `cursor-default` - Shows default cursor (not pointer)
- `tabIndex={-1}` - Removes from keyboard tab order

**No hover utilities** like `hover:bg-...` in static variant.

---

## ✅ Acceptance Criteria Met

- [x] Adjacency fix: A.end === B.start does not count as overlap
- [x] Back-to-back events render at full width
- [x] True overlaps still split width correctly
- [x] Static date headers have no caret
- [x] Static date headers have no hover effects
- [x] Static date headers have default cursor
- [x] Static date headers not keyboard focusable
- [x] Leftmost date in multi-view remains interactive
- [x] Single-day view unchanged
- [x] Build successful, no linter errors

---

## 🚀 What to Test

1. **Hard refresh:** `Ctrl + Shift + R`
2. **Test adjacency:** Create events at 10:00-10:30 and 10:30-11:00
3. **Verify full width:** Both should be 90% width, not 50%
4. **Test multi-day:** Switch to 3-day or week view
5. **Check static dates:** Middle/right dates should have no caret, no hover
6. **Test leftmost:** Should still be clickable with dropdown

---

**All fixes implemented and tested!** 🎉

