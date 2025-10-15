# TimeBlocks Calendar - Architecture Documentation

## 1. Overview

### Project Purpose
TimeBlocks is a drag-and-drop daily calendar application for time-blocking and schedule management. Users can create reusable event templates, drag them onto a calendar, resize events, and manage event types/categories.

### Tech Stack
- **React** 18.2.0 - UI framework
- **Tailwind CSS** 3.3.6 - Utility-first styling
- **@dnd-kit/core** 6.1.0 - Drag-and-drop interactions
- **Vite** 5.0.8 - Build tool and dev server
- **PostCSS** + **Autoprefixer** - CSS processing

### High-Level Features
1. **Event Template Management** - Create, edit, delete reusable event templates with customizable duration, color, and type
2. **Type/Category System** - Organize events into types (Work, Personal, etc.) with visual indicators
3. **Drag & Drop** - Drag templates from left panel to calendar; reposition scheduled events
4. **Event Resizing** - Resize events by dragging top/bottom handles with live preview
5. **Zoom & Scroll** - Zoom calendar with Ctrl+Scroll; drag-to-scroll navigation
6. **Overlap Detection** - Warns users when events overlap; allows override
7. **Snap-to-Grid** - Events snap to 15-minute increments

### Pages/Routes
Single-page application - no routing. Single view with:
- Left panel: Event templates library
- Right panel: Daily calendar (8 AM - 5 PM)
- Modals: Event editor, Type manager, Overlap warnings

---

## 2. Project Structure

```
src/
├── main.jsx                      # React entry point (StrictMode wrapper)
├── App.jsx                       # Root component, all state management
├── index.css                     # Global Tailwind imports
│
├── components/
│   ├── Calendar/
│   │   ├── CalendarGrid.jsx      # Time grid, drop zone, scroll/zoom
│   │   ├── ScheduledItem.jsx     # Draggable event on calendar (with resize handles)
│   │   ├── ScheduledItemPreview.jsx  # Non-interactive resize preview
│   │   └── GhostEvent.jsx        # Dashed preview during drag
│   │
│   ├── LeftPane/
│   │   ├── DraggableTaskBlock.jsx  # Wrapper with useDraggable hook
│   │   └── TaskBlock.jsx          # Display-only event template card
│   │
│   ├── Modals/
│   │   ├── Modal.jsx              # Generic confirmation modal
│   │   ├── EventEditorModal.jsx   # Create/edit event templates
│   │   └── TypeManagerModal.jsx   # CRUD for event types
│   │
│   └── DnD/
│       └── DndEventMonitor.jsx    # Debug monitor for drag events
│
├── constants/
│   ├── calendar.js                # Time bounds, slot config, zoom limits
│   └── colors.js                  # Tailwind color options for events
│
└── utils/
    ├── time.js                    # Time conversions, formatting, snapping
    ├── overlap.js                 # Event overlap detection
    └── diagnostics.js             # Duplicate draggable detection
```

---

## 3. Core Architecture

### App Composition
**App.jsx** is the single state container. No context providers or global state libraries.

```jsx
<DndContext sensors={sensors} onDragStart={...} onDragMove={...} onDragEnd={...}>
  <DndEventMonitor isResizing={isResizing} />  {/* Debug monitor */}
  
  <div className="flex">
    <LeftPane>
      {taskTemplates.map(task => 
        <DraggableTaskBlock task={task} onEdit={...} onDelete={...} />
      )}
    </LeftPane>
    
    <CalendarGrid 
      scheduledItems={scheduledItems}
      ghostPosition={ghostPosition}
      resizeDraft={resizeDraft}
      onResizeStart={handleResizeStart}
      isResizing={isResizing}
    />
  </div>
  
  <DragOverlay>{activeItem && <TaskBlock task={activeItem} />}</DragOverlay>
  
  <Modal isOpen={showOverlapModal} ... />
  <EventEditorModal isOpen={showEventEditor} ... />
  <TypeManagerModal isOpen={showTypesManager} ... />
</DndContext>
```

### Drag & Drop Integration
- **@dnd-kit/core** manages drag state via `DndContext`
- **Sensors**: `PointerSensor` with dynamic activation distance
  - Normal: 8px distance threshold
  - During resize: 999999px (effectively disabled) to prevent interference
- **Collision Detection**: `closestCenter`
- **DragOverlay**: Shows floating copy of item being dragged

