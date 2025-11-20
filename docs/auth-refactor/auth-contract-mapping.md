# Frontend-Backend Auth Contract Mapping

## Overview

This document maps the expected behavior between frontend and backend for each authentication-related endpoint, highlighting mismatches and observed issues.

## Endpoint-by-Endpoint Contract Analysis

### GET `/api/auth/csrf`

**Backend Expectation**:
- Method: `GET`
- Path: `/api/auth/csrf`
- Auth: `permitAll()`
- CSRF: Not required (exempted)
- Request: No body, no cookies required
- Response: `200 OK`, `{ "token": "..." }`
- Cookie Set: `XSRF-TOKEN` (httpOnly=false, sameSite from config, secure from config)

**Frontend Behavior**:
- Method: `GET`
- Path: `/api/auth/csrf`
- Called by: `api.ts` → `ensureCsrf()`
- HTTP Client: `http.js`
- Credentials: `'include'` (sends cookies)
- CSRF Header: Not sent (GET request, not needed)
- State Changes: None (just sets cookie)
- When Called: Before all POST requests in `api.ts`

**Status**: ✅ **ALIGNED** - No issues observed

---

### POST `/api/auth/login`

**Backend Expectation**:
- Method: `POST`
- Path: `/api/auth/login`
- Auth: `permitAll()`
- CSRF: Exempted (but frontend sends it anyway)
- Request: `{ "email": "string", "password": "string" }`
- Cookies: Optional (none required for request)
- Response: `200 OK` with `{ "user": {...} }` OR various error codes (401, 403, 500)
- Cookies Set: `tb_access` (access JWT), `tb_refresh` (refresh JWT)
- Rate Limiting: Yes (by remote IP)

**Frontend Behavior**:
- Method: `POST`
- Path: `/api/auth/login`
- Called by: `store.ts` → `login()` → `api.ts` → `login()`
- HTTP Client: `http.js`
- Credentials: `'include'` (sends cookies)
- CSRF: Fetched via `ensureCsrf()` before call, sent in `X-XSRF-TOKEN` header
- State Changes:
  - On success: Sets `user`, `status='authenticated'`, clears `error`, resets refresh failure flag
  - On failure: Sets `status='unauthenticated'`, sets `error` message
- Navigation: `LoginForm` watches `authStatus` and navigates to `/` on success

**Status**: ✅ **ALIGNED** - Working correctly

**Observed Issues** (previously):
- ✅ Fixed: CSRF token was missing (now fetched before login)
- ✅ Fixed: Cookies not being set (was SameSite=None with Secure=false, now SameSite=Lax)

---

### POST `/api/auth/refresh`

**Backend Expectation**:
- Method: `POST`
- Path: `/api/auth/refresh`
- Auth: `permitAll()` (fixed - was previously requiring auth)
- CSRF: Exempted (but frontend sends it anyway)
- Request: No body
- Cookies: **Required** `tb_refresh` cookie with valid refresh JWT
- Response: `200 OK` with `{ "status": "refreshed" }` OR `400 Bad Request` for invalid token
- Cookies Set: New `tb_access` and `tb_refresh` cookies (token rotation)
- Token Rotation: Yes - old token revoked, new pair issued

**Frontend Behavior**:
- Method: `POST`
- Path: `/api/auth/refresh`
- Called by: 
  - `store.ts` → `hydrate()` (on 401 from `me()`)
  - `tokenBridge.ts` → `triggerRefresh()` (on 401 from `http.js`)
- HTTP Client: `http.js`
- Credentials: `'include'` (sends cookies)
- CSRF: Fetched via `ensureCsrf()` before call, sent in `X-XSRF-TOKEN` header
- State Changes:
  - Via `tokenBridge` handler: Calls `api.me()` after refresh, updates user and status
  - Via `hydrate()`: Retries `api.me()` after refresh
- Infinite Loop Prevention: `tokenBridge` tracks `refreshFailed` flag, only attempts once

**Status**: ✅ **ALIGNED** (after fixes)

