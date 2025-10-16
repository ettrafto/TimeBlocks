// src/components/DateStrip.jsx
import { formatISO } from 'date-fns';
import DateMenu from './DateMenu';

export default function DateStrip({
  days,                // Date[] for the visible window
  onChangeDay,         // (index: number, newDate: Date) => void
  onPrevWindow,        // () => void
  onNextWindow,        // () => void
  onToday,             // () => void
  viewMode,            // 'day' | '3day' | 'week'
}) {
  const cols = viewMode === 'week' ? 'grid-cols-5' : viewMode === '3day' ? 'grid-cols-3' : 'grid-cols-1';
  const isMultiView = days.length > 1;

  return (
    <div className={`grid ${cols} gap-3 items-center`}>
      {days.map((d, i) => {
        // In multi-view, only the leftmost (index 0) day gets interactive picker
        // In single-day view, the day is always interactive
        const isLeftmost = i === 0;
        const variant = (isMultiView && !isLeftmost) ? 'static' : 'interactive';
        
        return (
          <DateMenu
            key={formatISO(d, { representation: 'date' }) + '-' + i}
            date={d}
            onChange={(newDate) => onChangeDay(i, newDate)}
            onPrev={onPrevWindow}
            onNext={onNextWindow}
            onToday={onToday}
            showArrows={isLeftmost}  // Only show arrows on first menu
            showToday={isLeftmost}    // Only show Today on first menu
            variant={variant}         // Interactive only for leftmost in multi-view
          />
        );
      })}
    </div>
  );
}

