// src/lib/api/settingsClient.js
import { http } from './http';

export async function getSettings() {
  return await http('/api/settings', { method: 'GET' });
}

export async function putSettings(settings) {
  return await http('/api/settings', { method: 'PUT', body: settings });
}

export async function exportSettings() {
  // Returns JSON for now; can be adapted to stream/download if needed
  return await http('/api/settings/export', { method: 'GET' });
}

export default { getSettings, putSettings, exportSettings };


