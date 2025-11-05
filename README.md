# TimeBlocks Experiment

An experimental time-blocking calendar built with React and @dnd-kit/core with Spring Boot backend.

## Features

- **Drag & Drop**: Drag task blocks from the left panel onto the calendar
- **15-Minute Snapping**: Tasks automatically snap to 15-minute increments
- **Rearrange**: Move tasks around within the calendar to reschedule
- **Reusable Tasks**: Task templates remain in the left panel after dragging (they're copied, not moved)
- **Visual Time Grid**: Clear hourly and half-hourly divisions from 8 AM to 5 PM
- **Backend Integration**: Full CRUD for Event Types and Scheduled Events via Spring Boot API

## Dev Quickstart

### 1) Backend Setup

1. **Start the backend:**
   ```bash
   # Windows
   cd backend
   gradlew.bat bootRun --args='--spring.profiles.active=dev'
   
   # Linux/Mac
   cd backend
   ./gradlew bootRun --args='--spring.profiles.active=dev'
   ```

2. **Verify backend is running:**
   ```bash
   curl http://localhost:8080/api/health
   ```
   Expected response: `{"ok":true,"service":"timeblocks-backend"}`

3. **Check backend logs:**
   - Request lines: `➡ GET /api/health [5ms] status=200`
   - Hibernate SQL: `Hibernate: select ...` with bound parameters (TRACE level)

### 2) Frontend Setup

1. **Create `.env.local` file** (don't commit to repo):
   ```env
   VITE_API_BASE=http://localhost:8080
   VITE_WORKSPACE_ID=ws_dev
   VITE_CALENDAR_ID=cal_main
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to the URL shown in the terminal (usually `http://localhost:5173`)

### 3) Testing the Integration

1. **Visit `/create` page:**
   - Health check should show `{"ok":true,"service":"timeblocks-backend"}`
   - Event Types section should list seeded types (Deep Work, Workout)
   - Scheduled Events section should show sample events

2. **Create a Type:**
   - Fill in name, color, icon, defaults JSON
   - Click "Create Type"
   - Type should appear in the list immediately

3. **Create a Scheduled Event:**
   - Fill in title, select type, set start/end times
   - Click "Create Event"
   - Event should appear in the list immediately

4. **Calendar view:**
   - Navigate to calendar view
   - Events should load for the current month
   - If backend is offline, calendar renders gracefully with 0 events (no crash)

### 4) Troubleshooting

- **net::ERR_CONNECTION_REFUSED**: Backend not running or wrong `VITE_API_BASE`
- **Types array is empty/undefined**: Types loading is guarded; TaskBlock shows "Unknown Type" instead of crashing
- **Backend offline**: Frontend renders gracefully with empty lists
- **Console noise**: Ignore "The message port closed before a response was received" (browser extension noise)

### Sanity Checklist

- ✅ Backend health endpoint responds: `curl http://localhost:8080/api/health`
- ✅ Backend logs show request traces: `➡ GET /api/... [ms] status=...`
- ✅ Backend logs show SQL queries with bound parameters (TRACE level)
- ✅ Create page shows health status
- ✅ Create page lists Types (or empty list without crashing)
- ✅ Create page lists Scheduled Events (or empty list without crashing)
- ✅ Calendar view doesn't crash when backend is offline

## How It Works

### Architecture

- **DndContext**: Wraps the entire app to enable drag-and-drop functionality
- **Task Templates**: Left panel contains draggable task blocks
- **Calendar Grid**: Right panel displays a time-based grid with 15-minute slots
- **Scheduled Items**: Dropped tasks that appear in the calendar

### Key Components

- `TaskBlock`: Visual representation of a task
- `DraggableTaskBlock`: Wrapper that makes task templates draggable
- `ScheduledItem`: Tasks that have been placed in the calendar (also draggable)
- `CalendarGrid`: The time grid with drop zone functionality

### Snapping Logic

The app converts between pixels and time:
- Each hour = 80 pixels
- Drag position → minutes from start → rounded to nearest 15-minute slot
- Position is clamped to calendar bounds (8 AM - 5 PM)

## Technologies

- React 18
- @dnd-kit/core 6.x (drag-and-drop library)
- Tailwind CSS (styling)
- Vite (build tool)

## Extending

To add new task types, modify the `TASK_TEMPLATES` array in `src/App.jsx`:

```javascript
const TASK_TEMPLATES = [
  { id: 'workout', label: 'Workout', color: 'bg-blue-500' },
  // Add more tasks here
];
```

To change calendar hours, modify `START_HOUR` and `END_HOUR` constants.

## Development

### Dev console noise: "The message port closed before a response was received"

In Chrome, this warning typically comes from an extension (React DevTools, password managers, ad blockers) when a message port closes early.  

We install a **dev-only** filter that hides just this line and prints a one-time diagnostic hint if `chrome-extension://` appears in the stack.  

**Production builds are unaffected.** To fully eliminate the warning, disable or remove the offending extension.

The filter is installed automatically in `src/main.jsx` and only active in development mode.

## License

MIT - Free to use and modify

