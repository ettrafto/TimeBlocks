let refreshHandler: (() => Promise<void>) | null = null
let inflight: Promise<void> | null = null

export function registerRefreshHandler(handler: () => Promise<void>) {
  refreshHandler = handler
}

export async function triggerRefresh() {
  if (!refreshHandler) {
    throw new Error('No auth refresh handler registered')
  }
  if (!inflight) {
    inflight = refreshHandler().finally(() => {
      inflight = null
    })
  }
  return inflight
}


