/**
 * Test hooks for full auth cycle testing
 * Exposed globally as window.tbTestAuth
 */

import { debugLogin, debugMe, debugRefresh, debugLogout } from './debugAuthHarness';
import { useDebugAuthLogStore } from './debugAuthLogStore';

const logStore = useDebugAuthLogStore.getState();

/**
 * Test full auth cycle: login → me → refresh → me → logout
 */
export async function test_fullAuthCycle() {
  const ADMIN_EMAIL = 'admin@local.test';
  const ADMIN_PASSWORD = 'Admin123!';
  
  logStore.addLog('=== STARTING FULL AUTH CYCLE TEST ===');
  
  try {
    // 1. Login
    logStore.addLog('Step 1: Login');
    await debugLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 2. Fetch me
    logStore.addLog('Step 2: Fetch /me');
    await debugMe();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 3. Refresh
    logStore.addLog('Step 3: Refresh token');
    await debugRefresh();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 4. Fetch me again
    logStore.addLog('Step 4: Fetch /me after refresh');
    await debugMe();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 5. Logout
    logStore.addLog('Step 5: Logout');
    await debugLogout();
    
    logStore.addLog('=== FULL AUTH CYCLE TEST COMPLETE ===');
    console.log('[TestAuth] Full auth cycle test completed successfully');
  } catch (err) {
    logStore.addLog(`=== TEST FAILED: ${err.message} ===`);
    console.error('[TestAuth] Full auth cycle test failed', err);
    throw err;
  }
}

// Expose globally for manual testing
if (typeof window !== 'undefined') {
  window.tbTestAuth = {
    test_fullAuthCycle,
  };
}

