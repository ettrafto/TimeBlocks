# How to Test Phase 2.1: Frontend HTTP Client + Refresh Flow

## Overview

Phase 2.1 implements a unified HTTP client with automatic refresh-on-401 logic and a centralized auth client. This document describes how to test both automated tests and manual testing via the UI.

## Prerequisites

1. **Backend running**: Start the backend with Gradle:
   ```powershell
   cd backend
   .\gradlew.bat bootRun --args='--spring.profiles.active=dev'
   ```

2. **Frontend dependencies**: Ensure all dependencies are installed:
   ```powershell
   npm install
   ```

3. **Test framework**: The project uses Vitest. If not already installed, add it:
   ```powershell
   npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
   ```

## Automated Tests

### Running Tests

From the project root:

```powershell
# Run all tests
npm test

# Run only auth client tests
npm test -- authClient

# Run in watch mode
npm test -- --watch
```

**Note**: If `npm test` is not configured, you can run Vitest directly:
```powershell
npx vitest
npx vitest -- authClient
```

### Test Cases

The test suite (`src/auth/__tests__/authClient.test.ts`) covers:

#### 1. Login Tests
- ✅ **Login success**: Calls `/api/auth/login` with email/password, returns user object
- ✅ **Bad credentials**: Handles 401 with `error="bad_credentials"`, does NOT attempt refresh
- ✅ **Refresh failure reset**: Resets refresh failure flag on successful login

#### 2. FetchMe Tests
- ✅ **Success**: Calls `/api/auth/me`, returns user object

#### 3. Refresh Tests
- ✅ **Success**: Calls `/api/auth/refresh`, returns status object
- ✅ **Failure**: Handles 400 Bad Request (invalid/revoked token)

#### 4. Logout Tests
- ✅ **Success**: Calls `/api/auth/logout`, returns status object
- ✅ **Failure handling**: Returns status even if request fails

#### 5. Refresh-on-401 Tests
- ✅ **Automatic refresh**: On 401 with `error="unauthorized"`, automatically calls refresh and retries
- ✅ **No refresh on bad_credentials**: Does NOT refresh on 401 with `error="bad_credentials"`
- ✅ **Refresh lock**: Multiple concurrent 401s share a single refresh call
- ✅ **No retry on refresh failure**: If refresh fails, does NOT retry original request
- ✅ **Skip refresh on refresh endpoint**: Does NOT attempt refresh on `/api/auth/refresh` itself

### Expected Test Output

All tests should pass. Example output:
```
✓ Auth Client > login > should call /api/auth/login with email and password
✓ Auth Client > login > should handle 401 with error="bad_credentials" and NOT attempt refresh
✓ Auth Client > login > should reset refresh failure flag on successful login
✓ Auth Client > fetchMe > should call /api/auth/me and return user
✓ Auth Client > refreshAccessToken > should call /api/auth/refresh and return status
✓ Auth Client > refreshAccessToken > should throw error on 400 Bad Request
✓ Auth Client > logout > should call /api/auth/logout and return status
✓ Auth Client > logout > should return status even if logout request fails
✓ HTTP Client Refresh-on-401 > should automatically refresh and retry on 401 with error="unauthorized"
✓ HTTP Client Refresh-on-401 > should NOT refresh on 401 with error="bad_credentials"
✓ HTTP Client Refresh-on-401 > should use single in-flight refresh lock for concurrent requests
✓ HTTP Client Refresh-on-401 > should NOT retry if refresh fails
✓ HTTP Client Refresh-on-401 > should NOT attempt refresh on /api/auth/refresh endpoint itself

Test Files  1 passed (1)
     Tests  13 passed (13)
```

## Manual Testing via UI

### Start Frontend

```powershell
npm run dev
```

The frontend should start at `http://localhost:5173` (or the port shown in terminal).

### Access Debug Page

Navigate to:
```
http://localhost:5173/auth-debug?debug-auth
```

**Note**: The page only renders when `?debug-auth` is in the URL.

### Test Sequence

#### 1. Login Test

1. Click **"Login (Admin Seeder)"** button
2. **Verify**:
   - User info shows as authenticated
   - `document.cookie` shows `tb_access` and `tb_refresh` cookies
   - Cookie state panel shows both cookies present with length > 0
   - Logging panel shows "Login SUCCESS"
   - Checklist item "Login succeeds, cookies set" can be checked

**Expected**: Login succeeds, cookies are set, user object is displayed.

#### 2. Fetch Me Test

1. Click **"Call /me"** button
2. **Verify**:
   - User object returns correctly (matches login email/role)
   - No refresh occurs (check logs - should not see refresh calls)
   - Live `/api/auth/me` response panel shows success

**Expected**: `/me` returns user object without triggering refresh.

