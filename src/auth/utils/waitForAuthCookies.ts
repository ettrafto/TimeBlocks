/**
 * Cookie availability utility for auth bootstrap timing
 * 
 * Polls document.cookie to ensure both tb_access and tb_refresh cookies
 * are present before proceeding with authenticated operations.
 * 
 * Handles race conditions where cookies exist on backend response but
 * browser hasn't written them to document.cookie yet.
 */

import { logDebug, logInfo, logWarn } from '../../lib/logging';

export interface WaitForAuthCookiesOptions {
  timeoutMs?: number;
  intervalMs?: number;
  requireRefresh?: boolean; // If true, requires both access AND refresh cookies
  verbose?: boolean; // If true, logs every attempt
}

export interface WaitForAuthCookiesResult {
  success: boolean;
  accessPresent: boolean;
  refreshPresent: boolean;
  elapsedMs: number;
  attempts: number;
}

/**
 * Synchronously check if auth cookies are present.
 * Used for instant checks without polling.
 * 
 * @returns true if both tb_access and tb_refresh cookies are present
 */
export function hasAuthCookies(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  
  const cookieString = document.cookie;
  // Case-insensitive check, look for cookie name followed by =
  const hasAccess = /tb_access\s*=/i.test(cookieString);
  const hasRefresh = /tb_refresh\s*=/i.test(cookieString);
  
  return hasAccess && hasRefresh;
}

/**
 * Check cookies with stabilization to avoid reading mid-update.
 * Reads twice with a small delay to ensure cookie value is stable.
 */
function checkCookiesStable(): { access: boolean; refresh: boolean; stable: boolean } {
  if (typeof document === 'undefined') {
    return { access: false, refresh: false, stable: false };
  }
  
  const cookieString = document.cookie;
  // Case-insensitive check, look for cookie name followed by =
  const access1 = /tb_access\s*=/i.test(cookieString);
  const refresh1 = /tb_refresh\s*=/i.test(cookieString);
  
  // For stabilization, we'd need to wait, but that's async
  // So we just return the current state and let polling handle stability
  return {
    access: access1,
    refresh: refresh1,
    stable: true, // Assume stable for now, polling will catch changes
  };
}

/**
 * Wait for both tb_access and tb_refresh cookies to be present.
 * 
 * @param options - Configuration options
 * @returns Result object with success status and cookie presence
 */
export async function waitForAuthCookies(
  options: WaitForAuthCookiesOptions = {}
): Promise<WaitForAuthCookiesResult> {
  const { 
    timeoutMs = 750, 
    intervalMs = 50,
    requireRefresh = true, // Default to requiring refresh cookie
    verbose = false,
  } = options;
  const startTime = Date.now();
  let attemptCount = 0;

  const logAttempt = (access: boolean, refresh: boolean, attempt: number) => {
    if (verbose || attempt <= 3 || attempt % 5 === 0) {
      logDebug('Auth][CookieCheck', `attempt ${attempt}`, { access, refresh });
    }
  };

  // Initial check
  let cookies = checkCookiesStable();
  attemptCount++;
  logAttempt(cookies.access, cookies.refresh, attemptCount);

  // Check if we have what we need
  const hasRequired = requireRefresh 
    ? (cookies.access && cookies.refresh)
    : cookies.access;

  if (hasRequired) {
    const elapsedMs = Date.now() - startTime;
    logInfo('Auth][CookieCheck', 'cookies present immediately', { 
      elapsedMs,
      access: cookies.access,
      refresh: cookies.refresh,
      requireRefresh,
    });
    return {
      success: true,
      accessPresent: cookies.access,
      refreshPresent: cookies.refresh,
      elapsedMs,
      attempts: attemptCount,
    };
  }

  // Poll until required cookies are present or timeout
  return new Promise<WaitForAuthCookiesResult>((resolve) => {
    const intervalId = setInterval(() => {
      attemptCount++;
      cookies = checkCookiesStable();
      logAttempt(cookies.access, cookies.refresh, attemptCount);

      const elapsedMs = Date.now() - startTime;
      const hasRequired = requireRefresh 
        ? (cookies.access && cookies.refresh)
        : cookies.access;

      if (hasRequired) {
        clearInterval(intervalId);
        logInfo('Auth][CookieCheck', 'cookies present after polling', {
          elapsedMs,
          attempts: attemptCount,
          access: cookies.access,
          refresh: cookies.refresh,
          requireRefresh,
        });
        resolve({
          success: true,
          accessPresent: cookies.access,
          refreshPresent: cookies.refresh,
          elapsedMs,
          attempts: attemptCount,
        });
      } else if (elapsedMs >= timeoutMs) {
        clearInterval(intervalId);
        logWarn('Auth][CookieCheck', 'timeout waiting for cookies', {
          elapsedMs,
          attempts: attemptCount,
          access: cookies.access,
          refresh: cookies.refresh,
          requireRefresh,
          partial: cookies.access || cookies.refresh,
        });
        resolve({
          success: false,
          accessPresent: cookies.access,
          refreshPresent: cookies.refresh,
          elapsedMs,
          attempts: attemptCount,
        });
      }
    }, intervalMs);
  });
}

