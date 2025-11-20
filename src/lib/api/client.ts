/**
 * Central HTTP Client for TimeBlocks Frontend
 * 
 * This is the single source of truth for all API calls.
 * It handles:
 * - Automatic refresh-on-401
 * - CSRF token attachment
 * - Correlation ID management
 * - Consistent error formatting
 * - Cookie-based authentication
 */

import { logInfo, logWarn, logError, logDebug } from '../logging';
import { normalizeError, TBError, isTBError } from './normalizeError';
import { emitHttpEvent } from './httpEvents';

// Re-export for consumers
export type { TBError };
export { normalizeError, isTBError };

const BASE_URL = (import.meta?.env?.VITE_API_BASE || "http://localhost:8080").replace(/\/+$/, "");

// Correlation ID management
let correlationId: string | null = null;

export function getCorrelationId(): string {
  if (correlationId) {
    return correlationId;
  }
  // Try to get from localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('tb_correlation_id');
    if (stored) {
      correlationId = stored;
      return stored;
    }
  }
  // Generate new one
  const newId = `fe-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
  correlationId = newId;
  if (typeof window !== 'undefined') {
    localStorage.setItem('tb_correlation_id', newId);
  }
  return newId;
}

function setCorrelationId(id: string | null) {
  correlationId = id;
  if (typeof window !== 'undefined') {
    if (id) {
      localStorage.setItem('tb_correlation_id', id);
    } else {
      localStorage.removeItem('tb_correlation_id');
    }
  }
}

// Extract correlation ID from response header
function extractCorrelationId(response: Response): void {
  const cid = response.headers.get('X-Correlation-Id');
  if (cid) {
    setCorrelationId(cid);
  }
}

/**
 * CSRF Token Management
 * 
 * Backend CSRF Contract (from backend-auth-architecture.md):
 * - Cookie name: XSRF-TOKEN (set by CookieCsrfTokenRepository.withHttpOnlyFalse())
 * - Header name: X-XSRF-TOKEN
 * - /api/auth/** endpoints are CSRF-exempt (ignored by backend CSRF filter)
 * - All non-auth POST/PUT/PATCH/DELETE endpoints require CSRF header
 * - GET endpoints do not require CSRF
 * 
 * Rule of thumb:
 * - All non-auth POST/PUT/PATCH/DELETE must send X-XSRF-TOKEN from XSRF-TOKEN cookie
 * - All GET endpoints are fine without CSRF
 * - /api/auth/** is globally excluded and should not rely on CSRF
 */

// CSRF token management
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; XSRF-TOKEN=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

let csrfPromise: Promise<void> | null = null;

/**
 * Ensure CSRF token is available (for auth endpoints).
 * This is used by /api/auth/** endpoints that need CSRF for their own POST requests.
 * 
 * For data mutations, use ensureCsrfForMutations() instead.
 */
async function ensureCsrf(): Promise<void> {
  if (getCsrfToken()) {
    return;
  }
  if (!csrfPromise) {
    const cid = getCorrelationId();
    logDebug('HTTP][CSRF', 'fetching CSRF token from /api/auth/csrf', { cid });
    csrfPromise = fetch(`${BASE_URL}/api/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(() => {
        const cid = getCorrelationId();
        logDebug('HTTP][CSRF', 'token fetched and cookie set', { cid });
      })
      .catch((err) => {
        const cid = getCorrelationId();
        logError('HTTP][CSRF', 'failed to fetch token', { cid, error: err });
        throw err;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }
  await csrfPromise;
}

/**
 * Ensure CSRF token is available for data mutations.
 * This is the same as ensureCsrf() but with clearer naming for non-auth endpoints.
 * 
 * Behavior:
 * - If XSRF-TOKEN cookie is present: return immediately
 * - If missing: call GET /api/auth/csrf to acquire token
 * - Idempotent and safe to call frequently (uses in-flight promise caching)
 * 
 * Should NOT be used for /api/auth/** endpoints (those use ensureCsrf()).
 */
