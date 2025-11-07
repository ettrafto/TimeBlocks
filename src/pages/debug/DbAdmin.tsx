import React from 'react';
import DebugNav from '../../debug/components/DebugNav';

export default function DbAdmin() {
  return (
    <div className="w-full min-h-screen bg-gray-50">
      <DebugNav />
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-lg font-semibold mb-4">DB Admin</h1>
        <p className="text-sm text-gray-600">Stub: add tables/links to entities here.</p>
      </div>
    </div>
  );
}


