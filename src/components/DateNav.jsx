// src/components/DateNav.jsx
import { useEffect, useState, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';

export default function DateNav({
  value,             // Date
  onChange,          // (Date) => void
  onPrev,            // () => void
  onNext,            // () => void
  onToday,           // () => void
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close calendar on outside click/escape
  useEffect(() => {
    function handleDocClick(e) {
      if (!open) return;
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    function onEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  // Keyboard shortcuts: ← / → switch days, "t" for today, "c" toggle calendar
  useEffect(() => {
    function onKey(e) {
      if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
      if (e.key.toLowerCase() === 't') onToday?.();
      if (e.key.toLowerCase() === 'c') setOpen((v) => !v);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onPrev, onNext, onToday]);

  const formatted = format(value, 'EEE, MMM d, yyyy');

  // Reversed styling: default looks "active", hover returns to subtle look
  const btn = "rounded-lg border px-3 py-2 transition shadow-sm font-medium bg-gray-800/60 dark:bg-gray-800/60 border-gray-600 dark:border-gray-600 text-gray-100 dark:text-gray-100 hover:bg-transparent hover:border-gray-300 dark:hover:border-gray-600";
  const bigBtn = "flex items-center gap-2 rounded-lg border px-4 py-2 transition shadow font-semibold bg-gray-800/60 dark:bg-gray-800/60 border-gray-600 dark:border-gray-600 text-gray-100 dark:text-gray-100 hover:bg-transparent hover:border-gray-300 dark:hover:border-gray-600";

  return (
    <div ref={containerRef} className={`relative flex items-center gap-3 select-none ${className}`}>
      <button
        aria-label="Previous period"
        onClick={onPrev}
        className={btn}
      >
        ←
      </button>

      <button
        aria-label="Open date picker"
        onClick={() => setOpen((v) => !v)}
        className={bigBtn}
      >
        <span>{formatted}</span>
        <span className="text-xs opacity-70">▼</span>
      </button>

      <button
        aria-label="Next period"
        onClick={onNext}
        className={btn}
      >
        →
      </button>

      <button
        aria-label="Today"
        onClick={onToday}
        className={`${btn} text-sm`}
      >
        Today
      </button>

      {open && (
        <div className="absolute z-50 top-[110%] left-1/2 -translate-x-1/2 rounded-lg border border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-900 p-4 shadow-2xl">
          <DayPicker
            mode="single"
            selected={value}
            onSelect={(d) => { if (d) { onChange?.(d); setOpen(false); } }}
            weekStartsOn={1}
            showOutsideDays
            fixedWeeks
            captionLayout="dropdown-buttons"
          />
        </div>
      )}
    </div>
  );
}