export async function ensureCsrfForMutations(): Promise<void> {
  const cid = getCorrelationId();
  
  if (getCsrfToken()) {
    logDebug('CSRF][Data', 'ensureCsrfForMutations: token already present', { cid });
    return;
  }
  
  logInfo('CSRF][Data', 'ensureCsrfForMutations: fetching /api/auth/csrf', { cid });
  
  if (!csrfPromise) {
    csrfPromise = fetch(`${BASE_URL}/api/auth/csrf`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(async () => {
        // Poll briefly to ensure cookie is actually set
        let attempts = 0;
        const maxAttempts = 10;
        while (attempts < maxAttempts && !getCsrfToken()) {
          await new Promise(resolve => setTimeout(resolve, 10));
          attempts++;
        }
        
        const cid = getCorrelationId();
        if (getCsrfToken()) {
          logInfo('CSRF][Data', 'ensureCsrfForMutations: token acquired', { cid, attempts });
        } else {
          logWarn('CSRF][Data', 'ensureCsrfForMutations: token not found after fetch', { cid, attempts });
        }
      })
      .catch((err) => {
        const cid = getCorrelationId();
        logError('CSRF][Data', 'ensureCsrfForMutations: failed to fetch token', { cid, error: err });
        throw err;
      })
      .finally(() => {
        csrfPromise = null;
      });
  }
  
  await csrfPromise;
}

// Refresh token management
let refreshInFlight: Promise<boolean> | null = null;
let refreshFailed = false;

export function checkCookiePresence(): { access: boolean; refresh: boolean } {
  if (typeof document === 'undefined') {
    return { access: false, refresh: false };
  }
  const cookieString = document.cookie;
  return {
    access: cookieString.includes('tb_access='),
    refresh: cookieString.includes('tb_refresh='),
  };
}

async function attemptRefresh(): Promise<boolean> {
  const cid = getCorrelationId();
  const cookies = checkCookiePresence();
  
  // If refresh already failed, don't try again
  if (refreshFailed) {
    logWarn('Auth][Refresh', 'refresh already failed, not attempting again', { cid });
    throw new Error('Token refresh already failed');
  }

  // If refresh already in progress, await it
  if (refreshInFlight) {
    logInfo('Auth][Refresh', 'refresh already in progress, awaiting existing attempt', { cid });
    return refreshInFlight;
  }

  // Check for refresh token cookie before attempting refresh
  if (!cookies.refresh) {
    logWarn('Auth][Refresh', 'skipping refresh - no refresh token cookie present', {
      cid,
      cookies: cookies,
    });
    const error = normalizeError(
      { error: 'missing_refresh_token', message: 'No refresh token cookie available' },
      {
        url: `${BASE_URL}/api/auth/refresh`,
        method: 'POST',
        cid,
      }
    );
    refreshFailed = true;
    throw error;
  }

  // Start new refresh
  logInfo('Auth][Refresh', 'starting refresh attempt', {
    cid,
    cookies: cookies,
  });
  
  refreshInFlight = (async () => {
    try {
      // Ensure CSRF token before refresh
      await ensureCsrf();
      
      const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': cid,
          ...(getCsrfToken() ? { 'X-XSRF-TOKEN': getCsrfToken()! } : {}),
        },
      });

      extractCorrelationId(response);
      const cookiesAfter = checkCookiePresence();

      if (!response.ok) {
        const text = await response.text();
        let json: any = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          // Not JSON
        }
        refreshFailed = true;
        const refreshError = normalizeError(json || { error: 'unknown' }, {
          url: `${BASE_URL}/api/auth/refresh`,
          method: 'POST',
          cid,
          response,
        });
        logError('Auth][Refresh', 'refresh failed', {
          cid,
          status: refreshError.status,
          code: refreshError.code,
          cookies: cookiesAfter,
        });
        throw refreshError;
      }

      // Refresh succeeded
      refreshFailed = false;
      logInfo('Auth][Refresh', 'refresh succeeded', {
        cid,
        cookies: cookiesAfter,
      });
      return true;
    } catch (err) {
      refreshFailed = true;
      const cookiesAfter = checkCookiePresence();
      const refreshError = normalizeError(err, {
        url: `${BASE_URL}/api/auth/refresh`,
        method: 'POST',
        cid,
      });
      logError('Auth][Refresh', 'refresh error', {
        cid,
        code: refreshError.code,
        message: refreshError.message,
        cookies: cookiesAfter,
      });
      throw refreshError;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// Reset refresh failure (e.g., after successful login)
export function resetRefreshFailure() {
  refreshFailed = false;
}

// Main HTTP client function
export interface HttpOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
  timeoutMs?: number;
  skipRefresh?: boolean; // Set to true for refresh endpoint itself
  debugLabel?: string;
}