### Resize Integration
- **State-driven**: `isResizing`, `resizeTarget`, `resizeDraft`
- **Event Flow**: 
  1. `onMouseDown` on resize handle → sets resize state → disables DnD sensors
  2. `onMouseMove` (window) → updates `resizeDraft` (live preview)
  3. `onMouseUp` (window) → snaps to grid → overlap check → commits or shows modal
- **Avoids DnD conflicts**: While resizing, hides the real `<ScheduledItem>` and shows `<ScheduledItemPreview>` (no useDraggable hook)

### Zoom & Pan Integration
- **Zoom**: `pixelsPerSlot` state (10-80px range, default 20px)
  - Triggered by Ctrl+Scroll on `<CalendarGrid>`
  - Recalculates all `top` and `height` styles via `minutesToPixels()`
- **Pan**: Drag-to-scroll with middle mouse or direct drag
  - Tracks `dragStart` position and scroll offset
  - Updates `scrollTop` on parent container

### Performance Patterns
- **Memoization**: Callbacks use `React.useCallback` to prevent sensor re-creation
- **Conditional rendering**: Filters out item being resized to avoid duplicate draggables
- **No virtualization**: Small time window (9 hours) doesn't require it
- **No debouncing**: Resize updates are throttled by `requestAnimationFrame` in diagnostics

---

## 4. Components

### CalendarGrid
**Location**: `src/components/Calendar/CalendarGrid.jsx`

**Purpose**: Renders time grid (8 AM - 5 PM), acts as drop zone, handles zoom/scroll

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `scheduledItems` | `ScheduledEvent[]` | ✅ | Events to render on calendar |
| `ghostPosition` | `{ startMinutes: number, task: Task } \| null` | ✅ | Preview position during drag |
| `pixelsPerSlot` | `number` | ✅ | Current zoom level (px per 15min slot) |
| `onZoom` | `(newPixelsPerSlot: number) => void` | ✅ | Callback for zoom changes |
| `calendarDomRef` | `React.MutableRefObject` | ✅ | Ref to calendar DOM for resize calculations |
| `resizeDraft` | `ScheduledEvent \| null` | ✅ | Live resize preview object |
| `onResizeStart` | `(item, edge, clientY) => void` | ✅ | Callback when resize handle clicked |
| `isResizing` | `boolean` | ✅ | Global resize state |

**Side Effects**:
- Attaches wheel listener for zoom (passive: false to prevent default scroll)
- Attaches mousemove/mouseup for drag-to-scroll
- Cleanup on unmount

**External Deps**: `@dnd-kit/core` (`useDroppable`)

---

### ScheduledItem
**Location**: `src/components/Calendar/ScheduledItem.jsx`

**Purpose**: Draggable event on calendar with resize handles

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `item` | `ScheduledEvent` | ✅ | Event data (id, label, startMinutes, duration, color) |
| `pixelsPerSlot` | `number` | ✅ | Zoom level for positioning |
| `onResizeStart` | `(item, edge, clientY) => void` | ✅ | Resize handle callback |
| `isBeingResized` | `boolean` | ✅ | True if this specific item is being resized |
| `isResizing` | `boolean` | ✅ | True if ANY item is being resized |

**Side Effects**:
- Calls `trackScheduledItemRender(item.id)` for duplicate detection
- `useEffect` logs critical errors if dragging during resize (assertions)

**External Deps**: `@dnd-kit/core` (`useDraggable`)

**Critical Logic**: 
- `allowDrag = !isBeingResized && !isResizing` - gates drag listeners
- `disabled: !allowDrag` - hard disables draggable when resizing
- Only spreads `listeners` when `allowDrag === true` (StackOverflow pattern)

---

### ScheduledItemPreview
**Location**: `src/components/Calendar/ScheduledItemPreview.jsx`

**Purpose**: Non-interactive preview during resize (avoids duplicate useDraggable)

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `item` | `ScheduledEvent` | ✅ | Draft event with updated startMinutes/duration |
| `pixelsPerSlot` | `number` | ✅ | Zoom level |

**Side Effects**: None

**External Deps**: None

---

### GhostEvent
**Location**: `src/components/Calendar/GhostEvent.jsx`

**Purpose**: Dashed preview showing where event will land during drag

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `ghostPosition` | `{ startMinutes: number, task: Task } \| null` | ✅ | Position and task data |
| `pixelsPerSlot` | `number` | ✅ | Zoom level |

