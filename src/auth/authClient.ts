/**
 * Unified Auth Client for TimeBlocks Frontend
 * 
 * This module provides type-safe auth functions that integrate
 * with the central HTTP client and update the auth store.
 */

import { api, getCorrelationId } from '../lib/api/client';
import { resetRefreshFailure } from '../lib/api/client';
import { AuthUser } from './types';
import { logInfo, logWarn, logDebug } from '../lib/logging';

export interface AuthResponse {
  user: AuthUser;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  name?: string | null;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface RefreshResponse {
  status: 'refreshed';
}

export interface LogoutResponse {
  status: 'logged_out';
}

export interface SignupResponse {
  status: 'verification_required';
}

export interface VerifyEmailResponse {
  verified: boolean;
  alreadyVerified: boolean;
  verifiedAt: string | null;
}

export interface RequestPasswordResetResponse {
  status: 'reset_requested';
}

export interface ResetPasswordResponse {
  status: 'password_updated';
}

export interface AuthClientRequestOptions {
  debugLabel?: string;
}

/**
 * Login with email and password.
 * 
 * On success:
 * - Cookies (tb_access, tb_refresh) are set by the backend
 * - Returns the user object
 * 
 * On 401 with error="bad_credentials":
 * - Does NOT attempt refresh
 * - Throws an error with message "Invalid email or password"
 */
export async function login(request: LoginRequest, options?: AuthClientRequestOptions): Promise<AuthResponse> {
  try {
    const response = await api.post<AuthResponse>('/api/auth/login', request, {
      skipRefresh: true, // Don't attempt refresh on login endpoint
      debugLabel: options?.debugLabel || 'auth:login',
    });
    
    // Reset refresh failure flag on successful login
    resetRefreshFailure();
    
    return response;
  } catch (err: any) {
    // Check if it's a bad_credentials error
    if (err?.status === 401 && err?.code === 'bad_credentials') {
      const error = new Error('Invalid email or password');
      (error as any).status = 401;
      (error as any).code = 'bad_credentials';
      throw error;
    }
    throw err;
  }
}

/**
 * Get current authenticated user.
 * 
 * On 200: Returns user object
 * On 401: Throws error (caller may choose to let refresh logic handle it)
 */
export async function fetchMe(options?: AuthClientRequestOptions): Promise<AuthResponse> {
  const cid = getCorrelationId();
  logDebug('Auth][Bootstrap][Me', 'calling /api/auth/me', { cid });
  
  try {
    const result = await api.get<AuthResponse>('/api/auth/me', {
      debugLabel: options?.debugLabel || 'auth:me',
    });
    logInfo('Auth][Bootstrap][Me', '/api/auth/me success', {
      cid,
      userEmail: result.user?.email || null,
    });
    return result;
  } catch (err: any) {
    const status = err?.status || null;
    const code = err?.code || null;
    logWarn('Auth][Bootstrap][Me', '/api/auth/me failed', {
      cid,
      status,
      code,
      message: err?.message || 'unknown',
    });
    throw err;
  }
}

/**
 * Refresh access token using refresh token.
 * 
 * On success:
 * - Returns status object
 * - New cookies (tb_access, tb_refresh) are set by the backend
 * 
 * On 400 or other failure:
 * - Throws error
 * - Must be treated as "refresh failed, user must be logged out"
 */
export async function refreshAccessToken(options?: AuthClientRequestOptions): Promise<RefreshResponse> {
  return api.post<RefreshResponse>('/api/auth/refresh', undefined, {
    skipRefresh: true, // Don't attempt refresh on refresh endpoint itself
    debugLabel: options?.debugLabel || 'auth:refresh',
  });
}

/**
 * Logout and revoke refresh token.
 * 
 * On success:
 * - Clears cookies (tb_access, tb_refresh)
 * - Returns status object
 * 
 * Does NOT attempt refresh on failure.
 */
export async function logout(options?: AuthClientRequestOptions): Promise<LogoutResponse> {
  try {
    return await api.post<LogoutResponse>('/api/auth/logout', undefined, {
      skipRefresh: true, // Don't attempt refresh on logout
      debugLabel: options?.debugLabel || 'auth:logout',
    });
  } catch (err) {
    // Even if logout fails, we should clear local state
    // The error is logged but not thrown
    console.warn('[Auth] logout request failed, but clearing local state', err);
    return { status: 'logged_out' };
  }
}

/**
 * Signup with email, password, and optional name.
 */
export async function signup(request: SignupRequest, options?: AuthClientRequestOptions): Promise<SignupResponse> {
  return api.post<SignupResponse>('/api/auth/signup', request, {
    skipRefresh: true,
    debugLabel: options?.debugLabel || 'auth:signup',
  });
}

/**
 * Verify email with code.
 */
export async function verifyEmail(request: VerifyEmailRequest, options?: AuthClientRequestOptions): Promise<VerifyEmailResponse> {
  return api.post<VerifyEmailResponse>('/api/auth/verify-email', request, {
    skipRefresh: true,
    debugLabel: options?.debugLabel || 'auth:verify-email',
  });
}

/**
 * Request password reset.
 */
export async function requestPasswordReset(
  request: RequestPasswordResetRequest,
  options?: AuthClientRequestOptions
): Promise<RequestPasswordResetResponse> {
  return api.post<RequestPasswordResetResponse>('/api/auth/request-password-reset', request, {
    skipRefresh: true,
    debugLabel: options?.debugLabel || 'auth:request-password-reset',
  });
}

/**
 * Reset password with code.
 */
export async function resetPassword(
  request: ResetPasswordRequest,
  options?: AuthClientRequestOptions
): Promise<ResetPasswordResponse> {
  return api.post<ResetPasswordResponse>('/api/auth/reset-password', request, {
    skipRefresh: true,
    debugLabel: options?.debugLabel || 'auth:reset-password',
  });
}