export async function apiRequest<T = any>(path: string, options: HttpOptions = {}): Promise<T> {
  const {
    method = 'GET',
    headers = {},
    body: bodyPayload,
    signal,
    timeoutMs = 12000,
    skipRefresh = false,
    debugLabel,
  } = options;

  const url = `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
  const cid = getCorrelationId();
  const requestId = `${cid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const originalBody = bodyPayload;
  const serializedBody = bodyPayload !== undefined ? JSON.stringify(bodyPayload) : undefined;

  // Build request headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Correlation-Id': cid,
    ...headers,
  };

  // Attach CSRF token for state-changing requests
  // Rule: /api/auth/** endpoints are CSRF-exempt, but we still attach token if available
  // For non-auth endpoints, CSRF is required for POST/PUT/PATCH/DELETE
  const isAuthEndpoint = path.startsWith('/api/auth/');
  const isStateChanging = method !== 'GET';
  
  if (isStateChanging && !skipRefresh) {
    if (isAuthEndpoint) {
      // Auth endpoints are CSRF-exempt, but we still try to attach token if available
      // (Some auth endpoints like /api/auth/refresh may use CSRF)
      await ensureCsrf();
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        requestHeaders['X-XSRF-TOKEN'] = csrfToken;
        logDebug('HTTP][CSRF', `CSRF token attached for auth endpoint: ${method} ${path}`, { cid });
      }
    } else {
      // Non-auth state-changing endpoints require CSRF
      await ensureCsrfForMutations();
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        requestHeaders['X-XSRF-TOKEN'] = csrfToken;
        logDebug('HTTP][CSRF', `CSRF token attached: ${method} ${path}`, { cid });
      } else {
        // This is a warning - CSRF token should be present for data mutations
        logWarn('HTTP][CSRF', `No XSRF-TOKEN cookie found for state-changing request: ${method} ${path}`, {
          cid,
          method,
          path,
        });
      }
    }
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException('Request timeout', 'TimeoutError'));
  }, timeoutMs);

  // Merge signals
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason);
    } else {
      signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
    }
  }

  const startedAt = performance.now?.() || Date.now();
  let finalStatus: number | null = null;
  let finalResponseBody: any = null;
  let finalError: TBError | null = null;

  const attempt = async (isRetry = false): Promise<T> => {
    try {
      const init: RequestInit = {
        method,
        headers: requestHeaders,
        body: serializedBody,
        signal: controller.signal,
        credentials: 'include',
      };

      console.debug('[HTTP] request', {
        path,
        method,
        credentials: 'include',
        cid,
        isRetry,
      });

      const response = await fetch(url, init);
      const text = await response.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // Not JSON
      }

      // Extract correlation ID from response
      extractCorrelationId(response);

      logDebug('HTTP', `response: ${method} ${path} status=${response.status}`, { cid, isRetry });

      // Handle 401 Unauthorized
      if (response.status === 401 && !isRetry && !skipRefresh) {
        const errorBody = json || { error: 'unauthorized' };
        const cookies = checkCookiePresence();
        
        const normalizedError = normalizeError(errorBody, {
          url,
          method,
          cid,
          response,
        });
        
        logWarn('HTTP', `401 Unauthorized: ${method} ${path}`, {
          cid,
          code: normalizedError.code,
          cookies: cookies,
        });
        
        // Only attempt refresh for "unauthorized" errors, not "bad_credentials"
        if (normalizedError.code === 'unauthorized') {
          // Check for refresh token before attempting refresh
          if (!cookies.refresh) {
            logWarn('HTTP', `401 received but no refresh token - skipping refresh attempt for ${method} ${path}`, {
              cid,
              cookies: cookies,
            });
            // No refresh token available, so refresh would fail - throw the 401 directly
            throw normalizedError;
          }
          
          try {
            logInfo('HTTP', `attempting token refresh for ${method} ${path}`, { cid });
            await attemptRefresh();
            logInfo('HTTP', `token refresh succeeded, retrying ${method} ${path}`, { cid });
            // Retry the original request once
            return attempt(true);
          } catch (refreshErr) {
            const cookiesAfter = checkCookiePresence();
            const refreshError = normalizeError(refreshErr, { url, method, cid });
            logError('HTTP', `token refresh failed: ${method} ${path}`, {
              cid,
              code: refreshError.code,
              message: refreshError.message,
              cookies: cookiesAfter,
            });
            throw normalizedError;
          }
        } else {
          logWarn('HTTP', `401 with code="${normalizedError.code}" - not attempting refresh`, {
            cid,
            method,
            path,
          });
        }
      }

      if (!response.ok) {
        const normalizedError = normalizeError(json || { error: 'unknown' }, {
          url,
          method,
          cid,
          response,
        });
        finalStatus = response.status;
        finalResponseBody = json;
        finalError = normalizedError;
        throw normalizedError;
      }

      finalStatus = response.status;
      finalResponseBody = json;
      return json as T;
    } catch (err) {
      if (err instanceof DOMException && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
        const abortError: TBError = {
          status: 0,
          code: 'abort_error',
          message: err.message || 'Request aborted/timeout',
          cid,
          url,
          method,
          isAbort: true,
          raw: err,
        };
        finalStatus = 0;
        finalError = abortError;
        throw abortError;
      }

      if (isTBError(err)) {
        finalStatus = err.status ?? finalStatus;
        finalError = err;
        throw err;
      }

      const normalizedError = normalizeError(err, {
        url,
        method,
        cid,
      });
      finalStatus = normalizedError.status ?? finalStatus;
      finalError = normalizedError;
      throw normalizedError;
    }
  };

  try {
    return await attempt();
  } finally {
    clearTimeout(timeoutId);
    const durationMs = (performance.now?.() || Date.now()) - startedAt;
    emitHttpEvent({
      id: requestId,
      label: debugLabel,
      client: 'api',
      method,
      path,
      url,
      status: finalStatus,
      ok: !finalError && (typeof finalStatus === 'number' ? finalStatus < 400 : true),
      cid,
      timestamp: Date.now(),
      durationMs,
      requestBody: originalBody,
      responseBody: finalResponseBody,
      error: finalError ?? undefined,
    });
  }
}

// Convenience methods
export const api = {
  get: <T = any>(path: string, options?: Omit<HttpOptions, 'method'>) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  
  post: <T = any>(path: string, body?: any, options?: Omit<HttpOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  
  put: <T = any>(path: string, body?: any, options?: Omit<HttpOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  
  patch: <T = any>(path: string, body?: any, options?: Omit<HttpOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  
  delete: <T = any>(path: string, options?: Omit<HttpOptions, 'method'>) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};

export default api;