**Observed Issues** (previously):
- ✅ Fixed: Backend was requiring auth (now `permitAll()`)
- ✅ Fixed: Infinite refresh loops (now tracked with `refreshFailed` flag)
- ✅ Fixed: CSRF token missing (now fetched before refresh)

---

### GET `/api/auth/me`

**Backend Expectation**:
- Method: `GET`
- Path: `/api/auth/me`
- Auth: `authenticated()` (requires valid `tb_access` cookie)
- CSRF: Not required (GET request)
- Request: No body
- Cookies: **Required** `tb_access` cookie with valid access JWT
- Response: `200 OK` with `{ "user": {...} }` OR `401 Unauthorized` (JSON)

**Frontend Behavior**:
- Method: `GET`
- Path: `/api/auth/me`
- Called by:
  - `store.ts` → `hydrate()` (on app bootstrap)
  - `tokenBridge.ts` → refresh handler (after successful refresh)
- HTTP Client: `http.js`
- Credentials: `'include'` (sends cookies)
- CSRF: Not sent (GET request, not needed)
- State Changes:
  - On success: Sets `user`, `status='authenticated'`
  - On 401: Attempts refresh (in `hydrate()`), then retries `me()`
- When Called:
  - On app mount (via `useHydrateAuth()`)
  - After successful refresh (via `tokenBridge` handler)

**Status**: ✅ **ALIGNED** - Working correctly

**Observed Issues** (previously):
- ✅ Fixed: Infinite loop when `me()` and `refresh()` both returned 401 (now handled with single refresh attempt)

---

### POST `/api/auth/logout`

**Backend Expectation**:
- Method: `POST`
- Path: `/api/auth/logout`
- Auth: `permitAll()` (allows logout without auth)
- CSRF: Exempted (but frontend sends it anyway)
- Request: No body
- Cookies: Optional `tb_refresh` cookie (if present, token is revoked)
- Response: `200 OK` with `{ "status": "logged_out" }`
- Cookies Cleared: `tb_access` and `tb_refresh` (set to empty, maxAge=0)

**Frontend Behavior**:
- Method: `POST`
- Path: `/api/auth/logout`
- Called by: `store.ts` → `logout()`
- HTTP Client: `http.js`
- Credentials: `'include'` (sends cookies)
- CSRF: Fetched via `ensureCsrf()` before call, sent in `X-XSRF-TOKEN` header
- State Changes: Always sets `user=null`, `status='unauthenticated'`, clears `error`
- Navigation: App shell renders `UnauthenticatedShell`, redirects to `/login`

**Status**: ✅ **ALIGNED** - Working correctly

---

### GET `/api/types`

**Backend Expectation**:
- Method: `GET`
- Path: `/api/types`
- Auth: `authenticated()` (requires valid `tb_access` cookie)
- CSRF: Not required (GET request)
- Request: No body
- Cookies: **Required** `tb_access` cookie with valid access JWT
- Response: `200 OK` with array of type objects OR `401 Unauthorized` (JSON)

**Frontend Behavior**:
- Method: `GET`
- Path: `/api/types`
- Called by: `AuthenticatedAppContent` → effect → `eventTypesApi.getAll()`
- HTTP Client: `api.js` → `apiRequest()` → direct `fetch()`
- Credentials: `'include'` (explicitly set in `apiRequest`)
- CSRF: Not sent (GET request, not needed)
- State Changes: Updates `types` state in `AuthenticatedAppContent`
- When Called: On mount when `isAuthenticated === true`, effect depends on `[isAuthenticated, authStatus]`

**Status**: ⚠️ **PARTIAL MISMATCH**

**Issues**:
1. **Different HTTP Client**: Uses `api.js` instead of `http.js`
   - `api.js` doesn't have automatic 401 refresh handling
   - If 401 occurs, `api.js` throws error, doesn't trigger refresh
   - `http.js` would automatically refresh and retry

2. **Timing**: Effect may run before cookies are fully set after login
   - Effect depends on `isAuthenticated`, which is set immediately after login
   - But cookies may not be immediately available in browser
   - Could cause 401 on first data call after login

