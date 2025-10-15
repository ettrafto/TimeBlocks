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

  return (
    <div className={`grid ${cols} gap-3 items-center`}>
      {days.map((d, i) => (
        <DateMenu
          key={formatISO(d, { representation: 'date' }) + '-' + i}
          date={d}
          onChange={(newDate) => onChangeDay(i, newDate)}
          onPrev={onPrevWindow}
          onNext={onNextWindow}
          onToday={onToday}
          showArrows={i === 0} // Only show arrows on first menu
          showToday={i === 0}   // Only show Today on first menu
        />
      ))}
    </div>
  );
}

