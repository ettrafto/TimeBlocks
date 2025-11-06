import React from 'react';

export default function TypeHeader({ typeEntity, count, collapsed, onToggle }) {
  const color = typeEntity?.color || '#999';
  const name = typeEntity?.name || 'Untyped';
  return (
    <header
      role="button"
      aria-expanded={(!collapsed).toString()}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      className="flex items-center justify-between rounded-lg px-3 py-1.5 bg-white/80 backdrop-blur shadow-sm cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="font-medium">{name}</span>
        <span className="text-xs opacity-70">({count})</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs opacity-70 select-none">{collapsed ? 'Expand' : 'Collapse'}</span>
        <span className="opacity-60">▸</span>
      </div>
    </header>
  );
}