**Side Effects**: None

**External Deps**: None

---

### DraggableTaskBlock
**Location**: `src/components/LeftPane/DraggableTaskBlock.jsx`

**Purpose**: Wrapper that adds @dnd-kit dragging to TaskBlock

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `task` | `EventTemplate` | ✅ | Event template data |
| `onEdit` | `(task: EventTemplate) => void` | ❌ | Edit callback |
| `onDelete` | `(task: EventTemplate) => void` | ❌ | Delete callback |
| `types` | `Type[]` | ✅ | Available types for display |

**Side Effects**: None

**External Deps**: `@dnd-kit/core` (`useDraggable`)

**Data Structure**: Wraps task in `{ type: 'template', task }` for DnD

---

### TaskBlock
**Location**: `src/components/LeftPane/TaskBlock.jsx`

**Purpose**: Display-only card for event template

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `task` | `EventTemplate` | ✅ | Template to display |
| `onClick` | `() => void` | ❌ | Edit handler |
| `onDelete` | `() => void` | ❌ | Delete handler |
| `types` | `Type[]` | ✅ | For type name lookup |

**Side Effects**: 
- `console.error` if task is null
- `console.warn` if type lookup fails

**External Deps**: None

---

### Modal
**Location**: `src/components/Modals/Modal.jsx`

**Purpose**: Generic confirmation dialog (used for overlap warnings)

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | ✅ | Visibility state |
| `title` | `string` | ✅ | Modal title |
| `children` | `React.ReactNode` | ✅ | Modal body content |
| `onConfirm` | `() => void` | ✅ | "Allow" button handler |
| `onCancel` | `() => void` | ✅ | "Cancel" button + overlay click handler |

**Side Effects**: None

**External Deps**: None

---

### EventEditorModal
**Location**: `src/components/Modals/EventEditorModal.jsx`

**Purpose**: Create/edit event templates

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | ✅ | Visibility state |
| `editingEvent` | `EventTemplate \| null` | ✅ | Event to edit (null for create) |
| `onSave` | `(data: EventTemplate) => void` | ✅ | Save callback |
| `onCancel` | `() => void` | ✅ | Cancel callback |
| `types` | `Type[]` | ✅ | Available types for dropdown |

**Side Effects**: 
- `useEffect` populates form fields when `editingEvent` changes

**External Deps**: None

**Local State**: `name`, `duration`, `color`, `typeId`

---

### TypeManagerModal
**Location**: `src/components/Modals/TypeManagerModal.jsx`

**Purpose**: CRUD interface for event types

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isOpen` | `boolean` | ✅ | Visibility state |
| `types` | `Type[]` | ✅ | Current types list |
| `onSave` | `(data: Type) => void` | ✅ | Create/update callback |
| `onDelete` | `(typeId: string) => void` | ✅ | Delete callback |
| `onClose` | `() => void` | ✅ | Close modal callback |
| `eventTemplates` | `EventTemplate[]` | ✅ | For counting affected events on delete |

**Side Effects**: 
- `window.confirm` for delete confirmation with affected event count

**External Deps**: None

**Local State**: `editingType`, `typeName`, `typeColor`

---

### DndEventMonitor
**Location**: `src/components/DnD/DndEventMonitor.jsx`

**Purpose**: Debug monitor that logs critical errors during drag events

**Props**:
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isResizing` | `boolean` | ✅ | Global resize state |

**Side Effects**: 
- `console.error` if drag starts while `isResizing === true` (indicates sensor leak)

**External Deps**: `@dnd-kit/core` (`useDndMonitor`)

---

## 5. Hooks

This application uses **inline state management** in `App.jsx` rather than custom hooks. All hooks are from React or @dnd-kit.

### Standard React Hooks Used
- `useState` - All component state (App.jsx has ~15 state variables)
- `useCallback` - Memoizes drag/resize handlers to prevent sensor re-creation
- `useEffect` - Window event listeners, resize state sync
- `useRef` - Calendar DOM reference, listener attachment tracking

### @dnd-kit Hooks
- `useSensor` / `useSensors` - Configures PointerSensor with dynamic activation distance
- `useDraggable` - Used in `DraggableTaskBlock` and `ScheduledItem`
- `useDroppable` - Used in `CalendarGrid` (drop zone)
- `useDndMonitor` - Used in `DndEventMonitor` (debug hook)

### State Management Pattern
**App.jsx** manages all state inline:

```jsx
// Templates & Types
const [taskTemplates, setTaskTemplates] = useState([...]) // Event templates
const [types, setTypes] = useState([...])                  // Event types

// Calendar State
const [scheduledItems, setScheduledItems] = useState([])   // Events on calendar
const [pixelsPerSlot, setPixelsPerSlot] = useState(20)    // Zoom level

// Drag State
const [activeId, setActiveId] = useState(null)            // Current drag ID
const [ghostPosition, setGhostPosition] = useState(null)  // Preview position

// Resize State
const [isResizing, setIsResizing] = useState(false)
const [resizeTarget, setResizeTarget] = useState(null)    // { id, edge, originalStart, ... }
const [resizeDraft, setResizeDraft] = useState(null)      // Live preview object

// Modal State
const [showOverlapModal, setShowOverlapModal] = useState(false)
const [pendingEvent, setPendingEvent] = useState(null)
const [overlappingEvents, setOverlappingEvents] = useState([])
const [showEventEditor, setShowEventEditor] = useState(false)
const [editingTemplate, setEditingTemplate] = useState(null)
const [showTypesManager, setShowTypesManager] = useState(false)

// Refs
const calendarDomRef = useRef(null)                       // For resize calculations
const resizeListenersAttached = useRef(false)             // Prevent duplicate listeners
```

### Important Invariants

1. **Resize Blocks Drag**: When `isResizing === true`, sensors are set to `{ distance: 999999 }` (unreachable)
2. **Single Resize**: Only one item can be resized at a time (`resizeTarget` is singular)
3. **No Dual Draggables**: Item being resized is filtered out of `scheduledItems.map()` to prevent duplicate IDs
4. **Window Listeners**: Resize listeners are attached once (`resizeListenersAttached.current` flag)

### Edge Cases

- **Drag Start During Resize**: Blocked by sensor distance; monitor logs critical error if it occurs
- **Transform During Resize**: `ScheduledItem` checks and logs error if transform is applied while resizing
- **Missing Ghost Position**: Fallback to delta calculation for scheduled drags (post-resize resilience)
- **Missing Calendar Element**: Triple null-safe lookup chain (`over?.node?.current || calendarDomRef.current || querySelector`)

---

## 6. Data Model

### EventTemplate (Task)
Event templates in the left panel that can be dragged to create scheduled items.

```typescript
interface EventTemplate {
  id: string;           // e.g., "template-1234567890"
  name: string;         // Display name
  duration: number;     // Minutes (15, 30, 45, 60, 75, 90, 105, 120)
  color: string;        // Tailwind class (e.g., "bg-blue-500")
  typeId: string | null; // Foreign key to Type
}
```

**Created**: Via `EventEditorModal` → `handleSaveTemplate()`  
**Updated**: Same flow with existing `id`  
**Deleted**: Via `handleDeleteTemplate()` (does not cascade to scheduled items)

---

### ScheduledEvent
Events placed on the calendar.

```typescript
interface ScheduledEvent {
  id: string;           // e.g., "scheduled-1"
  label: string;        // Display name (copied from template.name)
  startMinutes: number; // Minutes from 8 AM (0 = 8:00 AM, 60 = 9:00 AM)
  duration: number;     // Minutes
  color: string;        // Tailwind class
  typeId: string | null; // Foreign key to Type (optional)
}
```

**Created**: Via drag-drop from left panel → `handleDragEnd()`  
**Updated**: Via drag (reposition), resize, or overlap modal  
**Deleted**: Not currently supported (no UI)  
**Snapping**: `startMinutes` always snapped to 15-minute increments

---

### Type
Category/tag for organizing events.

```typescript
interface Type {
  id: string;       // e.g., "type-1234567890"
  name: string;     // Display name (e.g., "Work", "Personal")
  color: string;    // Tailwind class (optional, defaults "bg-gray-500")
}
```

**Created**: Via `TypeManagerModal` → `handleSaveType()`  
**Updated**: Same flow with existing `id`  
**Deleted**: Via `handleDeleteType()` → sets `typeId = null` on affected templates/events

**Relationship**: 
- `EventTemplate.typeId` → `Type.id` (optional, many-to-one)
- `ScheduledEvent.typeId` → `Type.id` (optional, copied from template)

---

### Derived Data