#### 3. Refresh Test

1. Click **"Refresh Token"** button
2. **Verify**:
   - Refresh succeeds
   - New cookies are set (check cookie state panel)
   - Logging panel shows "Refresh SUCCESS"
   - Checklist item "Refresh rotates tokens successfully" can be checked

**Expected**: Refresh succeeds, new cookies are set.

#### 4. Expired Token Test (Simulated)

To test automatic refresh-on-401, you can:

**Option A: Use Browser DevTools**
1. Open DevTools → Application → Cookies
2. Delete the `tb_access` cookie (or modify it to be invalid)
3. Click a button that calls a data endpoint (e.g., navigate to a page that loads `/api/types`)
4. **Verify**:
   - HTTP client automatically calls `/api/auth/refresh` once
   - Original request is retried once
   - Request succeeds (200 OK) when refresh is valid
   - Logging panel shows refresh and retry logs

**Option B: Use Debug Harness Mocking**
1. Temporarily modify `src/lib/api/client.ts` to force 401 on a test endpoint
2. Call that endpoint
3. Verify automatic refresh and retry

**Expected**: HTTP client automatically refreshes and retries, request succeeds.

#### 5. Refresh Failure Test

To test refresh failure handling:

**Option A: Revoke Refresh Token**
1. Login successfully
2. In backend, manually revoke the refresh token (or wait for it to expire)
3. Call a protected endpoint (e.g., `/api/types`)
4. **Verify**:
   - Refresh runs once
   - Request is NOT endlessly retried
   - App ends up in logged-out or "please log in again" state
   - Logging panel shows refresh failure

**Option B: Use Debug Harness**
1. Temporarily modify `src/auth-debug/debugAuthHarness.js` to mock refresh failure
2. Call a protected endpoint
3. Verify no infinite loops

**Expected**: Refresh fails once, request fails, no infinite loops.

#### 6. Logout Test

1. Click **"Logout"** button
2. **Verify**:
   - Cookies are cleared (cookie state panel shows both cookies absent)
   - `isAuthenticated` becomes false (auth state panel shows `status: 'unauthenticated'`)
   - Additional calls to `/api/auth/me` return 401 and do NOT trigger refresh
   - Checklist item "Logout clears cookies and state" can be checked

**Expected**: Logout clears cookies and state, subsequent `/me` calls fail without refresh.

#### 7. Full Auth Cycle Test

1. Click **"Test Full Cycle"** button
2. **Verify**:
   - All steps execute in sequence: login → me → refresh → me → logout
   - Each step succeeds
   - Logging panel shows all steps
   - Checklist items can be checked

**Expected**: Full cycle completes successfully.

### Manual Checklist

The debug page includes an interactive checklist that persists in `localStorage`. Check off items as you test them:

- [ ] Login succeeds, cookies set
- [ ] `/me` returns user when authenticated
- [ ] Refresh rotates tokens successfully
- [ ] Logout clears cookies and state
- [ ] Expired token triggers automatic refresh
- [ ] Refresh failure does not loop infinitely

## Troubleshooting

### Tests Fail

1. **Check backend is running**: Tests mock fetch, but if you're running integration tests, backend must be up
2. **Check test framework**: Ensure Vitest is installed and configured
3. **Check mocks**: Verify mocks are set up correctly in test files

### Debug Page Not Rendering

1. **Check URL**: Ensure `?debug-auth` is in the URL
2. **Check console**: Look for errors in browser console
3. **Check route**: Verify route is registered in `App.jsx`

### Refresh Not Working

1. **Check cookies**: Verify `tb_refresh` cookie is present
2. **Check backend logs**: Look for refresh endpoint calls
3. **Check console**: Look for refresh-related errors
4. **Check correlation ID**: Verify `X-Correlation-Id` header is being sent

### Infinite Refresh Loops

1. **Check refresh lock**: Verify only one refresh call is made
2. **Check refresh failure flag**: Verify flag is set after refresh failure
3. **Check backend**: Verify backend is not returning 401 on refresh endpoint

## Verification Checklist

After completing all tests:

- [ ] All automated tests pass
- [ ] Login works and sets cookies
- [ ] `/me` returns user when authenticated
- [ ] Refresh rotates tokens
- [ ] Logout clears cookies and state
- [ ] Automatic refresh-on-401 works
- [ ] Refresh lock prevents multiple concurrent refreshes
- [ ] Refresh failure does not cause infinite loops
- [ ] Debug page shows all information correctly
- [ ] Checklist items can be checked off

## Next Steps

Once Phase 2.1 is verified complete:

1. Mark `2.1` as `[x]` in `docs/auth-refactor/progress.md`
2. Update `_Last updated:` line in progress.md
3. Proceed to Phase 2.2: Auth bootstrap timing + logging

