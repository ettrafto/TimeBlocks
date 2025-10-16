# 🚀 Quick Test - Adjacency Fix & Static Dates

## ✅ What to Test

### **1. Hard Refresh**
```
Ctrl + Shift + R
```

---

### **2. Test Adjacency Fix (Back-to-Back Events)**

**Create two events that touch but don't overlap:**

**Event 1:**
- Start: 10:00 AM
- Duration: 30 minutes (ends at 10:30 AM)

**Event 2:**
- Start: 10:30 AM (exactly when Event 1 ends)
- Duration: 30 minutes

**Expected Result:**
```
✅ Both events at FULL WIDTH (90% of grid)
✅ NOT split to 50% width each
✅ Debug labels show: col 0 / 1 (not col 0 / 2)
```

**Console Should Show:**
```
🎨 computeEventLayout CALLED
  → Event 1: { column: 0, maxConcurrent: 1, width: "100%" }
  → Event 2: { column: 0, maxConcurrent: 1, width: "100%" }
```

---

### **3. Test True Overlap (Should Still Split)**

**Create overlapping events:**

**Event 1:**
- Start: 10:00 AM
- Duration: 45 minutes (ends at 10:45 AM)

**Event 2:**
- Start: 10:30 AM (overlaps with Event 1)
- Duration: 30 minutes

**Expected Result:**
```
✅ Events render SIDE-BY-SIDE at 50% width
✅ Debug labels show: col 0 / 2 and col 1 / 2
```

---

### **4. Test Static Date Headers**

**Switch to multi-day view (3-day or week):**

**Leftmost date (first column):**
- ✅ Has dropdown caret `▼`
- ✅ Clickable
- ✅ Hover changes style
- ✅ Pointer cursor

**Other dates (middle, right):**
- ✅ NO caret `▼`
- ✅ NOT clickable
- ✅ NO hover effects
- ✅ Default cursor (not pointer)
- ✅ Tab key skips them

**Test interaction:**
1. Hover over leftmost date → should see hover effect
2. Hover over other dates → should see NO hover effect
3. Click leftmost date → dropdown opens
4. Click other dates → nothing happens

---

### **5. Test Single-Day View (Unchanged)**

**Switch to single-day view:**
- ✅ Has dropdown caret `▼`
- ✅ Clickable
- ✅ Hover works
- ✅ Everything works as before

---

## 🎯 Quick Visual Check

### **Adjacency:**
```
CORRECT:                    WRONG:
┌────────────┐             ┌──────┬──────┐
│  10:00 AM  │             │10:00 │      │
└────────────┘             └──────┴──────┘
┌────────────┐             ← 50% width (bug)
│  10:30 AM  │
└────────────┘
← Full width (correct)
```

### **Static Dates:**
```
CORRECT:
[←] [Thu ▼] [→] [Today]  ← Caret, clickable
    [Fri]                 ← NO caret, not clickable
    [Sat]                 ← NO caret, not clickable
```

---

## ❌ Common Issues

**Problem: Events still splitting at 50%**
- Check console for layout computation
- Look for `maxConcurrent: 2` (should be 1 for adjacency)
- Hard refresh to clear cache

**Problem: All dates still have carets**
- Hard refresh: `Ctrl + Shift + R`
- Check you're in multi-day view (not single-day)

**Problem: Static dates still have hover**
- Check browser DevTools → Inspect element
- Should NOT see `hover:` classes applied
- Should see `cursor-default`

---

## 📋 Checklist

**Adjacency:**
- [ ] Back-to-back events (10:00-10:30, 10:30-11:00) at full width
- [ ] Overlapping events (10:00-10:45, 10:30-11:00) at 50% width
- [ ] Debug labels show correct overlap count

**Static Dates:**
- [ ] Leftmost date has `▼` and is clickable
- [ ] Other dates have NO `▼`
- [ ] Other dates have no hover effects
- [ ] Other dates have default cursor
- [ ] Tab key skips non-leftmost dates

**Single-Day:**
- [ ] Date picker works normally
- [ ] Has `▼` caret
- [ ] Clickable and hover work

---

**Hard refresh and test!** Share results if you see any issues. 🎯

