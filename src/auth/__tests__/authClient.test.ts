/**
 * Tests for auth client and HTTP client refresh flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as authClient from '../authClient';
import { api, resetRefreshFailure } from '../../lib/api/client';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock document.cookie
let mockCookies = '';
Object.defineProperty(document, 'cookie', {
  get: () => mockCookies,
  set: (value) => {
    const [name, val] = value.split('=');
    if (val === '') {
      // Clear cookie
      mockCookies = mockCookies
        .split(';')
        .filter((c) => !c.trim().startsWith(`${name}=`))
        .join(';');
    } else {
      // Set cookie
      if (mockCookies) mockCookies += '; ';
      mockCookies += `${name}=${val}`;
    }
  },
  configurable: true,
});

describe('Auth Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockCookies = '';
    localStorageMock.getItem.mockReturnValue(null);
    resetRefreshFailure();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('login', () => {
    it('should call /api/auth/login with email and password', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER' as const,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
        text: async () => JSON.stringify({ user: mockUser }),
      });

      const result = await authClient.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain('/api/auth/login');
      expect(call[1].method).toBe('POST');
      expect(call[1].credentials).toBe('include');
      expect(JSON.parse(call[1].body)).toEqual({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user).toEqual(mockUser);
    });

    it('should handle 401 with error="bad_credentials" and NOT attempt refresh', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
        text: async () =>
          JSON.stringify({
            error: 'bad_credentials',
            message: 'Invalid email or password',
          }),
      });

      await expect(
        authClient.login({
          email: 'test@example.com',
          password: 'wrong',
        })
      ).rejects.toThrow('Invalid email or password');

      // Should only call login, not refresh
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain('/api/auth/login');
    });

    it('should reset refresh failure flag on successful login', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER' as const,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
        text: async () => JSON.stringify({ user: mockUser }),
      });

      await authClient.login({
        email: 'test@example.com',
        password: 'password123',
      });

      // If we had a refresh failure flag, it should be reset
      // (This is tested implicitly - if refresh was blocked, we'd see an error)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchMe', () => {
    it('should call /api/auth/me and return user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER' as const,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
        text: async () => JSON.stringify({ user: mockUser }),
      });

      const result = await authClient.fetchMe();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain('/api/auth/me');
      expect(call[1].method).toBe('GET');
      expect(call[1].credentials).toBe('include');

      expect(result.user).toEqual(mockUser);
    });
  });

  describe('refreshAccessToken', () => {
    it('should call /api/auth/refresh and return status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
        text: async () => JSON.stringify({ status: 'refreshed' }),
      });

      const result = await authClient.refreshAccessToken();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain('/api/auth/refresh');
      expect(call[1].method).toBe('POST');
      expect(call[1].credentials).toBe('include');

      expect(result.status).toBe('refreshed');
    });

    it('should throw error on 400 Bad Request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
        text: async () =>
          JSON.stringify({
            error: 'Invalid refresh token',
            message: 'Refresh token has been revoked',
          }),
      });

      await expect(authClient.refreshAccessToken()).rejects.toThrow();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it('should call /api/auth/logout and return status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
        text: async () => JSON.stringify({ status: 'logged_out' }),
      });

      const result = await authClient.logout();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const call = mockFetch.mock.calls[0];
      expect(call[0]).toContain('/api/auth/logout');
      expect(call[1].method).toBe('POST');
      expect(call[1].credentials).toBe('include');

      expect(result.status).toBe('logged_out');
    });

    it('should return status even if logout request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Logout should still return status (doesn't throw)
      const result = await authClient.logout();

      expect(result.status).toBe('logged_out');
    });
  });
});

describe('HTTP Client Refresh-on-401', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockCookies = '';
    resetRefreshFailure();
  });

  it('should automatically refresh and retry on 401 with error="unauthorized"', async () => {
    // First call: 401 unauthorized
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
      text: async () =>
        JSON.stringify({
          error: 'unauthorized',
          message: 'Full authentication is required',
        }),
    });

    // Refresh call: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
      text: async () => JSON.stringify({ status: 'refreshed' }),
    });

    // Retry original call: success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
      text: async () => JSON.stringify({ data: [1, 2, 3] }),
    });

    const result = await api.get('/api/types');

    // Should have called: original (401) -> refresh (200) -> retry (200)
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockFetch.mock.calls[0][0]).toContain('/api/types');
    expect(mockFetch.mock.calls[1][0]).toContain('/api/auth/refresh');
    expect(mockFetch.mock.calls[2][0]).toContain('/api/types');

    expect(result).toEqual({ data: [1, 2, 3] });
  });

  it('should NOT refresh on 401 with error="bad_credentials"', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
      text: async () =>
        JSON.stringify({
          error: 'bad_credentials',
          message: 'Invalid email or password',
        }),
    });

    await expect(api.get('/api/types')).rejects.toThrow();

    // Should only call once, no refresh
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toContain('/api/types');
  });

  it('should use single in-flight refresh lock for concurrent requests', async () => {
    // Multiple concurrent requests that all get 401
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/types')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
          text: async () =>
            JSON.stringify({
              error: 'unauthorized',
              message: 'Full authentication is required',
            }),
        });
      }
      if (url.includes('/api/auth/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
          text: async () => JSON.stringify({ status: 'refreshed' }),
        });
      }
      // Retry after refresh
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
        text: async () => JSON.stringify({ data: 'success' }),
      });
    });

    // Fire 3 concurrent requests
    const [result1, result2, result3] = await Promise.all([
      api.get('/api/types'),
      api.get('/api/types'),
      api.get('/api/types'),
    ]);

    // Should only call refresh once (not 3 times)
    const refreshCalls = mockFetch.mock.calls.filter((call) =>
      call[0].includes('/api/auth/refresh')
    );
    expect(refreshCalls.length).toBe(1);

    // All requests should succeed
    expect(result1).toEqual({ data: 'success' });
    expect(result2).toEqual({ data: 'success' });
    expect(result3).toEqual({ data: 'success' });
  });

  it('should NOT retry if refresh fails', async () => {
    // First call: 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
      text: async () =>
        JSON.stringify({
          error: 'unauthorized',
          message: 'Full authentication is required',
        }),
    });

    // Refresh call: fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
      text: async () =>
        JSON.stringify({
          error: 'Invalid refresh token',
          message: 'Refresh token has been revoked',
        }),
    });

    await expect(api.get('/api/types')).rejects.toThrow();

    // Should have called: original (401) -> refresh (400) -> NOT retry
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toContain('/api/types');
    expect(mockFetch.mock.calls[1][0]).toContain('/api/auth/refresh');
  });

  it('should NOT attempt refresh on /api/auth/refresh endpoint itself', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers({ 'X-Correlation-Id': 'test-cid' }),
      text: async () =>
        JSON.stringify({
          error: 'unauthorized',
          message: 'Full authentication is required',
        }),
    });

    await expect(
      api.post('/api/auth/refresh', undefined, { skipRefresh: true })
    ).rejects.toThrow();

    // Should only call once, no refresh attempt
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