#### Position Calculations
```javascript
// Minutes to pixels (zoom-aware)
topPosition = minutesToPixels(startMinutes, pixelsPerSlot)
height = minutesToPixels(duration, pixelsPerSlot)

// Pixels to minutes (inverse)
minutes = pixelsToMinutes(offsetY, pixelsPerSlot)
```

#### Snapping
```javascript
// Snap to 15-minute grid
snappedMinutes = Math.round(minutes / 15) * 15
```

#### Bounds Clamping
```javascript
// Keep within 8 AM - 5 PM (0 to 540 minutes)
totalMinutes = (17 - 8) * 60 // 540
clampedMinutes = Math.max(0, Math.min(minutes, totalMinutes))
```

#### Overlap Detection
```javascript
// Check if [newStart, newEnd) overlaps [existingStart, existingEnd)
overlaps = newStart < existingEnd && newEnd > existingStart
```

---

### Persistence
**None** - All data is ephemeral (in-memory React state). Refresh clears everything.

**Demo Data**: Seeded in `useState` initializers:
- 2 types: "Work" (blue), "Personal" (green)
- 2 templates: "Team Meeting" (30min, Work), "Lunch Break" (45min, Personal)

---

## 7. Interactions & Flows

### Drag & Drop Flow

#### Template → Calendar (New Event)
```
1. User drags template from left panel
   → useDraggable triggers onDragStart
   → setActiveId(template-{id})
   → setGhostPosition(null)

2. User moves over calendar
   → onDragMove fires
   → Calculate mouse Y position
   → Convert to minutes: pixelsToMinutes(offsetY)
   → Snap to 15min: snapToIncrement(minutes)
   → setGhostPosition({ startMinutes, task })
   → GhostEvent renders dashed preview

3. User releases over calendar
   → onDragEnd fires
   → Create newItem from ghostPosition
   → Check for overlaps
     → If overlap: show modal, set pendingEvent
     → If clear: add to scheduledItems, increment nextId
   → Clear ghost
```

#### Scheduled Event Reposition
```
1. User drags event on calendar
   → ScheduledItem's useDraggable triggers onDragStart
   → data: { type: 'scheduled', item }

2. User moves (same as template flow)
   → Ghost shows new position
   → Resilient: works even if over is null (post-resize collision miss)

3. User releases
   → Calculate finalMinutes (ghost or delta fallback)
   → Create updatedItem with new startMinutes
   → Check overlaps (excluding self)
     → If overlap: show modal
     → If clear: update scheduledItems array
```

**Collision Detection**: `closestCenter` from @dnd-kit  
**Transform**: Applied via `translate3d(${transform.x}px, ${transform.y}px, 0)` (only when dragging)

---

### Resize Flow

#### Start Resize
```
1. User mousedown on resize handle (top or bottom)
   → e.stopPropagation() + e.preventDefault()
   → handleResizeStart(item, edge, clientY)

2. handleResizeStart:
   → If activeId exists: setActiveId(null) // cancel any active drag
   → setIsResizing(true)
   → setResizeTarget({ id, edge, originalStart, originalDuration, startClientY })
   → setResizeDraft({ ...item }) // initial draft = current item

3. Next render:
   → sensors get { distance: 999999 } (disabled)
   → CalendarGrid filters out item (prevents duplicate draggable)
   → ScheduledItemPreview renders instead
   → Window listeners attach (mousemove, mouseup)
```

#### Live Resize
```
1. Window mousemove fires
   → handleResizeMove(e.clientY)

2. handleResizeMove:
   → Get calendar bounding rect
   → Calculate offsetY = clientY - rect.top
   → Convert to minutes: pixelsToMinutes(offsetY)
   → Clamp to day bounds: clampMinutesToDay(minutes)
   → If edge === 'end': newEnd = minutes
   → If edge === 'start': newStart = minutes
   → Calculate new start/duration (live, unsnapped)
   → setResizeDraft({ ...prev, startMinutes, duration })

3. ScheduledItemPreview re-renders with new position/height
```

#### Commit Resize
```
1. Window mouseup fires
   → handleResizeEnd()

2. handleResizeEnd:
   → Snap draft to 15min grid: snapToIncrement()
   → Clamp to day bounds
   → Check overlaps (excluding self)
     → If overlap: show modal, keep resize state
     → If clear: update scheduledItems
   → Clear resize state: setIsResizing(false), setResizeTarget(null), setResizeDraft(null)

3. Next render:
   → sensors reactivate ({ distance: 8 })
   → ScheduledItem becomes draggable again
```

