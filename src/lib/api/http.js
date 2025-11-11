// src/lib/api/http.js
import { log } from "../logger";
import { triggerRefresh } from "../../auth/tokenBridge";

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
  const { _retry, ...rest } = opts;
  const url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  const method = (rest.method || 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json', ...(rest.headers || {}) };
  const body = rest.body !== undefined ? JSON.stringify(rest.body) : undefined;

  // Merge signals: allow caller to pass a signal; create one for timeout
  const controller = new AbortController();
  const callerSignal = rest.signal;
  const timeoutMs = rest.timeoutMs ?? 12000;
  const timeoutId = setTimeout(() => controller.abort(new DOMException('Request timeout', 'TimeoutError')), timeoutMs);

  // If caller provided a signal, abort ours when theirs aborts
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort(callerSignal.reason);
    else callerSignal.addEventListener('abort', () => controller.abort(callerSignal.reason), { once: true });
  }

  const cid = rest.cid || `fe-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  const attempt = async () => {
    if (method !== 'GET' && typeof document !== 'undefined' && !headers['X-XSRF-TOKEN']) {
      const csrfToken = getCookie('XSRF-TOKEN');
      if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;
    }

    const init = {
      method,
      headers: { ...headers, 'X-Correlation-Id': cid },
      body,
      signal: controller.signal,
      credentials: 'include',
    };
    const t0 = performance.now?.() || Date.now();
    try {
      const res = await fetch(url, init);
      const text = await res.text();
      const json = safeJson(text);
      const dt = (performance.now?.() || Date.now()) - t0;
      log.info(['API', method, path], `loaded: ${res.status} in ${Math.round(dt)}ms`);
      if (!res.ok) {
        if (res.status === 401 && !_retry) {
          try {
            await triggerRefresh();
          } catch (refreshErr) {
            throw buildError(res.status, json, cid);
          }
          return http(path, { ...rest, _retry: true });
        }
        throw buildError(res.status, json, cid);
      }
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
        const init = {
          method,
          headers: { ...headers, 'X-Correlation-Id': cid },
          body,
          signal: retryCtrl.signal,
          credentials: 'include',
        };
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

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

export default http;


