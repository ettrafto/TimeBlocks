import React, { useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTypesStore } from '../../state/typesStore.js';
import { useTasksStore } from '../../state/tasksStore.js';

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-xs">{children}</span>;
}

export default function DebugNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const typesCount = useTypesStore(s => (s.items || []).length);
  const tasksCount = useTasksStore(s => Object.keys(s.tasksById || {}).length);
  const subtasksCount = useTasksStore(s => Object.keys(s.subtasksEntities || {}).length);
  const loadTypes = useTypesStore(s => s.loadAll);
  const loadTasks = useTasksStore(s => s.loadAll);

  useEffect(() => {
    loadTypes?.({});
    loadTasks?.({});
  }, [loadTypes, loadTasks]);

  useEffect(() => {
    // Only enable keyboard shortcuts in development
    if (!import.meta.env.DEV) return;
    
    let awaiting = false;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'g') {
        awaiting = true;
        return;
      }
      if (awaiting) {
        awaiting = false;
        const k = e.key.toLowerCase();
        if (k === 'a') nav('/api-testing');
        if (k === 'd') nav('/debug/db-admin');
        if (k === 's') nav('/debug/seed-tools');
        if (k === 'l') nav('/debug/logs');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nav]);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm ${isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`;

  return (
    <nav className="w-full border-b bg-white sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-3">
        <div className="flex items-center gap-2 py-2 overflow-x-auto">
          {import.meta.env.DEV && (
            <NavLink to="/api-testing" className={linkCls}>API Testing</NavLink>
          )}
          <NavLink to="/debug/db-admin" className={linkCls}>DB Admin</NavLink>
          <NavLink to="/debug/seed-tools" className={linkCls}>Seed / Reset</NavLink>
          <NavLink to="/debug/logs" className={linkCls}>Logs / Diagnostics</NavLink>
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-600">
            <span>Types <Badge>{typesCount}</Badge></span>
            <span>Tasks <Badge>{tasksCount}</Badge></span>
            <span>Subtasks <Badge>{subtasksCount}</Badge></span>
          </div>
        </div>
      </div>
    </nav>
  );
}