**Constraints**: 
- Minimum duration: 15 minutes (`clampDuration`)
- Snapped to 15-minute increments on release
- Clamped to 8 AM - 5 PM bounds

---

### Zoom & Pan Flow

#### Zoom (Ctrl+Scroll)
```
1. User Ctrl+Scroll on calendar
   → CalendarGrid wheel listener (passive: false)

2. handleWheel:
   → Check: e.ctrlKey || e.metaKey
   → e.preventDefault() // block browser zoom
   → Calculate delta: -e.deltaY * 0.1
   → newPixelsPerSlot = clamp(current + delta, MIN=10, MAX=80)
   → onZoom(newPixelsPerSlot)

3. App updates state:
   → setPixelsPerSlot(newPixelsPerSlot)

4. All components re-render:
   → CalendarGrid height recalculated
   → All ScheduledItems reposition/resize via minutesToPixels()
```

**Bounds**: 10px - 80px per slot (50% - 400% zoom)  
**Default**: 20px per slot (100%)

#### Pan (Drag-to-Scroll)
```
1. User mousedown on calendar background
   → handleMouseDown (button === 1 or target === container)
   → setIsDragging(true)
   → Record: dragStart = { x, y, scrollTop }
   → e.preventDefault()

2. User moves mouse
   → handleMouseMove
   → Calculate: deltaY = e.clientY - dragStart.y
   → newScrollTop = dragStart.scrollTop - deltaY
   → Update: containerRef.current.parentElement.scrollTop

3. User mouseup
   → handleMouseUp
   → setIsDragging(false)
```

**Blocked During**: Resize (`if (isResizing) return`)

---

### Modal Flows

#### Overlap Warning
```
Triggered by:
- Dropping template that overlaps existing events
- Repositioning event that overlaps others
- Resizing event that overlaps others

Flow:
1. checkOverlap(newEvent, existingEvents) returns overlaps[]
2. If overlaps.length > 0:
   → setPendingEvent(newEvent)
   → setOverlappingEvents(overlaps)
   → setShowOverlapModal(true)

3. User clicks "Allow":
   → handleConfirmOverlap()
   → Add/update pendingEvent to scheduledItems
   → Clear modal state + resize state

4. User clicks "Cancel":
   → handleCancelOverlap()
   → Discard pendingEvent
   → Clear modal state + resize state
```

#### Event Editor
```
Create:
1. Click "+" button → setShowEventEditor(true), setEditingTemplate(null)
2. Fill form, submit → handleSaveTemplate(data)
3. If new: push to taskTemplates with id=`template-${Date.now()}`

Edit:
1. Click ✏️ on template → setEditingTemplate(task), setShowEventEditor(true)
2. Form pre-populates (useEffect watches editingEvent)
3. Submit → update in taskTemplates array

Delete:
1. Click 🗑️ on template → handleDeleteTemplate(task)
2. Confirm → filter from taskTemplates
```

#### Type Manager
```
Create/Edit/Delete types via TypeManagerModal
- Validates unique names (case-insensitive)
- Delete warns about affected events
- Delete cascades: sets typeId=null on templates/events
```

---

## 8. Utils & Constants

### Time Math (`src/utils/time.js`)
| Function | Purpose | Example |
|----------|---------|---------|
| `pixelsToMinutes(px, pxPerSlot)` | Convert Y position to minutes | `100px → 75min (@ 20px/slot)` |
| `minutesToPixels(min, pxPerSlot)` | Convert minutes to Y position | `90min → 120px (@ 20px/slot)` |
| `snapToIncrement(minutes)` | Snap to 15min grid | `127min → 120min` |
| `clampMinutesToDay(m)` | Clamp to 0-540 range | `600min → 540min` |
| `clampDuration(d)` | Minimum 15min | `10min → 15min` |
| `computeSnappedRange(startMin, endMin)` | Snap start+end, compute duration | `(37, 98) → {start:45, duration:45}` |
| `formatTime(totalMinutes)` | Format as 12h time | `90min → "9:30 AM"` |
| `generateTimeSlots()` | Generate grid slots | `[{time:"8:00 AM", minutes:0, isHour:true}, ...]` |

### Overlap Detection (`src/utils/overlap.js`)
```javascript
checkOverlap(newEvent, existingEvents)
// Returns: overlappingEvents[]
// Logic: newStart < existingEnd && newEnd > existingStart
```

