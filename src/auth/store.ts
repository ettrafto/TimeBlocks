import { create } from 'zustand'
import * as authClient from './authClient'
import { AuthStatus, AuthUser } from './types'
import { waitForAuthCookies, hasAuthCookies } from './utils/waitForAuthCookies'
import { getCorrelationId, checkCookiePresence } from '../lib/api/client'
import { logInfo, logWarn, logError, logDebug, logTBError } from '../lib/logging'
import { TBError, isTBError } from '../lib/api/normalizeError'

type AuthActionOptions = {
  debugLabel?: string
}

type AuthState = {
  user: AuthUser | null
  status: AuthStatus
  error: string | null
  pendingEmail: string | null
  hydrate: (force?: boolean, options?: AuthActionOptions) => Promise<void>
  login: (email: string, password: string, options?: AuthActionOptions) => Promise<void>
  logout: (options?: AuthActionOptions) => Promise<authClient.LogoutResponse>
  signup: (email: string, password: string, name?: string | null, options?: AuthActionOptions) => Promise<authClient.SignupResponse>
  verifyEmail: (email: string, code: string, options?: AuthActionOptions) => Promise<authClient.VerifyEmailResponse>
  requestPasswordReset: (email: string, options?: AuthActionOptions) => Promise<authClient.RequestPasswordResetResponse>
  resetPassword: (email: string, code: string, newPassword: string, options?: AuthActionOptions) => Promise<authClient.ResetPasswordResponse>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',
  error: null,
  pendingEmail: null,
  async hydrate(force = false, options?: AuthActionOptions) {
    const { status } = get()
    const cid = getCorrelationId()
    
    logInfo('Auth][Bootstrap][Hydrate', 'entering hydrate', { cid, force, currentStatus: status })
    
    if (!force && (status === 'loading' || status === 'authenticated')) {
      logInfo('Auth][Bootstrap][Hydrate', `skipping - already ${status}`, { cid })
      return
    }
    
    set({ status: 'loading', error: null })
    logInfo('Auth][Bootstrap][Hydrate', 'status -> loading', { cid })
    
    try {
      // Cookie gate before calling /api/auth/me
      // This prevents 401s on cold reload when cookies exist but aren't readable yet
      logInfo('Auth][Hydrate][Cookies', 'cookie gate before calling /api/auth/me', { cid })
      
      // First do a synchronous check
      const hasCookiesSync = hasAuthCookies()
      logDebug('Auth][Hydrate][Cookies', 'synchronous cookie check', { cid, hasCookies: hasCookiesSync })
      
      if (!hasCookiesSync) {
        // Cookies not immediately available, wait for them
        logInfo('Auth][Hydrate][Cookies', 'cookies not immediately available, waiting', { cid })
        const cookieResult = await waitForAuthCookies({ 
          timeoutMs: 700, // Slightly shorter timeout for hydrate
          intervalMs: 50,
          requireRefresh: true,
        })
        
        if (!cookieResult.success) {
          logWarn('Auth][Hydrate][Cookies', 'cookies not fully available after wait', {
            cid,
            elapsedMs: cookieResult.elapsedMs,
            access: cookieResult.accessPresent,
            refresh: cookieResult.refreshPresent,
            attempts: cookieResult.attempts,
          })
          // Continue anyway - might be a cookie write delay
        } else {
          logInfo('Auth][Hydrate][Cookies', 'cookies confirmed present after wait', {
            cid,
            elapsedMs: cookieResult.elapsedMs,
            attempts: cookieResult.attempts,
          })
        }
      } else {
        logInfo('Auth][Hydrate][Cookies', 'cookies immediately available', { cid })
      }
      
      // fetchMe() will automatically handle refresh-on-401 via the HTTP client
      logDebug('Auth][Bootstrap][Hydrate', 'calling /api/auth/me', { cid })
      const res = await authClient.fetchMe({ debugLabel: options?.debugLabel })
      
      logInfo('Auth][Bootstrap][Hydrate', '/api/auth/me success', {
        cid,
        userEmail: res.user?.email || null,
      })
      set({ user: res.user, status: 'authenticated', error: null })
      logInfo('Auth][Bootstrap][Hydrate', 'status -> authenticated', { cid })
    } catch (err: any) {
      // HTTP client already attempted refresh if needed
      // If we get here, either refresh failed or it's a different error
      const error = isTBError(err) ? err : { status: null, code: null, message: err?.message || 'unknown', cid };
      
      // Only mark unauthenticated after:
      // 1. Cookie gate timeout AND
      // 2. me() fails AND
      // 3. (if attempted) refresh fails
      // This prevents premature "unauthenticated" status during cookie write delays
      logTBError('Auth][Bootstrap][Hydrate', error, { cid })
      
      // Check if this is a 401 and distinguish between scenarios
      if (error.status === 401) {
        const cookiesNow = hasAuthCookies()
        const cookiesDetail = checkCookiePresence()
        
        if (!cookiesNow) {
          // No cookies present - user is not logged in (expected scenario)
          logInfo('Auth][Bootstrap][Hydrate', '401 received with no cookies - user not logged in (expected)', {
            cid,
            code: error.code,
          })
        } else if (!cookiesDetail.refresh) {
          // Access cookie present but no refresh token - unusual but possible
          logWarn('Auth][Bootstrap][Hydrate', '401 received with access cookie but no refresh token', {
            cid,
            code: error.code,
            cookies: cookiesDetail,
          })
        } else {
          // Cookies present but me() failed - likely expired tokens or auth issue
          logWarn('Auth][Bootstrap][Hydrate', '401 received with cookies present - tokens may be expired or invalid', {
            cid,
            code: error.code,
            cookies: cookiesDetail,
          })
        }
      }
      
      set({ user: null, status: 'unauthenticated', error: null })
      logInfo('Auth][Bootstrap][Hydrate', 'status -> unauthenticated', { cid })
    } finally {
      logInfo('Auth][Bootstrap][Hydrate', 'exiting hydrate', { cid })
    }
  },
  async login(email, password, options?: AuthActionOptions) {
    const cid = getCorrelationId()
    logInfo('Auth][Login', 'entering login', { cid, email })
    logInfo('Auth][Login', 'status -> loading', { cid })
    set({ status: 'loading', error: null })
    
    try {
      logDebug('Auth][Login', 'calling /api/auth/login', { cid })
      const res = await authClient.login({ email, password }, { debugLabel: options?.debugLabel })
      logInfo('Auth][Login', '/api/auth/login success', {
        cid,
        userEmail: res.user?.email || null,
      })
      
      // Wait for cookies before setting status to authenticated
      // This is critical to prevent data loaders from firing before cookies are ready
      logInfo('Auth][Login][Cookies', 'checking cookie availability post-login', { cid })
      const cookieResult = await waitForAuthCookies({ 
        timeoutMs: 750, 
        intervalMs: 50,
        requireRefresh: true, // Require both access and refresh cookies
        verbose: true, // Log all attempts for login flow
      })
      
      logInfo('Auth][Login][Cookies', 'cookie check result', {
        cid,
        accessPresent: cookieResult.accessPresent,
        refreshPresent: cookieResult.refreshPresent,
        elapsedMs: cookieResult.elapsedMs,
        attempts: cookieResult.attempts,
      })
      
      if (cookieResult.success) {
        logInfo('Auth][Login][Cookies', 'cookies confirmed present - safe to set authenticated status', {
          cid,
          elapsedMs: cookieResult.elapsedMs,
          access: cookieResult.accessPresent,
          refresh: cookieResult.refreshPresent,
        })
      } else {
        logWarn('Auth][Login][Cookies', 'cookies not fully available after timeout - proceeding cautiously', {
          cid,
          elapsedMs: cookieResult.elapsedMs,
          access: cookieResult.accessPresent,
          refresh: cookieResult.refreshPresent,
          attempts: cookieResult.attempts,
        })
        // Continue anyway - cookies might be set by backend but not yet readable
        // But log warning so we can monitor this
      }
      
      // Only set authenticated status after cookie check
      set({ user: res.user, status: 'authenticated', error: null, pendingEmail: null })
      logInfo('Auth][Login', 'status -> authenticated', { cid })
      logInfo('Auth][Login', 'login complete', { cid })
    } catch (err: any) {
      const error = isTBError(err) ? err : { status: null, code: null, message: err?.message || 'unknown', cid };
      logTBError('Auth][Login', error, { cid })
      set({ status: 'unauthenticated', error: error.message || 'Login failed' })
      logInfo('Auth][Login', 'status -> unauthenticated', { cid })
      throw err
    }
  },
  async logout(options?: AuthActionOptions) {
    const cid = getCorrelationId()
    logInfo('Auth][Logout', 'entering logout', { cid })
    try {
      const result = await authClient.logout({ debugLabel: options?.debugLabel })
      logInfo('Auth][Logout', '/api/auth/logout success', { cid })
      return result
    } catch (err: any) {
      const error = isTBError(err) ? err : { status: null, code: null, message: err?.message || 'unknown', cid };
      logWarn('Auth][Logout', '/api/auth/logout failed', {
        cid,
        code: error.code,
        message: error.message,
      })
      return { status: 'logged_out' as const }
    } finally {
      set({ user: null, status: 'unauthenticated', error: null })
      logInfo('Auth][Logout', 'status -> unauthenticated', { cid })
      logInfo('Auth][Logout', 'logout complete', { cid })
    }
  },
  async signup(email, password, name, options?: AuthActionOptions) {
    set({ error: null, status: 'loading' })
    try {
      const response = await authClient.signup({ email, password, name }, { debugLabel: options?.debugLabel })
      set({ pendingEmail: email.toLowerCase(), status: 'unauthenticated' })
      return response
    } catch (err: any) {
      set({ status: 'unauthenticated', error: err?.message || 'Signup failed' })
      throw err
    }
  },
  async verifyEmail(email, code, options?: AuthActionOptions) {
    const cid = getCorrelationId()
    set({ error: null })
    logInfo('Auth][VerifyEmail', 'entering verifyEmail', { cid, email })
    try {
      const res = await authClient.verifyEmail({ email, code }, { debugLabel: options?.debugLabel })
      logInfo('Auth][VerifyEmail', 'email verified successfully', { 
        cid,
        email, 
        verified: res?.verified, 
        alreadyVerified: res?.alreadyVerified 
      })
      if (get().pendingEmail === email) {
        set({ pendingEmail: null })
      }
      return res
    } catch (err: any) {
      const error = isTBError(err) ? err : { status: null, code: null, message: err?.message || 'unknown', cid }
      logTBError('Auth][VerifyEmail', error, { cid, email })
      set({ error: error.message || 'Email verification failed' })
      throw err
    }
  },
  async requestPasswordReset(email, options?: AuthActionOptions) {
    set({ error: null })
    return authClient.requestPasswordReset({ email }, { debugLabel: options?.debugLabel })
  },
  async resetPassword(email, code, newPassword, options?: AuthActionOptions) {
    set({ error: null })
    return authClient.resetPassword({ email, code, newPassword }, { debugLabel: options?.debugLabel })
  },
  clearError() {
    set({ error: null })
  },
}))


