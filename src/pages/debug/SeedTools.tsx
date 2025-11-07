import React from 'react';
import DebugNav from '../../debug/components/DebugNav';
import { API_BASE } from '../../services/api';

export default function SeedTools() {
  const callTool = async (path: string, method: string = 'POST') => {
    try {
      const res = await fetch(`${API_BASE}${path}`, { method });
      const text = await res.text();
      alert(`${method} ${path}\n${res.status}\n${text}`);
    } catch (e) {
      alert(String(e));
    }
  };
  return (
    <div className="w-full min-h-screen bg-gray-50">
      <DebugNav />
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <h1 className="text-lg font-semibold">Seed / Reset Tools</h1>
        <div className="bg-white border rounded-md p-4 space-y-2">
          <button className="px-3 py-2 bg-red-600 text-white rounded" onClick={() => callTool('/api/debug/reset-db')}>Reset DB</button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => callTool('/api/debug/seed-minimal')}>Seed Minimal</button>
        </div>
        <p className="text-xs text-gray-500">Wire these endpoints on the backend if not present.</p>
      </div>
    </div>
  );
}