### Diagnostics (`src/utils/diagnostics.js`)
```javascript
setResizingState(isResizing)
// Updates module-level flag for duplicate detection

trackScheduledItemRender(itemId)
// Called by every ScheduledItem render
// Uses requestAnimationFrame to batch checks
// Logs console.error if duplicate IDs detected during resize
```

### Calendar Constants (`src/constants/calendar.js`)
```javascript
START_HOUR = 8              // 8 AM
END_HOUR = 17               // 5 PM
MINUTES_PER_SLOT = 15       // 15-minute grid

DEFAULT_PIXELS_PER_SLOT = 20  // 100% zoom
MIN_PIXELS_PER_SLOT = 10      // 50% zoom
MAX_PIXELS_PER_SLOT = 80      // 400% zoom
```

### Color Options (`src/constants/colors.js`)
```javascript
COLOR_OPTIONS = [
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  // ... 10 total Tailwind classes
]
```

---

## 9. State & Side Effects

### Global vs Local State

**Global State** (App.jsx):
- Event templates (`taskTemplates`)
- Event types (`types`)
- Scheduled events (`scheduledItems`)
- Drag state (`activeId`, `ghostPosition`)
- Resize state (`isResizing`, `resizeTarget`, `resizeDraft`)
- Modal state (3 modals + pendingEvent + overlaps)
- Zoom (`pixelsPerSlot`)

**Local State** (Components):
- Modal forms (EventEditorModal, TypeManagerModal): form fields
- CalendarGrid: drag-to-scroll state

**No Context**: Everything passed via props

---

### Effects Syncing with DOM/Window

#### CalendarGrid
```javascript
useEffect(() => {
  container.addEventListener('wheel', handleWheel, { passive: false })
  
  if (isDragging) {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }
  
  return () => {
    container.removeEventListener('wheel', handleWheel)
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
  }
}, [handleWheel, handleMouseMove, handleMouseUp, isDragging])
```

#### App.jsx - Resize Listeners
```javascript
useEffect(() => {
  function onMove(e) { handleResizeMove(e.clientY) }
  function onUp() { handleResizeEnd(); resizeListenersAttached.current = false }
  
  if (isResizing && !resizeListenersAttached.current) {
    resizeListenersAttached.current = true
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      resizeListenersAttached.current = false
    }
  }
}, [isResizing, handleResizeMove, handleResizeEnd])
```

#### App.jsx - Resize State Sync
```javascript
useEffect(() => {
  setResizingState(isResizing) // Sync to diagnostics module
}, [isResizing])
```

#### ScheduledItem - Assertions
```javascript
useEffect(() => {
  const willApplyTransform = isDragging && allowDrag && !!transform
  
  // Log critical errors for debugging
  if ((isBeingResized || isResizing) && isDragging) {
    console.error('⚠️ ASSERTION WARNING: isDragging=true during resize!')
  }
  if ((isBeingResized || isResizing) && willApplyTransform) {
    console.error('❌ CRITICAL: Transform applied during resize!')
  }
}, [item.id, item.label, isBeingResized, isResizing, allowDrag, listenersOnState, isDragging, transform])
```

---

### Error Handling Strategy

**Console Logging**:
- `console.error`: Critical issues (duplicate draggables, missing data, drag during resize)
- `console.warn`: Non-critical warnings (missing calendar element, type lookup failures)

**User Alerts**:
- `window.confirm`: Delete confirmations (types, templates)
- `alert()`: Form validation errors (empty name, duplicate type name)

**Modal Warnings**:
- Overlap detection shows Modal with event details

**No Global Error Boundaries**: Errors bubble to React default

**No Network Error Handling**: No API calls

---

## 10. Build, Scripts, and Environments

### Commands

```bash
# Development (Vite dev server, HMR enabled)
npm run dev
# → http://localhost:5173

# Production build (outputs to dist/)
npm run build
# → dist/index.html, dist/assets/*.js, dist/assets/*.css

# Preview production build
npm run preview
```

### Environment Variables
**None** - No `.env` files or `import.meta.env` usage

### Vite Configuration (`vite.config.js`)
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```
- React plugin enables Fast Refresh
- No custom build config, aliases, or proxy

### Tailwind Configuration (`tailwind.config.js`)
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
}
```
- Standard config, no custom theme
- Scans all JSX/TSX for class names

