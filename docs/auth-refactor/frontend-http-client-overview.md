# Frontend HTTP Client Overview

## Current State (Pre-Phase 2.1)

### Multiple HTTP Clients

The frontend currently uses **two different HTTP client implementations**:

1. **`src/lib/api/http.js`** - Used for auth endpoints
2. **`src/services/api.js`** - Used for data endpoints (types, events, schedules)

### Client 1: `src/lib/api/http.js`

**Purpose**: Primary HTTP client for authentication endpoints

**Features**:
- ✅ Automatic CSRF token attachment (for POST/PUT/PATCH/DELETE)
- ✅ Automatic 401 refresh handling (via `tokenBridge.triggerRefresh()`)
- ✅ Retry logic for GET requests
- ✅ Correlation ID generation and attachment
- ✅ Structured error building
- ✅ Timeout handling (12 seconds)
- ✅ Credentials: `'include'` (sends cookies)

**Used By**:
- `src/auth/api.ts` (login, logout, me, refresh, signup, etc.)
- All auth-related API calls

**401 Refresh Flow**:
1. Request receives 401
2. Checks if already retrying (`_retry` flag)
3. Excludes `/api/auth/refresh` and `/api/auth/login` from refresh attempts
4. Calls `triggerRefresh()` from `tokenBridge.ts`
5. Retries original request once after refresh succeeds
6. If refresh fails, throws error

**Known Issues**:
- Refresh logic is tied to `tokenBridge`, which requires a registered handler
- Handler must be registered by auth store initialization
- If handler not registered, refresh fails with "No auth refresh handler registered"

### Client 2: `src/services/api.js`

**Purpose**: Higher-level API client for data endpoints

**Features**:
- ✅ Correlation ID generation and attachment
- ✅ Timeout handling (12 seconds)
- ✅ Credentials: `'include'` (sends cookies)
- ✅ Uses `TBLog` for grouped logging
- ❌ **NO automatic CSRF handling**
- ❌ **NO automatic 401 refresh handling**
- ❌ **NO retry logic**

**Used By**:
- `eventTypesApi.getAll()` → GET `/api/types`
- `scheduledEventsApi.getForRange()` → GET `/api/calendars/{id}/events`
- `scheduleClient.list()` → GET `/api/schedules`
- All data-related API calls

**401 Handling**:
- Simply throws error
- Does NOT trigger refresh
- Does NOT retry request

**Known Issues**:
1. **No Refresh on 401**: If a data endpoint returns 401, the request fails without attempting refresh
2. **No CSRF for Future Mutations**: If any data endpoints become POST/PUT/DELETE, CSRF headers won't be attached
3. **Inconsistent Error Format**: Throws generic `Error` objects instead of structured error format

### Auth API Layer: `src/auth/api.ts`

**Purpose**: Wrapper around `http.js` for auth-specific endpoints

**Features**:
- CSRF token fetching (`ensureCsrf()`) before POST requests
- Type-safe auth API functions
- Calls `http.js` for all requests

**Functions**:
- `login(body)` - POST `/api/auth/login`
- `logout()` - POST `/api/auth/logout`
- `me()` - GET `/api/auth/me`
- `refresh()` - POST `/api/auth/refresh`
- `signup(body)` - POST `/api/auth/signup`
- `verifyEmail(body)` - POST `/api/auth/verify-email`
- `requestPasswordReset(body)` - POST `/api/auth/request-password-reset`
- `resetPassword(body)` - POST `/api/auth/reset-password`

**CSRF Handling**:
- Checks for `XSRF-TOKEN` cookie before POST requests
- If missing, fetches `/api/auth/csrf` (GET)
- Cookie is set automatically by backend
- Promise-based to prevent concurrent CSRF fetches

### Token Refresh Bridge: `src/auth/tokenBridge.ts`

**Purpose**: Centralized token refresh handler to prevent infinite loops

**State**:
- `refreshHandler`: Registered callback (set by auth store)
- `inflight`: Promise for in-progress refresh (prevents concurrent refreshes)
- `refreshFailed`: Boolean flag to prevent infinite retries

**Functions**:
- `registerRefreshHandler(handler)` - Called by auth store
- `triggerRefresh()` - Called by `http.js` on 401
- `resetRefreshFailure()` - Called after successful login

