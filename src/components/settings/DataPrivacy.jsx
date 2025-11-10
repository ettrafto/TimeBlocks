import React from 'react';
import { settingsStore } from '../../state/settingsStore';
import settingsApi from '../../lib/api/settingsClient';

export default function DataPrivacySettings() {
  async function exportJson() {
    try {
      // Try backend; fallback to current store
      let data;
      try {
        data = await settingsApi.exportSettings();
      } catch {
        data = settingsStore.get();
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeblocks-settings-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
    }
  }

  function clearLocalCache() {
    try {
      localStorage.removeItem('user.settings');
    } catch {}
    alert('Local settings cache cleared.');
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Data & Privacy</h2>

      <div className="space-y-4">
        <div className="p-4 border rounded-md flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-800">Export settings (JSON)</div>
            <div className="text-xs text-gray-500">Download your current settings as a JSON file.</div>
          </div>
          <button onClick={exportJson} className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
            Export JSON
          </button>
        </div>

        <div className="p-4 border rounded-md flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-800">Clear local cache</div>
            <div className="text-xs text-gray-500">Removes locally stored settings; server copy unaffected.</div>
          </div>
          <button onClick={clearLocalCache} className="px-3 py-2 text-sm rounded-md bg-white text-gray-800 border border-gray-300 hover:bg-gray-50">
            Clear cache
          </button>
        </div>

        <div className="p-4 border rounded-md">
          <div className="text-sm text-gray-800">Delete account</div>
          <div className="text-xs text-gray-500">Account/profile management will be added later.</div>
        </div>
      </div>
    </div>
  );
}


