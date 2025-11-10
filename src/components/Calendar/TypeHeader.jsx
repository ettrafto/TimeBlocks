import React, { useState, useRef, useEffect } from 'react';
import { hexToHsl, withLightness, withSaturation, readableTextOn } from '../Create/colorUtils.js';

const COLOR_OPTIONS = [
  'bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-red-500',
  'bg-yellow-500','bg-pink-500','bg-indigo-500','bg-teal-500','bg-cyan-500'
];

// Icons (outline, consistent with Create page)
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 3.487L20.513 7.138M9.75 20.25H4.5v-5.25L16.862 3.487a2.25 2.25 0 013.182 3.182L7.682 18.182" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 7.5h15m-10.5 0V6a2.25 2.25 0 0 1 2.25-2.25h1.5A2.25 2.25 0 0 1 15.75 6v1.5M6.75 7.5l.75 10.5a2.25 2.25 0 0 0 2.25 2.25h4.5a2.25 2.25 0 0 0 2.25-2.25l.75-10.5" />
  </svg>
);

export default function TypeHeader({ typeEntity, count, collapsed, onToggle, onChangeColor, onEdit, onDelete }) {
  const color = typeEntity?.color || '#3b82f6';
  const name = typeEntity?.name || 'Untyped';
  const [showPicker, setShowPicker] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setShowPicker(false);
    }
    if (showPicker) {
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }
  }, [showPicker]);

  const base = hexToHsl(color);
  const bgHsl = withLightness(withSaturation(base, Math.max(0.35, base.s)), 0.92);
  const bg = `linear-gradient(to bottom right, ${withLightness(base, 0.88) && `hsl(${base.h} ${Math.round(base.s*100)}% ${88}%)`}, ${withLightness(base, 0.92) && `hsl(${base.h} ${Math.round(base.s*100)}% ${92}%)`})`;
  const text = readableTextOn(bgHsl);

  return (
    <header
      role="button"
      aria-expanded={(!collapsed).toString()}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      className="grid grid-cols-[1fr_auto_1fr] items-center rounded-lg px-3 py-1.5 shadow-sm cursor-pointer"
      style={{ background: bg, color: text }}
    >
      {/* Left: type color + name + count */}
      <div className="flex items-center gap-2">
        <div className="relative" ref={ref}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
            className="w-5 h-5 rounded-full ring-2 ring-white/50 hover:scale-110 transition"
            style={{ background: color }}
            title="Change color"
            aria-label="Change color"
          />
          {showPicker && (
            <div
              className="absolute left-0 top-7 bg-white rounded-lg shadow border border-gray-200 p-2 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-5 gap-2">
                {COLOR_OPTIONS.map((cls) => (
                  <ColorDot key={cls} cls={cls} onPick={(hex) => { onChangeColor(hex); setShowPicker(false); }} />
                ))}
              </div>
            </div>
          )}
        </div>
        <span className="font-medium">{name}</span>
        <span className="text-xs opacity-70">({count})</span>
      </div>

      {/* Center: Collapse/Expand arrow */}
      <div className="justify-self-center">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          className="px-4 py-1.5 rounded bg-white/20 hover:bg-white/30 transition-colors"
          aria-label={collapsed ? 'Expand' : 'Collapse'}
          title={collapsed ? 'Expand' : 'Collapse'}
          style={{ color: text }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`${collapsed ? '' : 'rotate-90'} transition-transform`}
          >
            <path d="M8 5l8 7-8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Right: Edit + Delete buttons */}
      <div className="flex items-center gap-2 justify-self-end">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit?.(typeEntity); }}
          className="p-1.5 rounded bg-white/20 hover:bg-white/30 transition-colors"
          title="Edit"
          aria-label="Edit"
          style={{ color: text }}
        >
          <EditIcon />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete?.(typeEntity); }}
          className="p-1.5 rounded bg-black/20 hover:bg-black/30 text-white transition-colors"
          title="Delete"
          aria-label="Delete"
        >
          <TrashIcon />
        </button>
      </div>
    </header>
  );
}

function ColorDot({ cls, onPick }) {
  // map tailwind bg class to hex via CSS computed style fallback
  const map = {
    'bg-blue-500': '#3b82f6',
    'bg-purple-500': '#a855f7',
    'bg-green-500': '#22c55e',
    'bg-orange-500': '#f97316',
    'bg-red-500': '#ef4444',
    'bg-yellow-500': '#eab308',
    'bg-pink-500': '#ec4899',
    'bg-indigo-500': '#6366f1',
    'bg-teal-500': '#14b8a6',
    'bg-cyan-500': '#06b6d4',
  };
  const hex = map[cls] || '#3b82f6';
  return (
    <button
      className={`w-6 h-6 rounded-full ${cls} border-2 border-white hover:scale-110 transition`}
      title={cls}
      aria-label={`Pick ${cls}`}
      onClick={() => onPick(hex)}
    />
  );
}