**Observed Issues**:
- ❌ **401 after login**: Data calls fail with 401 even though login succeeded
  - Root cause: Cookies not being sent (was SameSite=None with Secure=false, now fixed to SameSite=Lax)
  - Secondary issue: `api.js` doesn't retry after refresh

---

### GET `/api/calendars/{id}/events`

**Backend Expectation**:
- Method: `GET`
- Path: `/api/calendars/{id}/events?from={ISO}&to={ISO}`
- Auth: `authenticated()` (requires valid `tb_access` cookie)
- CSRF: Not required (GET request)
- Request: Query params `from` (ISO string), `to` (ISO string)
- Cookies: **Required** `tb_access` cookie with valid access JWT
- Response: `200 OK` with array of event objects OR `401 Unauthorized` (JSON)

**Frontend Behavior**:
- Method: `GET`
- Path: `/api/calendars/cal_main/events?from=...&to=...`
- Called by: 
  - `AuthenticatedAppContent` → effect → `scheduledEventsApi.getForRange()`
  - `eventsStore.initialize()` → `scheduledEventsApi.getForRange()`
- HTTP Client: `api.js` → `apiRequest()` → direct `fetch()`
- Credentials: `'include'` (explicitly set in `apiRequest`)
- CSRF: Not sent (GET request, not needed)
- State Changes: Updates `scheduledItems` state or events store
- When Called: On mount when `isAuthenticated === true` and `activeView === 'calendar'`

**Status**: ⚠️ **PARTIAL MISMATCH**

**Issues**: Same as `/api/types`:
1. Uses `api.js` instead of `http.js` (no automatic refresh)
2. Timing issues with cookie availability

**Observed Issues**:
- ❌ **401 after login**: Same as `/api/types`

---

### GET `/api/schedules`

**Backend Expectation**:
- Method: `GET`
- Path: `/api/schedules?timeMin={ISO}&timeMax={ISO}`
- Auth: `authenticated()` (requires valid `tb_access` cookie)
- CSRF: Not required (GET request)
- Request: Query params `timeMin` (ISO string), `timeMax` (ISO string)
- Cookies: **Required** `tb_access` cookie with valid access JWT
- Response: `200 OK` with array of schedule occurrence objects OR `401 Unauthorized` (JSON)

**Frontend Behavior**:
- Method: `GET`
- Path: `/api/schedules?timeMin=...&timeMax=...`
- Called by: `AuthenticatedAppContent` → effect → `schedStore.loadRange()` → `scheduleClient.list()`
- HTTP Client: `api.js` → `apiRequest()` → direct `fetch()`
- Credentials: `'include'` (explicitly set in `apiRequest`)
- CSRF: Not sent (GET request, not needed)
- State Changes: Updates schedule store
- When Called: On mount when `isAuthenticated === true` and `activeView === 'calendar'`

**Status**: ⚠️ **PARTIAL MISMATCH**

**Issues**: Same as `/api/types` and `/api/calendars/*`:
1. Uses `api.js` instead of `http.js` (no automatic refresh)
2. Timing issues with cookie availability

**Observed Issues**:
- ❌ **401 after login**: Same as other data endpoints

---

## Summary of Mismatches

### Critical Issues

1. **Dual HTTP Client Architecture**:
   - Auth endpoints use `http.js` (has CSRF, refresh handling, retry logic)
   - Data endpoints use `api.js` (direct fetch, no refresh handling, no retry)
   - **Impact**: Data calls that get 401 don't automatically refresh and retry
   - **Fix Needed**: Unify on single HTTP client or add refresh handling to `api.js`

2. **Cookie Timing After Login**:
   - Login sets cookies, but browser may not immediately make them available
   - Data loading effects run immediately after `status='authenticated'`
   - **Impact**: First data calls may fail with 401 even though cookies are set
   - **Fix Needed**: Add small delay or wait for cookie confirmation before data loads

3. **CSRF for Future POST/PUT/DELETE Data Endpoints**:
   - `api.js` doesn't attach CSRF headers
   - Currently not an issue (all data endpoints are GET)
   - **Impact**: If any data endpoints become state-changing, CSRF will be missing
   - **Fix Needed**: Add CSRF handling to `api.js` or use `http.js` for all calls

### Minor Issues

