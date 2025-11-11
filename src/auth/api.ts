import http from '../lib/api/http'
import { AuthUser } from './types'

type AuthResponse = {
  user: AuthUser
}

let csrfPromise: Promise<unknown> | null = null

function hasCsrfCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some((part) => part.trim().startsWith('XSRF-TOKEN='))
}

async function ensureCsrf(): Promise<void> {
  if (hasCsrfCookie()) return
  if (!csrfPromise) {
    csrfPromise = http('/api/auth/csrf', { method: 'GET' }).catch((err) => {
      csrfPromise = null
      throw err
    })
  }
  try {
    await csrfPromise
  } finally {
    csrfPromise = null
  }
}

export async function signup(body: { email: string; password: string; name?: string | null }) {
  await ensureCsrf()
  await http('/api/auth/signup', { method: 'POST', body })
}

export async function verifyEmail(body: { email: string; code: string }) {
  await ensureCsrf()
  return http('/api/auth/verify-email', { method: 'POST', body })
}

export async function login(body: { email: string; password: string }): Promise<AuthResponse> {
  await ensureCsrf()
  return http('/api/auth/login', { method: 'POST', body })
}

export async function logout() {
  await ensureCsrf()
  await http('/api/auth/logout', { method: 'POST' })
}

export async function me(): Promise<AuthResponse> {
  return http('/api/auth/me', { method: 'GET' })
}

export async function refresh() {
  await ensureCsrf()
  await http('/api/auth/refresh', { method: 'POST' })
}

export async function requestPasswordReset(body: { email: string }) {
  await ensureCsrf()
  await http('/api/auth/request-password-reset', { method: 'POST', body })
}

export async function resetPassword(body: { email: string; code: string; newPassword: string }) {
  await ensureCsrf()
  await http('/api/auth/reset-password', { method: 'POST', body })
}

