# Quick Reference: View Mode Feature

## Visual Overview

```
┌────────────────────────────────────────────────────┐
│ [W] [3] [D]                              Zoom: 100%│
│ ← Wed, Oct 15, 2025 ▼ → [Today]                   │
│                                                     │
│ Wed, Oct 15 – Fri, Oct 17, 2025 Schedule          │  ← Shows range in 3/W mode
└────────────────────────────────────────────────────┘
```

## Three Modes

| Mode | Button | Displays | Arrow Behavior | Example Header |
|------|--------|----------|----------------|----------------|
| **Day** | **D** | 1 day | ±1 day | "Wed, Oct 15, 2025 Schedule" |
| **3-Day** | **3** | 3 consecutive days | ±1 day (rolling window) | "Wed, Oct 15 – Fri, Oct 17, 2025 Schedule" |
| **Week** | **W** | Mon-Sun (7 days) | ±1 week | "Mon, Oct 14 – Sun, Oct 20, 2025 Schedule" |

---

## Keyboard Shortcuts

| Key | Action | Mode-Aware |
|-----|--------|------------|
| `←` | Previous period | ✅ (week in W, day in 3/D) |
| `→` | Next period | ✅ (week in W, day in 3/D) |
| `t` | Today | Preserves current mode |
| `c` | Toggle calendar | - |
| `Escape` | Close calendar | - |

---

## Style: Reversed Hover/Static

### Normal Buttons (typical design)
```
┌─────────┐        ┌─────────┐
│  Click  │  →     │ ▓Click▓ │
└─────────┘ idle   └─────────┘ hover
```

### Reversed Buttons (this feature)
```
┌─────────┐        ┌─────────┐
│ ▓Click▓ │  →     │  Click  │
└─────────┘ idle   └─────────┘ hover
 (looks active)     (subtle)
```

**Effect:** Buttons feel "lit up" by default, creating modern depth

---

## Code Examples

### Get Current Mode
```javascript
const { mode } = useDateStore();
// 'D' | '3' | 'W'
```

### Change Mode
```javascript
dateStore.actions.setMode('W'); // Switch to week view
```

### Get Visible Dates
```javascript
const visibleDates = dateStore.utils.getVisibleDates();
// D mode: [Date(Oct 15)]
// 3 mode: [Date(Oct 15), Date(Oct 16), Date(Oct 17)]
// W mode: [Date(Oct 14), ..., Date(Oct 20)]
```

### Get Date Keys (for DB)
```javascript
const dateKeys = dateStore.utils.getVisibleKeys();
// D mode: ['2025-10-15']
// 3 mode: ['2025-10-15', '2025-10-16', '2025-10-17']
// W mode: ['2025-10-14', '2025-10-15', ..., '2025-10-20']
```

---

## Future: Multi-Column Grid

### Scaffolding (Ready)
```javascript
// CalendarGrid.jsx (future enhancement)
{mode !== 'D' ? (
  // Multi-day columns
  visibleDates.map((date, idx) => (
    <DayColumn 
      key={visibleKeys[idx]}
      date={date}
      dateKey={visibleKeys[idx]}
      events={scheduledItems.filter(e => e.dateKey === visibleKeys[idx])}
    />
  ))
) : (
  // Existing single-day render
  <SingleDayView ... />
)}
```

### Event Schema (future)
```javascript
{
  id: 'scheduled-1',
  label: 'Meeting',
  startMinutes: 120,
  duration: 30,
  dateKey: '2025-10-15', // ← Add this field for multi-day
  color: 'bg-blue-500',
  typeId: 'type-work',
}
```

---

## File Structure

```
src/
├── state/
│   └── dateStore.js         ← Extended with mode + visibleDates
├── components/
│   ├── ViewModeToggle.jsx   ← NEW: W/3/D toggle
│   ├── DateNav.jsx          ← MODIFIED: Reversed styling
│   └── ...
└── App.jsx                  ← MODIFIED: Wired store + toggle
```

---

## Quick Test

1. Open http://localhost:5175
2. Click **W** button → Header shows "Mon – Sun"
3. Click `→` arrow → Jumps 1 week forward
4. Click **3** button → Header shows 3-day range
5. Click `←` arrow → Moves 1 day back
6. Click **D** button → Returns to single day
7. Verify drag/drop/resize still work

---

**Status:** ✅ Ready to use  
**Breaking Changes:** None  
**Next Step:** Implement multi-column rendering in CalendarGrid

