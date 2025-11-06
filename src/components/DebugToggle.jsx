// src/components/DebugToggle.jsx
import { useEffect, useState } from 'react';

export default function DebugToggle() {
  const [on, setOn] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('TB_DEBUG') === '1';
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('TB_DEBUG', on ? '1' : '0');
    }
  }, [on]);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <button
      onClick={() => setOn(v => !v)}
      title="Toggle Pipeline Trace (Ctrl/Cmd+Shift+L)"
      style={{ position: 'fixed', bottom: 12, right: 12, opacity: 0.6 }}
      className="px-2 py-1 text-xs border rounded bg-white hover:opacity-100 z-50"
    >
      Trace: {on ? 'ON' : 'OFF'}
    </button>
  );
}



