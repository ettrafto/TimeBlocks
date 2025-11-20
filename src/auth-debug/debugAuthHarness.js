/**
 * Auth debug harness - wraps real auth client with extensive logging
 */

import * as authClient from '../auth/authClient';
import { useDebugAuthLogStore } from './debugAuthLogStore';
import { renderCookieState } from './debugCookieUtils';

const logStore = useDebugAuthLogStore.getState();

function log(message, data = null) {
  const line = data ? `${message} ${JSON.stringify(data, null, 2)}` : message;
  console.log(`[DebugAuth] ${line}`);
  logStore.addLog(line);
}

/**
 * Debug login - wraps authClient.login with logging
 */
export async function debugLogin(email, password) {
  log('=== LOGIN START ===', { email });
  const cookieStateBefore = renderCookieState();
  log('Cookies before login', cookieStateBefore);

  try {
    const result = await authClient.login({ email, password });
    log('Login SUCCESS', { user: result.user ? { id: result.user.id, email: result.user.email, role: result.user.role } : null });
    
    // Wait a bit for cookies to be set
    await new Promise(resolve => setTimeout(resolve, 100));
    const cookieStateAfter = renderCookieState();
    log('Cookies after login', cookieStateAfter);
    
    return result;
  } catch (err) {
    log('Login FAILED', { 
      error: err.message, 
      status: err.status, 
      code: err.code 
    });
    throw err;
  }
}

/**
 * Debug me - wraps authClient.fetchMe with logging
 */
export async function debugMe() {
  log('=== FETCH ME START ===');
  const cookieStateBefore = renderCookieState();
  log('Cookies before /me', cookieStateBefore);

  try {
    const result = await authClient.fetchMe();
    log('FetchMe SUCCESS', { user: result.user ? { id: result.user.id, email: result.user.email, role: result.user.role } : null });
    
    const cookieStateAfter = renderCookieState();
    log('Cookies after /me', cookieStateAfter);
    
    return result;
  } catch (err) {
    log('FetchMe FAILED', { 
      error: err.message, 
      status: err.status, 
      code: err.code 
    });
    throw err;
  }
}

/**
 * Debug refresh - wraps authClient.refreshAccessToken with logging
 */
export async function debugRefresh() {
  log('=== REFRESH START ===');
  const cookieStateBefore = renderCookieState();
  log('Cookies before refresh', cookieStateBefore);

  try {
    const result = await authClient.refreshAccessToken();
    log('Refresh SUCCESS', result);
    
    // Wait a bit for cookies to be set
    await new Promise(resolve => setTimeout(resolve, 100));
    const cookieStateAfter = renderCookieState();
    log('Cookies after refresh', cookieStateAfter);
    
    return result;
  } catch (err) {
    log('Refresh FAILED', { 
      error: err.message, 
      status: err.status, 
      code: err.code 
    });
    throw err;
  }
}

/**
 * Debug logout - wraps authClient.logout with logging
 */
export async function debugLogout() {
  log('=== LOGOUT START ===');
  const cookieStateBefore = renderCookieState();
  log('Cookies before logout', cookieStateBefore);

  try {
    const result = await authClient.logout();
    log('Logout SUCCESS', result);
    
    // Wait a bit for cookies to be cleared
    await new Promise(resolve => setTimeout(resolve, 100));
    const cookieStateAfter = renderCookieState();
    log('Cookies after logout', cookieStateAfter);
    
    return result;
  } catch (err) {
    log('Logout FAILED', { 
      error: err.message, 
      status: err.status, 
      code: err.code 
    });
    throw err;
  }
}

