// src/components/MultiDayCalendar.jsx
import { formatISO, format } from 'date-fns';

/**
 * MultiDayCalendar renders N CalendarGrid columns, one per day in `days`.
 * It namespaces all droppable/drag ids per-day so multiple grids can coexist in the same DnD context.
 *
 * Props:
 * - days: Date[]                 // ordered days for the current view (1|3|5 entries)
 * - CalendarGrid: ReactComponent // your existing CalendarGrid component
 * - gridProps: object            // common props for all grids (hour range, slotHeight, zoom, etc.)
 * - onDropToDay: (day, payload) => void
 *      Called when an item is dropped into a day's grid. Payload contains whatever your CalendarGrid emits
 * - onResizeOnDay: (day, payload) => void
 *      Called when an event is resized in a day's grid
 * - getEventsForDay: (dateKey) => Event[]
 *      Function to get events for a specific day
 */
export default function MultiDayCalendar({
  days,
  CalendarGrid,
  gridProps,
  onDropToDay,
  onResizeOnDay,
  getEventsForDay,
}) {
  const cols =
    days.length === 5 ? 'grid-cols-5' :
    days.length === 3 ? 'grid-cols-3' : 'grid-cols-1';

  return (
    <div className={`grid ${cols} gap-0 h-full rounded-lg border border-gray-300 bg-white divide-x divide-gray-300 overflow-hidden box-border`}>
      {days.map((day, idx) => {
        const dayKey = formatISO(day, { representation: 'date' }); // YYYY-MM-DD
        const idNamespace = `day:${dayKey}`; // namespace for droppables/draggables

        // Get events for this specific day
        const dayItems = getEventsForDay ? getEventsForDay(dayKey) : 
          (gridProps.scheduledItems || []).filter(item => {
            // Fallback: filter from scheduledItems if getEventsForDay not provided
            if (!item.dateKey) return dayKey === formatISO(days[0], { representation: 'date' });
            return item.dateKey === dayKey;
          });

        return (
          <div key={dayKey} className="flex flex-col min-w-0 h-full overflow-hidden">
            {/* Day header - fixed height to prevent jiggle */}
            <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 shrink-0 box-border">
              <h3 className="text-sm font-semibold text-gray-800 text-center">
                {format(day, 'EEE, MMM d')}
              </h3>
            </div>
            
            {/* Calendar grid for this day - controlled height */}
            <div className="flex-1 overflow-y-auto no-scrollbar box-border calendar-grid-container">
              <CalendarGrid
                {...gridProps}
                scheduledItems={dayItems} // Override with day-filtered items
                // NEW: scope each grid to a single day
                dayDate={day}
                dayKey={dayKey}
                idNamespace={idNamespace}
                // When a drop happens in this grid, bubble up with the day info
                onDrop={(payload) => onDropToDay?.(day, { ...payload, dayKey })}
                onResize={(payload) => onResizeOnDay?.(day, { ...payload, dayKey })}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

