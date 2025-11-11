import { create } from 'zustand'
import * as api from './api'
import { AuthStatus, AuthUser } from './types'
import { registerRefreshHandler } from './tokenBridge'

type AuthState = {
  user: AuthUser | null
  status: AuthStatus
  error: string | null
  pendingEmail: string | null
  hydrate: (force?: boolean) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  signup: (email: string, password: string, name?: string | null) => Promise<void>
  verifyEmail: (email: string, code: string) => Promise<void>
  requestPasswordReset: (email: string) => Promise<void>
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',
  error: null,
  pendingEmail: null,
  async hydrate(force = false) {
    const { status } = get()
    if (!force && (status === 'loading' || status === 'authenticated')) return
    set({ status: 'loading', error: null })
    try {
      const res = await api.me()
      set({ user: res.user, status: 'authenticated', error: null })
    } catch (err: any) {
      set({ user: null, status: 'unauthenticated', error: null })
    }
  },
  async login(email, password) {
    set({ status: 'loading', error: null })
    try {
      const res = await api.login({ email, password })
      set({ user: res.user, status: 'authenticated', error: null, pendingEmail: null })
    } catch (err: any) {
      set({ status: 'unauthenticated', error: err?.message || 'Login failed' })
      throw err
    }
  },
  async logout() {
    try {
      await api.logout()
    } finally {
      set({ user: null, status: 'unauthenticated', error: null })
    }
  },
  async signup(email, password, name) {
    set({ error: null, status: 'loading' })
    try {
      await api.signup({ email, password, name })
      set({ pendingEmail: email.toLowerCase(), status: 'unauthenticated' })
    } catch (err: any) {
      set({ status: 'unauthenticated', error: err?.message || 'Signup failed' })
      throw err
    }
  },
  async verifyEmail(email, code) {
    set({ error: null })
    await api.verifyEmail({ email, code })
    if (get().pendingEmail === email) {
      set({ pendingEmail: null })
    }
  },
  async requestPasswordReset(email) {
    set({ error: null })
    await api.requestPasswordReset({ email })
  },
  async resetPassword(email, code, newPassword) {
    set({ error: null })
    await api.resetPassword({ email, code, newPassword })
  },
  clearError() {
    set({ error: null })
  },
}))

registerRefreshHandler(async () => {
  try {
    await api.refresh()
    await useAuthStore.getState().hydrate(true)
  } catch (err) {
    useAuthStore.setState({ user: null, status: 'unauthenticated' })
    throw err
  }
})


