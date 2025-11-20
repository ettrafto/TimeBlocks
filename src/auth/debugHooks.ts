/**
 * Internal-only debug hooks for auth testing
 * Exposed at window.__TB_AUTH_DEBUG__
 * 
 * This does NOT modify production behavior.
 */

import { waitForAuthCookies, hasAuthCookies } from './utils/waitForAuthCookies';
import { useAuthStore } from './store';
import { getCorrelationId, ensureCsrfForMutations } from '../lib/api/client';

export interface TBAuthDebug {
  checkCookies: () => Promise<ReturnType<typeof waitForAuthCookies>>;
  dumpAuthState: () => ReturnType<typeof useAuthStore.getState>;
  forceHydrate: () => Promise<void>;
  getCorrelationId: () => string;
  cookies: {
    hasAuthCookies: () => boolean;
    waitForAuthCookies: (options?: Parameters<typeof waitForAuthCookies>[0]) => Promise<ReturnType<typeof waitForAuthCookies>>;
    list: () => string;
    diagnose: () => Promise<void>;
  };
  csrf: {
    hasToken: () => boolean;
    ensureForMutations: () => Promise<void>;
  };
}

export function setupAuthDebugHooks(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const debug: TBAuthDebug = {
    checkCookies: async () => {
      console.log('[Auth][Debug] checkCookies called');
      return waitForAuthCookies({ timeoutMs: 750, intervalMs: 50 });
    },
    
    dumpAuthState: () => {
      console.log('[Auth][Debug] dumpAuthState called');
      const state = useAuthStore.getState();
      const dumped = {
        user: state.user ? {
          id: state.user.id,
          email: state.user.email,
          role: state.user.role,
        } : null,
        status: state.status,
        error: state.error,
        pendingEmail: state.pendingEmail,
      };
      console.log('[Auth][Debug] auth state:', dumped);
      return state;
    },
    
    forceHydrate: async () => {
      console.log('[Auth][Debug] forceHydrate called');
      const state = useAuthStore.getState();
      await state.hydrate(true);
      console.log('[Auth][Debug] forceHydrate completed');
    },
    
    getCorrelationId: () => {
      return getCorrelationId();
    },
    
    cookies: {
      hasAuthCookies: () => {
        const result = hasAuthCookies();
        console.log('[Auth][Debug][Cookies] hasAuthCookies:', result);
        return result;
      },
      
      waitForAuthCookies: async (options) => {
        console.log('[Auth][Debug][Cookies] waitForAuthCookies called with options:', options);
        const result = await waitForAuthCookies({ 
          timeoutMs: 750, 
          intervalMs: 50,
          verbose: true,
          ...options,
        });
        console.log('[Auth][Debug][Cookies] waitForAuthCookies result:', result);
        return result;
      },
      
      list: () => {
        if (typeof document === 'undefined') {
          console.log('[Auth][Debug][Cookies] list: not in browser environment');
          return '';
        }
        const cookies = document.cookie;
        console.log('[Auth][Debug][Cookies] Current cookies:', cookies);
        return cookies;
      },
      
      diagnose: async () => {
        console.log('[Auth][Debug][Cookies] Running cookie diagnosis...');
        console.log('Current cookies:', typeof document !== 'undefined' ? document.cookie : 'N/A (not in browser)');
        
        const hasSync = hasAuthCookies();
        console.log('hasAuthCookies() (sync):', hasSync);
        
        const result = await waitForAuthCookies({ 
          timeoutMs: 1000, 
          intervalMs: 50,
          verbose: true,
          requireRefresh: true,
        });
        console.log('waitForAuthCookies result:', result);
        
        // Parse cookies for detailed info
        if (typeof document !== 'undefined') {
          const cookieString = document.cookie;
          const accessMatch = cookieString.match(/tb_access\s*=\s*([^;]+)/i);
          const refreshMatch = cookieString.match(/tb_refresh\s*=\s*([^;]+)/i);
          
          console.log('Cookie details:', {
            access: accessMatch ? { present: true, valueLength: accessMatch[1].length } : { present: false },
            refresh: refreshMatch ? { present: true, valueLength: refreshMatch[1].length } : { present: false },
          });
        }
      },
    },
    
    csrf: {
      hasToken: () => {
        if (typeof document === 'undefined') {
          console.log('[Auth][Debug][CSRF] hasToken: not in browser environment');
          return false;
        }
        const hasToken = document.cookie.includes('XSRF-TOKEN=');
        console.log('[Auth][Debug][CSRF] hasToken:', hasToken);
        return hasToken;
      },
      
      ensureForMutations: async () => {
        console.log('[Auth][Debug][CSRF] ensureForMutations called');
        try {
          await ensureCsrfForMutations();
          console.log('[Auth][Debug][CSRF] ensureForMutations completed');
        } catch (error) {
          console.error('[Auth][Debug][CSRF] ensureForMutations failed:', error);
          throw error;
        }
      },
    },
  };

  (window as any).__TB_AUTH_DEBUG__ = debug;
  console.log('[Auth][Debug] debug hooks installed at window.__TB_AUTH_DEBUG__');
  console.log('[Auth][Debug] Cookie debug tools available at window.__TB_AUTH_DEBUG__.cookies');
  console.log('[Auth][Debug] CSRF debug tools available at window.__TB_AUTH_DEBUG__.csrf');
}

// Auto-setup in development
if (typeof window !== 'undefined') {
  setupAuthDebugHooks();
}

