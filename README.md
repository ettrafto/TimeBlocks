# TimeBlocks Experiment

An experimental time-blocking calendar built with React and @dnd-kit/core.

## Features

- **Drag & Drop**: Drag task blocks from the left panel onto the calendar
- **15-Minute Snapping**: Tasks automatically snap to 15-minute increments
- **Rearrange**: Move tasks around within the calendar to reschedule
- **Reusable Tasks**: Task templates remain in the left panel after dragging (they're copied, not moved)
- **Visual Time Grid**: Clear hourly and half-hourly divisions from 8 AM to 5 PM

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to the URL shown in the terminal (usually `http://localhost:5173`)

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

## License

MIT - Free to use and modify

