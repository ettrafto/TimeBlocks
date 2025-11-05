// Backend reconciliation utilities

import { scheduledEventsApi } from './api';
import { isValidEvent, diagnoseEvents } from '../utils/eventValidation';

/**
 * Reconciles frontend with backend by cleaning invalid events
 * @returns {Object} - Reconciliation report
 */
export async function reconcileBackendEvents() {
  console.log('🔄 Starting backend reconciliation...');
  
  try {
    // Fetch all events from backend for current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1); // Previous month too
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Next month too
    
    const backendEvents = await scheduledEventsApi.getForRange(
      firstDay.toISOString(),
      lastDay.toISOString()
    );
    
    console.log('📊 Fetched backend events:', backendEvents.length);
    
    // Diagnose issues
    const diagnosis = diagnoseEvents(backendEvents);
    
    if (diagnosis.suspiciousCount === 0) {
      console.log('✅ No invalid events found - backend is clean!');
      return {
        success: true,
        totalEvents: backendEvents.length,
        deletedCount: 0,
        cleanEvents: backendEvents,
      };
    }
    
    console.warn(`🔎 Found ${diagnosis.suspiciousCount} suspicious events:`, diagnosis.suspicious);
    
    // Delete invalid events from backend SEQUENTIALLY with small retry/backoff to avoid SQLite locks
    const deleteResults = [];
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (const { event, issues } of diagnosis.suspicious) {
      let attempt = 0;
      let success = false;
      let lastError = null;
      console.log(`🗑️ Deleting invalid event ${event.id}:`, issues);
      while (attempt < 3 && !success) {
        try {
          await scheduledEventsApi.delete(event.id);
          deleteResults.push({ id: event.id, success: true, issues });
          success = true;
        } catch (error) {
          lastError = error;
          const msg = String(error?.message || "");
          const shouldRetry = /SQLITE_BUSY|database is locked|ECONNRESET|ETIMEDOUT|5\d\d/.test(msg);
          attempt += 1;
          if (shouldRetry && attempt < 3) {
            const backoffMs = 200 * attempt; // 200ms, 400ms
            console.warn(`⚠️ Delete failed for ${event.id} (attempt ${attempt}) — retrying in ${backoffMs}ms...`);
            await sleep(backoffMs);
          } else {
            console.error(`❌ Failed to delete event ${event.id}:`, error);
            deleteResults.push({ id: event.id, success: false, error: msg, issues });
            break;
          }
        }
      }
      // small spacing to avoid hammering DB
      if (success) await sleep(50);
    }
    const deletedCount = deleteResults.filter(r => r.success).length;
    
    console.log(`✅ Reconciliation complete: Deleted ${deletedCount}/${diagnosis.suspiciousCount} invalid events`);
    
    return {
      success: true,
      totalEvents: backendEvents.length,
      suspiciousCount: diagnosis.suspiciousCount,
      deletedCount,
      deleteResults,
      cleanEvents: diagnosis.valid,
    };
  } catch (error) {
    console.error('❌ Reconciliation failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Clears all stuck draft/ghost states
 */
export function clearDraftStates() {
  console.log('🧹 Clearing draft states...');
  
  // Clear any draft event keys from localStorage
  const draftKeys = [
    'tb.draftEvent',
    'tb.resizeDraft',
    'tb.ghostEvent',
    'tb.tempEvent',
    'tb.placeholderEvent'
  ];
  
  draftKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`  → Removing ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ Draft states cleared');
}

/**
 * Full system cleanup: clear drafts + reconcile backend
 */
export async function fullSystemCleanup() {
  console.log('🔧 Starting full system cleanup...');
  
  // Step 1: Clear draft states
  clearDraftStates();
  
  // Step 2: Reconcile backend
  const result = await reconcileBackendEvents();
  
  console.log('✅ System cleanup complete');
  return result;
}

