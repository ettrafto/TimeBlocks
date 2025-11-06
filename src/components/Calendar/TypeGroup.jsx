import React from 'react';
import TypeHeader from './TypeHeader';

export default function TypeGroup({ typeEntity, tasks, collapsed, onToggle, topPx }) {
  return (
    <section className="absolute left-0 right-0 z-10" style={{ top: `${topPx}px` }}>
      <TypeHeader typeEntity={typeEntity} count={tasks.length} collapsed={collapsed} onToggle={onToggle} />
      {!collapsed && (
        <div className="mt-1" />
      )}
    </section>
  );
}


