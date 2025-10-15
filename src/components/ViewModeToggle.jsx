// src/components/ViewModeToggle.jsx

export default function ViewModeToggle({ mode, onChange, className = '' }) {
  const base = "px-3 py-1 rounded-lg border transition text-sm shadow-sm font-medium";
  
  // Reversed: idle looks "active/hovered", active is bright
  const reversedIdle = "bg-gray-800/60 dark:bg-gray-800/60 border-gray-600 dark:border-gray-600 text-gray-100 dark:text-gray-100 hover:bg-transparent hover:border-gray-300 dark:hover:border-gray-600";
  const reversedActive = "bg-white text-gray-900 border-gray-300 hover:bg-gray-200";

  const btn = (k) =>
    `${base} ${mode === k ? reversedActive : reversedIdle}`;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} role="tablist" aria-label="View mode">
      <button 
        className={btn('W')} 
        onClick={() => onChange('W')} 
        role="tab" 
        aria-selected={mode === 'W'}
        aria-label="Week view"
      >
        W
      </button>
      <button 
        className={btn('3')} 
        onClick={() => onChange('3')} 
        role="tab" 
        aria-selected={mode === '3'}
        aria-label="3-day view"
      >
        3
      </button>
      <button 
        className={btn('D')} 
        onClick={() => onChange('D')} 
        role="tab" 
        aria-selected={mode === 'D'}
        aria-label="Day view"
      >
        D
      </button>
    </div>
  );
}

