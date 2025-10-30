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

  // DateStrip is now deprecated - navigation moved to main header
  // This component can be removed or kept for backward compatibility
  return null;
}