### PostCSS (`postcss.config.js`)
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### ESLint (`.eslintrc.json`)
```json
{
  "rules": {
    "no-console": ["error", { "allow": ["warn", "error"] }]
  }
}
```
- Blocks `console.log/debug/info` but allows `console.warn/error`
- Prevents reintroduction of debug logging

### TypeScript
**Not used** - Pure JavaScript (`.jsx` files)

---

## 11. Testing

**Current State**: No tests present

**No Test Files**: No `*.test.js`, `*.spec.js`, or test directories  
**No Test Runners**: No Jest, Vitest, or Cypress in dependencies  
**No Coverage**: N/A

**Recommendations**:
- Add Vitest for unit tests (Vite-native)
- Test overlap detection, time math, snapping logic
- Test drag/drop flows with @dnd-kit/testing-utils
- Add React Testing Library for component tests

---

## 12. Future Work / Known Limitations

### TODOs/FIXMEs in Code
None explicitly marked in current codebase.

### Known Limitations

1. **No Persistence**: All data lost on refresh (no localStorage, backend, or IndexedDB)

2. **No Event Deletion UI**: Can delete templates but not scheduled events
   - Workaround: Refresh page or drag off calendar (not implemented)

3. **No Multi-Day Support**: Hard-coded to single day (8 AM - 5 PM)
   - Would require date state, navigation controls, data structure changes

4. **No Undo/Redo**: Can't revert drag/resize actions

5. **No Keyboard Shortcuts**: All interactions mouse-based

6. **No Touch Support**: @dnd-kit sensors not configured for touch
   - Would need TouchSensor added to sensors array

7. **No Event Recurrence**: Can't create repeating events

8. **Limited Time Range**: Fixed 8 AM - 5 PM
   - Could make START_HOUR/END_HOUR configurable

9. **No Accessibility (a11y)**: 
   - No keyboard navigation
   - No ARIA labels
   - No screen reader support

10. **No Export**: Can't export schedule to iCal, JSON, or image

### Suggested Improvements

#### Stability
- Add error boundaries around Calendar and LeftPane
- Validate data shapes with PropTypes or TypeScript
- Add unit tests for time math and overlap detection

#### Performance
- Memoize CalendarGrid time slots (generateTimeSlots runs every render)
- Use React.memo on ScheduledItem (re-renders for all drag moves)
- Debounce resize move handler if performance issues arise

#### Scalability
- Extract state to context/reducer if more features added
- Split App.jsx (1878 lines) into smaller containers
- Create custom hooks (useResizeState, useDragDropState)
- Add persistence layer (localStorage, Supabase, Firebase)

#### UX Enhancements
- Add visual feedback for overlap (red border on ghost)
- Show duration while resizing (tooltip)
- Add mini-map or time ruler
- Improve zoom controls (buttons + slider)
- Add keyboard shortcuts (Delete key, Escape to cancel)

#### Features
- Event deletion with trash icon or Delete key
- Multi-day view (week/month)
- Event search/filter
- Export to iCal/Google Calendar
- Print view
- Event notes/descriptions
- Recurring events
- Dark mode

---

## Appendix: Data Flow Diagram

```
User Interaction
       ↓
Component Event Handler
       ↓
App.jsx State Update
       ↓
Props Flow Down
       ↓
Component Re-render
       ↓
DOM Update

Example: Drag Template to Calendar
──────────────────────────────────
User drags TaskBlock
  → DraggableTaskBlock (useDraggable)
    → DndContext.onDragStart
      → App.handleDragStart(event)
        → setActiveId(event.active.id)
          → DragOverlay renders
            → Shows floating TaskBlock

User moves over calendar
  → DndContext.onDragMove
    → App.handleDragMove(event)
      → Calculate position from event.delta
        → setGhostPosition({ startMinutes, task })
          → CalendarGrid re-renders
            → GhostEvent shows preview

User releases
  → DndContext.onDragEnd
    → App.handleDragEnd(event)
      → Create newItem from ghostPosition
        → checkOverlap(newItem, scheduledItems)
          → if overlap: show Modal
          → if clear: setScheduledItems([...prev, newItem])
            → CalendarGrid re-renders
              → ScheduledItem appears on calendar
```

---

**Document Version**: 1.0  
**Last Updated**: Based on codebase snapshot  
**Total Components**: 12  
**Total Utils**: 3  
**Lines of Code**: ~2,500 (src/ only)