4. **Inconsistent Error Handling**:
   - `http.js` builds structured error objects
   - `api.js` throws generic Error objects
   - **Impact**: Different error shapes make error handling inconsistent
   - **Fix Needed**: Standardize error format

5. **Logging Inconsistency**:
   - `http.js` uses `console.debug` and `log.info`
   - `api.js` uses `TBLog` with grouping
   - **Impact**: Different log formats make debugging harder
   - **Fix Needed**: Standardize logging approach

## Observed Bug Patterns

### Pattern 1: 401 After Login

**Symptoms**:
- Login succeeds (200 OK)
- Cookies are set (`tb_access`, `tb_refresh`)
- Subsequent data calls (`/api/types`, `/api/calendars/*`, `/api/schedules`) return 401
- Backend logs: "Full authentication is required to access this resource"
- Frontend logs: No ACCESS cookie present in request

**Root Causes** (multiple):
1. ✅ **Fixed**: Cookie SameSite=None with Secure=false (browser rejects)
   - Fix: Changed to SameSite=Lax in dev config
2. ⚠️ **Partially Fixed**: Cookies not immediately available after login
   - Mitigation: Small delay or cookie check before data loads
3. ❌ **Not Fixed**: `api.js` doesn't retry after refresh
   - If 401 occurs, `api.js` throws error, doesn't trigger refresh
   - `http.js` would automatically refresh and retry

**Current Status**: Mostly fixed (SameSite issue resolved), but timing and retry issues remain

### Pattern 2: Infinite Refresh Loop

**Symptoms**:
- App loads, `hydrate()` calls `me()`
- `me()` returns 401
- `hydrate()` calls `refresh()`
- `refresh()` also returns 401
- Loop continues indefinitely

**Root Causes**:
1. ✅ **Fixed**: Backend was requiring auth for `/api/auth/refresh`
   - Fix: Changed to `permitAll()` in SecurityConfig
2. ✅ **Fixed**: No guard against repeated refresh attempts
   - Fix: Added `refreshFailed` flag in `tokenBridge.ts`
   - Fix: `hydrate()` only attempts refresh once

**Current Status**: ✅ Fixed

### Pattern 3: React Hooks Order Violation

**Symptoms**:
- App crashes after login with "Rendered more hooks than during the previous render"
- Hooks warning about changing hook order

**Root Causes**:
1. ✅ **Fixed**: Hooks were called conditionally based on auth status
   - Fix: Refactored to `AppRoot`, `UnauthenticatedShell`, `AuthenticatedShell`
   - All hooks are now unconditional in each component

**Current Status**: ✅ Fixed

### Pattern 4: CSRF Token Missing

**Symptoms**:
- Console warning: "missing CSRF token cookie before request"
- POST requests fail with 403 (if CSRF was required)

**Root Causes**:
1. ✅ **Fixed**: CSRF not fetched before POST requests
   - Fix: `ensureCsrf()` called before all POST requests in `api.ts`
2. ✅ **Fixed**: CSRF cookie SameSite=None with Secure=false (browser rejects)
   - Fix: Changed to SameSite=Lax in SecurityConfig

**Current Status**: ✅ Fixed

## Recommendations

### High Priority

1. **Unify HTTP Clients**: 
   - Refactor all API calls to use `http.js` OR
   - Add refresh handling and retry logic to `api.js`
   - Ensures consistent behavior across all endpoints

2. **Add Cookie Availability Check**:
   - Before data loading, verify cookies are present
   - Add small delay or poll for cookie availability after login
   - Prevents 401s due to timing issues

### Medium Priority

3. **Standardize Error Handling**:
   - Use same error format across `http.js` and `api.js`
   - Makes error handling consistent in components

4. **Standardize Logging**:
   - Use same logging approach across both clients
   - Makes debugging easier

### Low Priority

5. **Add CSRF to api.js**:
   - Even though current data endpoints are GET, future POST/PUT/DELETE will need CSRF
   - Proactive fix to prevent future issues

6. **Add Integration Tests**:
   - Test full login → data loading flow
   - Test refresh flow
   - Test error scenarios
   - Prevents regressions

