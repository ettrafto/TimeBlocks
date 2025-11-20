let refreshHandler: (() => Promise<void>) | null = null
let inflight: Promise<void> | null = null
let refreshFailed = false // Track if refresh has failed to prevent infinite loops

export function registerRefreshHandler(handler: () => Promise<void>) {
  refreshHandler = handler
}

export async function triggerRefresh() {
  if (!refreshHandler) {
    throw new Error('No auth refresh handler registered')
  }
  
  // If refresh already failed, don't try again
  if (refreshFailed) {
    throw new Error('Token refresh already failed')
  }
  
  if (!inflight) {
    inflight = refreshHandler()
      .then(() => {
        // Reset failure flag on success
        refreshFailed = false
      })
      .catch((err) => {
        // Mark as failed to prevent infinite loops
        refreshFailed = true
        throw err
      })
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

// Reset failure flag (e.g., after successful login)
export function resetRefreshFailure() {
  refreshFailed = false
}