**Handler Implementation** (in `store.ts`):
```typescript
registerRefreshHandler(async () => {
  try {
    await api.refresh()
    const res = await api.me()
    useAuthStore.setState({ user: res.user, status: 'authenticated', error: null })
  } catch (err) {
    useAuthStore.setState({ user: null, status: 'unauthenticated', error: null })
    throw err
  }
})
```

## Current Problems

### Problem 1: Dual HTTP Client Architecture

**Issue**: Auth endpoints use `http.js` (has refresh), data endpoints use `api.js` (no refresh)

**Impact**: 
- Data calls that get 401 don't automatically refresh and retry
- User must manually refresh page or log in again
- Inconsistent behavior across the app

**Example Scenario**:
1. User logs in successfully
2. Access token expires after 15 minutes
3. User tries to load `/api/types`
4. Request gets 401
5. `api.js` throws error, doesn't trigger refresh
6. User sees error, must refresh page or log in again

**Expected Behavior**:
1. User logs in successfully
2. Access token expires after 15 minutes
3. User tries to load `/api/types`
4. Request gets 401
5. HTTP client automatically calls `/api/auth/refresh`
6. Refresh succeeds, new cookies set
7. Original request retried with new token
8. Request succeeds, user sees data

### Problem 2: Refresh Handler Dependency

**Issue**: `http.js` refresh logic depends on `tokenBridge`, which requires a registered handler

**Impact**:
- If handler not registered, refresh fails
- Handler must be registered by auth store initialization
- Creates tight coupling between HTTP client and auth store

**Current Flow**:
1. `http.js` receives 401
2. Calls `triggerRefresh()` from `tokenBridge`
3. `tokenBridge` calls registered handler
4. Handler calls `api.refresh()` and `api.me()`
5. Handler updates auth store state

**Problem**: This creates a circular dependency:
- `http.js` → `tokenBridge` → `store.ts` → `api.ts` → `http.js`

### Problem 3: No Refresh Lock in HTTP Client

**Issue**: Multiple concurrent requests that all get 401 will each trigger a refresh

**Impact**:
- Multiple refresh calls to backend
- Potential race conditions
- Unnecessary load on backend

**Current Behavior**:
- `tokenBridge` has a lock (`inflight` promise)
- But if multiple requests call `triggerRefresh()` simultaneously, they all await the same promise
- However, each request retries independently after refresh

**Better Approach**:
- HTTP client should have its own refresh lock
- All 401 requests should await the same refresh promise
- After refresh, all requests retry once

### Problem 4: Inconsistent Error Handling

**Issue**: `http.js` builds structured errors, `api.js` throws generic errors

**Impact**:
- Different error shapes make error handling inconsistent
- Components must handle multiple error formats

**`http.js` Error Format**:
```typescript
{
  status: number,
  code?: string,
  message: string,
  details?: any,
  cid: string,
  abort?: boolean
}
```

**`api.js` Error Format**:
```typescript
Error {
  message: string,
  // No status, code, details, cid
}
```

## Proposed Solution (Phase 2.1)

### Single Central HTTP Client

Create a unified HTTP client that:
1. Handles all API calls (auth + data)
2. Implements refresh-on-401 logic internally
3. Uses a single in-flight refresh lock
4. Provides consistent error format
5. Handles CSRF automatically
6. Supports correlation IDs

### Unified Auth Client

Create a dedicated auth client module that:
1. Provides type-safe auth functions
2. Integrates with the central HTTP client
3. Handles CSRF token fetching
4. Updates auth store state

### Integration Points

1. **Refactor `src/services/api.js`** to use the new central HTTP client
2. **Refactor `src/auth/api.ts`** to use the new unified auth client
3. **Update `src/lib/api/http.js`** or replace with new client
4. **Simplify `tokenBridge.ts`** or remove if refresh logic moves to HTTP client

## Migration Strategy

1. Create new central HTTP client (`src/lib/api/client.ts`)
2. Create unified auth client (`src/auth/authClient.ts`)
3. Update existing code to use new clients incrementally
4. Keep old clients as fallback during migration
5. Remove old clients once migration complete

## Testing Strategy

1. Unit tests for HTTP client refresh logic
2. Unit tests for auth client functions
3. Integration tests for full auth flow
4. Manual testing via debug harness

