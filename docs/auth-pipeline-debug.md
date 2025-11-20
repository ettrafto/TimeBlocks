# Auth Pipeline Debug Logging

This document tracks the instrumentation added to trace 401s after login.

## Backend Instrumentation

### JwtAuthenticationFilter
- Logs all cookies on each request
- Logs when ACCESS cookie is present/absent
- Logs successful authentication with user details
- Logs JWT validation failures

### LoggingAuthenticationEntryPoint
- Logs cookie presence when 401 occurs
- Logs correlation ID if present

## Frontend Instrumentation

### http.js
- Logs auth state before each request
- Logs request path, method, credentials setting
- Logs response status

### api.js
- Logs auth state before each request
- Logs request/response details

### AuthenticatedShell
- Logs auth state when data loading effects run
- Logs when effects are skipped due to unauthenticated state

### AuthenticatedAppContent
- Logs auth state for loadTypes effect
- Logs auth state for eventsStore.initialize effect
- Logs auth state for loadScheduledEvents effect
- Logs auth state for loadScheduleRange effect

## Testing Instructions

1. Clear browser cookies for localhost
2. Start backend and frontend
3. Open browser devtools (Console + Network)
4. Load app and log in as admin
5. Watch for:
   - Backend logs showing cookie presence/absence
   - Frontend logs showing auth state at time of requests
   - Network tab showing cookie headers in requests

## Expected Timeline

1. POST /api/auth/login → 200 (sets ACCESS+REFRESH cookies)
2. GET /api/auth/me → 200 (validates ACCESS cookie)
3. GET /api/types → 200 (should have ACCESS cookie)
4. GET /api/calendars/cal_main/events → 200 (should have ACCESS cookie)
5. GET /api/schedules → 200 (should have ACCESS cookie)

## Common Issues to Check

- **Cookies not sent**: Check Network tab → Request Headers → Cookie header
- **Auth state not authenticated**: Check console logs for `[AuthShell]` and `[AuthAppContent]` logs
- **JWT validation failure**: Check backend logs for `[JWT][Filter]` warnings
- **Timing issue**: Check if data loads before auth status is "authenticated"

## Fixes Applied

### 1. Cookie SameSite Configuration
- **Issue**: `application-dev.yml` had `cookie-same-site: None` with `cookie-secure: false`
- **Problem**: Browsers reject `SameSite=None` cookies that are not `Secure=true`
- **Fix**: Changed to `cookie-same-site: Lax` which works for localhost with different ports (same-site)

### 2. Backend Logging
- Added detailed cookie logging in `JwtAuthenticationFilter`
- Added cookie presence logging in `LoggingAuthenticationEntryPoint`
- Added cookie setting logging in `AuthController.setAuthCookies()`

### 3. Frontend Logging
- Added request/response logging in `http.js` and `api.js`
- Added auth state logging in `AuthenticatedShell` and `AuthenticatedAppContent`
- Added login flow logging in `auth/store.ts`

### 4. Credentials Configuration
- Verified `credentials: 'include'` is set in both `http.js` and `api.js`
- Both HTTP clients now send cookies with all requests

## Next Steps

1. **Test the login flow** with the new logging:
   - Clear browser cookies
   - Start backend and frontend
   - Log in as admin
   - Watch console and backend logs

2. **Check the logs for**:
   - Are cookies being set? (Look for `[Auth][Cookies]` logs)
   - Are cookies being received? (Look for `[JWT][Filter]` logs showing cookie presence)
   - Is auth status "authenticated" when data loads? (Look for `[AuthShell]` and `[AuthAppContent]` logs)
   - Are requests using the correct HTTP client? (Look for `[HTTP]` vs `[API]` logs)

3. **If 401s persist**, check:
   - Network tab → Request Headers → Is `Cookie: tb_access=...` present?
   - Backend logs → Does `[JWT][Filter]` show "no ACCESS cookie" or "invalid/expired ACCESS token"?
   - Frontend logs → Is auth status "authenticated" when data loading effects run?

