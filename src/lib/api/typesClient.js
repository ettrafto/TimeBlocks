// src/lib/api/typesClient.js
import { http } from "./http";
import { log } from "../logger";

function validateType(row) {
  if (!row || (row.id == null) || typeof row.name !== 'string') return null;
  return {
    id: typeof row.id === 'string' ? row.id : String(row.id),
    name: row.name,
    color: typeof row.color === 'string' ? row.color : null,
    // tolerate extra fields
  };
}

export const typesClient = {
  async listTypes(signal) {
    const res = await http('/api/types', { method: 'GET', signal });
    if (!Array.isArray(res)) return [];
    const items = res.map(validateType).filter(Boolean);
    if (items.length !== res.length) {
      log.warn(['API','types','list'], 'validation mismatch', { received: res.length, valid: items.length });
    }
    return items;
  },
  async getType(id, signal) {
    const row = await http(`/api/types/${encodeURIComponent(id)}`, { method: 'GET', signal });
    const v = validateType(row);
    if (!v) {
      log.error(['API','types','get'], 'invalid type shape', { id, row });
      return null;
    }
    return v;
  },
  async createType(dto, signal) {
    const row = await http('/api/types', { method: 'POST', body: dto, signal });
    return validateType(row);
  },
  async updateType(id, dto, signal) {
    const row = await http(`/api/types/${encodeURIComponent(id)}`, { method: 'PATCH', body: dto, signal });
    return validateType(row);
  },
  async deleteType(id, signal) {
    await http(`/api/types/${encodeURIComponent(id)}`, { method: 'DELETE', signal });
    return { ok: true };
  },
};

export default typesClient;


