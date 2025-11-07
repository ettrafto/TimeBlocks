// src/lib/api/http.js
import { log } from "../logger";

const BASE_URL = (import.meta?.env?.VITE_API_BASE || "http://localhost:8080").replace(/\/+$/, "");

function safeJson(text) {
  try { return text ? JSON.parse(text) : null; }
  catch { return { raw: text }; }
}

function buildError(status, body, cid) {
  const code = body && (body.code || body.errorCode);
  const message = (body && (body.message || body.error)) || `HTTP ${status}`;
  const details = body && (body.details || body.errors);
  return { status, code, message, details, cid };
}

export async function http(path, opts = {}) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  const method = (opts.method || 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;

  // Merge signals: allow caller to pass a signal; create one for timeout
  const controller = new AbortController();
  const callerSignal = opts.signal;
  const timeoutMs = opts.timeoutMs ?? 12000;
  const timeoutId = setTimeout(() => controller.abort(new DOMException('Request timeout', 'TimeoutError')), timeoutMs);

  // If caller provided a signal, abort ours when theirs aborts
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort(callerSignal.reason);
    else callerSignal.addEventListener('abort', () => controller.abort(callerSignal.reason), { once: true });
  }

  const cid = opts.cid || `fe-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  const attempt = async () => {
    const init = { method, headers: { ...headers, 'X-Correlation-Id': cid }, body, signal: controller.signal };
    const t0 = performance.now?.() || Date.now();
    try {
      const res = await fetch(url, init);
      const text = await res.text();
      const json = safeJson(text);
      const dt = (performance.now?.() || Date.now()) - t0;
      log.info(['API', method, path], `loaded: ${res.status} in ${Math.round(dt)}ms`);
      if (!res.ok) throw buildError(res.status, json, cid);
      return json;
    } catch (err) {
      // Normalize error shape
      if (err?.name === 'AbortError' || err?.message === 'Request timeout') {
        const e = buildError(0, { message: 'Request aborted/timeout' }, cid);
        e.abort = true;
        throw e;
      }
      if (err && typeof err.status === 'number') throw err;
      throw buildError(0, { message: err?.message || String(err) }, cid);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // One retry for idempotent GET
  if (method === 'GET') {
    try {
      return await attempt();
    } catch (e) {
      if (e.abort) throw e;
      log.warn(['API', method, path], 'retry after failure', e);
      // New controller for retry
      const retryCtrl = new AbortController();
      const retryTimeoutId = setTimeout(() => retryCtrl.abort(new DOMException('Request timeout', 'TimeoutError')), timeoutMs);
      try {
        const init = { method, headers: { ...headers, 'X-Correlation-Id': cid }, body, signal: retryCtrl.signal };
        const res = await fetch(url, init);
        const text = await res.text();
        const json = safeJson(text);
        if (!res.ok) throw buildError(res.status, json, cid);
        return json;
      } finally {
        clearTimeout(retryTimeoutId);
      }
    }
  }

  return attempt();
}

export default http;


