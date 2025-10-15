# Critical Fix: Infinite Loop in useSyncExternalStore

## Issue

When the date navigation was first implemented, the app crashed immediately with:

```
Error: Maximum update depth exceeded. This can happen when a component 
repeatedly calls setState inside componentWillUpdate or componentDidUpdate. 
React limits the number of nested updates to prevent infinite loops.

Warning: The result of getSnapshot should be cached to avoid an infinite loop
```

## Root Cause

The `get()` function in `dateStore.js` was returning a **new object reference** on every call:

```javascript
// ❌ BROKEN - Creates new object every time
const get = () => ({ selectedDate, weekStartsOn });
```

When `useSyncExternalStore` compares the previous snapshot with the new one, it uses reference equality. Since `get()` always returned a new object, React thought the state changed every render, causing an infinite loop:

1. Component renders
2. `useSyncExternalStore` calls `get()`
3. New object returned → React thinks state changed
4. Component re-renders
5. Go to step 2 → **INFINITE LOOP**

## Solution

Cache the state object and only create a new reference when data actually changes:

```javascript
// ✅ FIXED - Cache the state object
let cachedState = { selectedDate, weekStartsOn };

const get = () => cachedState;

const setDate = (date) => { 
  selectedDate = date;
  cachedState = { selectedDate, weekStartsOn }; // New reference on change
};

const nextDay = () => { 
  selectedDate = addDays(selectedDate, 1);
  cachedState = { selectedDate, weekStartsOn }; // New reference on change
};

// ... same pattern for prevDay() and goToday()
```

Now the flow is:

1. Component renders
2. `useSyncExternalStore` calls `get()`
3. Same object reference returned → No change detected
4. No re-render unless actual date changes
5. When date changes → new cached object → re-render once ✅

## Key Lesson

When using `useSyncExternalStore`, the `getSnapshot` function **must return a stable reference** for unchanged state. This is critical for:

- Preventing infinite loops
- Optimizing performance
- Following React's reconciliation contract

## Pattern for External Stores

```javascript
// ✅ CORRECT PATTERN
let state = { /* initial state */ };
let cachedSnapshot = state;

const getSnapshot = () => cachedSnapshot;

const update = (newData) => {
  state = newData;
  cachedSnapshot = { ...state }; // New reference only when changed
  notifySubscribers();
};
```

```javascript
// ❌ WRONG PATTERN (causes infinite loops)
let state = { /* initial state */ };

const getSnapshot = () => ({ ...state }); // New object every call!
```

## Verification

After the fix:
- ✅ Build succeeds
- ✅ No runtime errors
- ✅ No infinite loops
- ✅ Date navigation works correctly
- ✅ All existing features intact

## References

- [React useSyncExternalStore Docs](https://react.dev/reference/react/useSyncExternalStore)
- [getSnapshot must be cached](https://react.dev/reference/react/useSyncExternalStore#ive-added-getsnapshot-as-a-dependency-but-it-causes-a-loop)

---

**Issue:** Critical - App crash on load  
**Fix:** Cache state object in dateStore  
**Status:** ✅ RESOLVED  
**Date:** October 15, 2025

