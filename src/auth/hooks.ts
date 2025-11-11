import { useEffect } from 'react'
import { useAuthStore } from './store'

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
  useEffect(() => {
    if (!shouldHydrate) return
    hydrate().catch(() => {
      /* errors handled in store */
    })
  }, [hydrate, shouldHydrate])
}


