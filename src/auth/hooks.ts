import { useEffect } from 'react'
import React from 'react'
import { useAuthStore } from './store'
import { logInfo, logDebug } from '../lib/logging'

export function useAuth() {
  return useAuthStore()
}

export function useAuthStatus() {
  return useAuthStore((state) => state.status)
}

export function useAuthUser() {
  return useAuthStore((state) => state.user)
}

export function useHydrateAuth(shouldHydrate = true) {
  const hydrate = useAuthStore((state) => state.hydrate)
  const hasHydrated = React.useRef(false)
  
  useEffect(() => {
    if (!shouldHydrate || hasHydrated.current) {
      if (!shouldHydrate) {
        logDebug('Auth][Bootstrap][useHydrateAuth', 'skipping - shouldHydrate=false', {})
      } else if (hasHydrated.current) {
        logDebug('Auth][Bootstrap][useHydrateAuth', 'skipping - already hydrated', {})
      }
      return
    }
    
    hasHydrated.current = true
    logInfo('Auth][Bootstrap][useHydrateAuth', 'triggering hydrate', {})
    
    hydrate()
      .then(() => {
        logInfo('Auth][Bootstrap][useHydrateAuth', 'hydrate completed successfully', {})
      })
      .catch((err) => {
        logError('Auth][Bootstrap][useHydrateAuth', 'hydrate failed', {
          message: err instanceof Error ? err.message : 'unknown',
        })
        /* errors handled in store */
        hasHydrated.current = false // Allow retry on error
      })
  }, [shouldHydrate, hydrate]) // hydrate is stable from Zustand, but we use ref to prevent re-runs
}


