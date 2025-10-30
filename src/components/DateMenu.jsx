// src/components/DateMenu.jsx
import { useEffect, useRef, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';

export default function DateMenu({
  date,
  onChange,   // (Date) => void
  onPrev,     // () => void (shift window left)
  onNext,     // () => void (shift window right)
  onToday,    // () => void
  showArrows = true,
  showToday = true,
  variant = 'interactive', // 'interactive' | 'static'
  hideLabel = false,  // Hide the date label but keep spacing
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', handle);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', handle);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  const label = format(date, 'EEE, MMM d');

  // If hideLabel is true, render empty spacer to maintain grid alignment
  if (hideLabel) {
    return <div className="h-10" aria-hidden="true" />;
  }

  // Split styles: base (visual appearance) vs interactive (hover, cursor)
  const btnBase = "rounded-lg border px-2 py-1 transition shadow-sm font-medium bg-gray-800/60 dark:bg-gray-800/60 border-gray-600 dark:border-gray-600 text-gray-100 dark:text-gray-100";
  const btnInteractive = "cursor-pointer hover:bg-transparent hover:border-gray-300 dark:hover:border-gray-600";
  
  const bigBtnBase = "flex items-center gap-2 rounded-lg border px-3 py-2 transition shadow font-semibold bg-gray-800/60 dark:bg-gray-800/60 border-gray-600 dark:border-gray-600 text-gray-100 dark:text-gray-100";
  const bigBtnInteractive = "cursor-pointer hover:bg-transparent hover:border-gray-300 dark:hover:border-gray-600";
  const bigBtnStatic = "cursor-default pointer-events-none";
  
  // Combine based on context
  const btn = `${btnBase} ${btnInteractive}`;
  const bigBtn = variant === 'interactive' 
    ? `${bigBtnBase} ${bigBtnInteractive}`
    : `${bigBtnBase} ${bigBtnStatic}`;

  return (
    <div ref={ref} className={`relative flex items-center justify-center gap-2 ${className}`}>
      {showArrows && (
        <button
          aria-label="Previous window"
          onClick={onPrev}
          className={btn}
        >
          ←
        </button>
      )}

      {/* Date trigger - interactive (with dropdown) or static (display only) */}
      {variant === 'interactive' ? (
        <button
          aria-label="Open date picker"
          onClick={() => setOpen((v) => !v)}
          className={bigBtn}
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <span>{label}</span>
          <span className="text-xs opacity-70">▼</span>
        </button>
      ) : (
        <span
          className={bigBtn}
          aria-disabled="true"
          tabIndex={-1}
        >
          <span>{label}</span>
          {/* Caret intentionally omitted in static mode */}
        </span>
      )}

      {showArrows && (
        <button
          aria-label="Next window"
          onClick={onNext}
          className={btn}
        >
          →
        </button>
      )}

      {showToday && (
        <button
          aria-label="Today"
          onClick={onToday}
          className={`${btn} text-xs`}
        >
          Today
        </button>
      )}

      {/* Only show dropdown in interactive mode */}
      {variant === 'interactive' && open && (
        <div className="absolute z-50 top-[110%] left-1/2 -translate-x-1/2 rounded-lg border border-gray-600 dark:border-gray-600 bg-white dark:bg-gray-900 p-4 shadow-2xl">
          <DayPicker
            mode="single"
            selected={date}
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

