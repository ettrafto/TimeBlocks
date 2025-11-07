import React, { useState, useRef, useEffect } from 'react';
import { hexToHsl, withLightness, withSaturation, readableTextOn } from '../Create/colorUtils.js';

const COLOR_OPTIONS = [
  'bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-red-500',
  'bg-yellow-500','bg-pink-500','bg-indigo-500','bg-teal-500','bg-cyan-500'
];

export default function TypeHeader({ typeEntity, count, collapsed, onToggle, onChangeColor }) {
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
      className="flex items-center justify-between rounded-lg px-3 py-1.5 shadow-sm cursor-pointer"
      style={{ background: bg, color: text }}
    >
      <div className="flex items-center gap-2">
        {/* Color selector button replaces dot */}
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
      <div className="flex items-center gap-2">
        <span className="text-xs opacity-70 select-none" style={{ color: text }}>{collapsed ? 'Expand' : 'Collapse'}</span>
        <span className="opacity-60" style={{ color: text }}>▸</span>
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


