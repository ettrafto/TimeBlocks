# Auth System Refactor Plan

## Overview

This document outlines a test-first, multi-phase plan to stabilize and align the TimeBlocks authentication system between frontend and backend. Each phase includes preconditions, tests to pass, and scope of changes.

## Phase 0 – Test Harness (No Refactors Yet)

**Goal**: Establish baseline tests to prevent regressions and verify fixes

### Backend Integration Tests

**Framework**: Spring Boot Test with MockMvc

**Test Suite**: `AuthControllerIntegrationTest` (or similar)

**Tests to Implement**:

1. **POST `/api/auth/login` - Success**
   - Request: Valid email/password
   - Assert: 200 OK, user object in response, `tb_access` and `tb_refresh` cookies set
   - Assert: Cookies have correct attributes (httpOnly, sameSite, secure, path, maxAge)

2. **POST `/api/auth/login` - Bad Credentials**
   - Request: Invalid email/password
   - Assert: 401 Unauthorized, error message in response, no cookies set

3. **GET `/api/auth/me` - Unauthenticated**
   - Request: No cookies
   - Assert: 401 Unauthorized, JSON error response

4. **GET `/api/auth/me` - Authenticated**
   - Request: Valid `tb_access` cookie
   - Assert: 200 OK, user object in response

5. **POST `/api/auth/refresh` - Valid Refresh Token**
   - Request: Valid `tb_refresh` cookie
   - Assert: 200 OK, new `tb_access` and `tb_refresh` cookies set
   - Assert: Old refresh token is revoked in database

6. **POST `/api/auth/refresh` - Invalid Refresh Token**
   - Request: Invalid/expired `tb_refresh` cookie
   - Assert: 400 Bad Request, error message

7. **POST `/api/auth/logout` - With Refresh Token**
   - Request: Valid `tb_refresh` cookie
   - Assert: 200 OK, cookies cleared (maxAge=0), token revoked in database

8. **GET `/api/types` - Protected Endpoint Smoke Test**
   - Request: Valid `tb_access` cookie
   - Assert: 200 OK, array of types
   - Request: No cookies
   - Assert: 401 Unauthorized

**Preconditions**: 
- Backend test database seeded with test user
- Test user credentials known

**Deliverable**: All tests passing, test suite runs in CI

### Frontend Manual/Integration Tests

**Framework**: Manual testing checklist + optional Jest/RTL tests

**Manual Test Checklist**:

1. **Login Flow**
   - [ ] Open app in clean browser (no cookies)
   - [ ] See login page (not infinite loading)
   - [ ] Enter valid credentials, submit
   - [ ] See main app (not login page)
   - [ ] Check Network tab: `/api/auth/login` returns 200, cookies set
   - [ ] Check Network tab: `/api/auth/me` returns 200
   - [ ] Check Network tab: `/api/types` returns 200 (not 401)
   - [ ] Check Console: No errors, no infinite refresh attempts

2. **Page Reload**
   - [ ] While logged in, reload page
   - [ ] See main app (not login page)
   - [ ] Check Network tab: `/api/auth/me` returns 200
   - [ ] Check Network tab: Data endpoints return 200

3. **Access to `/api-testing`**
   - [ ] While logged in, navigate to `/api-testing`
   - [ ] Page renders without errors
   - [ ] No React Hooks warnings
   - [ ] No infinite loops

4. **Logout Flow**
   - [ ] Click logout (or call logout function)
   - [ ] See login page
   - [ ] Check Network tab: `/api/auth/logout` returns 200, cookies cleared
   - [ ] Check Network tab: Attempting `/api/types` returns 401

5. **Cookie Verification**
   - [ ] After login, check Application tab: `tb_access` and `tb_refresh` cookies present
   - [ ] Check cookie attributes: httpOnly=true, sameSite=Lax, secure=false (dev)
   - [ ] Check cookie expiration: access ~15min, refresh ~30days

**Optional Automated Tests** (Jest + React Testing Library):

1. **Auth Store Transitions**
   - Test: `hydrate()` transitions from `idle` → `loading` → `authenticated` on success
   - Test: `hydrate()` transitions to `unauthenticated` on 401
   - Test: `login()` sets user and status on success
   - Test: `logout()` clears user and sets status to `unauthenticated`

2. **Route Gating**
   - Test: `AppRoot` renders `UnauthenticatedShell` when `status='unauthenticated'`
   - Test: `AppRoot` renders `AuthenticatedShell` when `status='authenticated'`
   - Test: `UnauthenticatedShell` redirects to `/login` when not on auth route

**Preconditions**: 
- Frontend dev server running
- Backend dev server running
- Test user credentials available

**Deliverable**: Manual test checklist completed, all items passing

---

## Phase 1 – Backend Correctness & Observability

**Goal**: Ensure backend security config, token logic, and logging are correct and debuggable

### Changes

1. **Security Config Review**
   - Verify all `/api/auth/**` endpoints have correct access rules
   - Verify CSRF exemptions are correct
   - Verify CORS config allows frontend origin
   - Verify `allowCredentials(true)` is set

2. **Cookie Configuration**
   - Verify `SameSite` attribute matches environment (Lax for dev, None for prod with Secure)
   - Verify `Secure` attribute matches environment (false for http://localhost, true for https)
   - Verify cookie paths are `/` (accessible across all routes)
   - Verify cookie domains are correct (empty for localhost, set for production)

3. **JWT Service**
   - Verify key generation handles all secret formats (Base64, plain text)
   - Verify token expiration times match config
   - Verify token claims include all required fields

4. **Logging Strategy**
   - Keep INFO level for: Login attempts, refresh attempts, logout events, 401/403 events
   - Keep DEBUG level for: JWT validation details, cookie presence checks, CSRF token operations
   - Add correlation ID to all auth-related logs
   - Ensure logs include: path, method, user ID (if available), correlation ID, cookie presence

5. **Error Responses**
   - Verify all 401 responses return JSON (not HTML redirect)
   - Verify error messages are consistent
   - Verify error codes match frontend expectations

### Tests to Pass

- All Phase 0 backend tests still pass
- Backend logs show clear auth flow for each request
- Cookie attributes are correct in test responses
- Error responses are JSON format

### Scope

- Files: `SecurityConfig.java`, `AuthController.java`, `JwtService.java`, `LoggingAuthenticationEntryPoint.java`, `application-dev.yml`
- Estimated changes: Minor config adjustments, logging additions
- Risk: Low (mostly configuration, no logic changes)

---

## Phase 2 – Frontend Correctness & Observability

**Goal**: Normalize HTTP clients, clarify auth bootstrap, add targeted logging

### Changes

1. **Unify HTTP Clients**
   - **Option A (Recommended)**: Refactor all API calls to use `http.js`
     - Update `api.js` to use `http()` helper instead of direct `fetch()`
     - Update `scheduleClient.ts` to use `http()` helper
     - Ensures consistent CSRF, refresh handling, retry logic
   - **Option B**: Add refresh handling to `api.js`
     - Add 401 detection and `triggerRefresh()` call
     - Add retry logic after refresh
     - Keep dual client architecture

2. **Auth Bootstrap Timing**
   - Add cookie availability check before data loading
   - Options:
     - Add small delay (100-200ms) after login before triggering data loads
     - Poll for cookie presence before data loads
     - Wait for `api.me()` success before allowing data loads
   - Ensure data loading effects only run when cookies are confirmed available

3. **CSRF Handling**
   - Ensure `api.js` (if kept) also handles CSRF for future POST/PUT/DELETE
   - Verify CSRF is fetched before all state-changing requests
   - Add logging for CSRF token attachment

4. **Logging**
   - Add consistent logging across `http.js` and `api.js`
   - Log auth status before data calls
   - Log cookie presence checks
   - Log refresh attempts and outcomes

5. **Error Handling**
   - Standardize error format between `http.js` and `api.js`
   - Ensure errors include correlation IDs
   - Ensure errors are structured consistently

### Tests to Pass

- All Phase 0 frontend manual tests still pass
- Data calls automatically retry after refresh (if using `http.js`)
- No 401s on data calls after successful login
- Console logs show clear auth flow

### Scope

- Files: `src/lib/api/http.js`, `src/services/api.js`, `src/lib/api/scheduleClient.ts`, `src/App.jsx` (data loading effects)
- Estimated changes: Moderate (refactoring API calls, adding timing checks)
- Risk: Medium (touching data loading logic, could break existing flows)

---

## Phase 3 – Contract Alignment

**Goal**: Fix all mismatches identified in `auth-contract-mapping.md`

### Changes (Ordered by Priority)

1. **Fix Dual HTTP Client Issue** (from Phase 2)
   - Complete Option A or B from Phase 2
   - Ensures all endpoints have consistent behavior

2. **Fix Cookie Timing After Login**
   - Implement cookie availability check (from Phase 2)
   - Prevents 401s due to timing

3. **Add CSRF to Data Endpoints** (if needed)
   - If any data endpoints become POST/PUT/DELETE, ensure CSRF is attached
   - Proactive fix for future changes

4. **Standardize Error Handling**
   - Ensure `api.js` (if kept) uses same error format as `http.js`
   - Makes error handling consistent

5. **Standardize Logging**
   - Use same logging approach across both clients
   - Makes debugging easier

### Tests to Pass

- All Phase 0 tests still pass
- No 401s on data calls after login
- All endpoints use consistent HTTP client behavior
- Error handling is consistent across all endpoints

### Scope

- Files: Same as Phase 2, plus any new data endpoints
- Estimated changes: Completion of Phase 2 work
- Risk: Low (completing Phase 2 work)

---

## Phase 4 – Cleanup & Hardening

**Goal**: Reduce log noise, add error boundaries, update documentation

### Changes

1. **Reduce Log Noise**
   - Review all DEBUG logs, keep only essential ones
   - Reduce INFO log verbosity where appropriate
   - Keep correlation IDs for tracing

2. **Error Boundaries**
   - Add React error boundary around `AuthenticatedShell`
   - Add React error boundary around `UnauthenticatedShell`
   - Show user-friendly error messages

3. **UI Error Messages**
   - Show clear error messages for auth failures
   - Show clear error messages for network failures
   - Provide retry options where appropriate

4. **Documentation Updates**
   - Update `docs/auth-overview.md` with final architecture
   - Update `README.md` with auth setup instructions
   - Add troubleshooting guide for common auth issues

5. **Code Cleanup**
   - Remove unused code
   - Remove excessive console.logs (keep essential ones)
   - Add JSDoc comments to auth functions

### Tests to Pass

- All Phase 0 tests still pass
- Error boundaries catch and display errors gracefully
- Documentation is accurate and helpful

### Scope

- Files: `src/App.jsx`, `src/auth/**`, `docs/**`
- Estimated changes: Minor (cleanup, documentation)
- Risk: Low (mostly non-functional changes)

---

## Implementation Order

### Recommended Sequence

1. **Phase 0** → Establish test baseline
2. **Phase 1** → Fix backend config and logging (low risk)
3. **Phase 2** → Fix frontend HTTP clients and timing (medium risk)
4. **Phase 3** → Complete contract alignment (low risk, completing Phase 2)
5. **Phase 4** → Polish and cleanup (low risk)

### Alternative Sequence (If Time-Constrained)

1. **Phase 0** → Establish test baseline
2. **Phase 2** → Fix frontend HTTP clients (addresses most user-visible issues)
3. **Phase 1** → Fix backend config (can be done in parallel)
4. **Phase 3** → Complete alignment
5. **Phase 4** → Cleanup

---

## Success Criteria

### Must Have

- ✅ All Phase 0 tests passing
- ✅ Login flow works end-to-end
- ✅ Data calls succeed after login (no 401s)
- ✅ Page reload maintains authentication
- ✅ Logout clears authentication
- ✅ No infinite refresh loops
- ✅ No React Hooks warnings

### Nice to Have

- ✅ Consistent error handling across all endpoints
- ✅ Consistent logging across all endpoints
- ✅ Error boundaries catch and display errors
- ✅ Documentation is complete and accurate

---

## Risk Assessment

### High Risk Areas

1. **Phase 2 - Unifying HTTP Clients**
   - Risk: Breaking existing data loading flows
   - Mitigation: Thorough testing, incremental changes, feature flags if needed

2. **Phase 2 - Cookie Timing**
   - Risk: Adding delays could slow down app
   - Mitigation: Use efficient cookie checks, minimize delays

### Low Risk Areas

1. **Phase 1 - Backend Config**
   - Risk: Low (mostly configuration)
   - Mitigation: Tests verify behavior

2. **Phase 3 - Contract Alignment**
   - Risk: Low (completing Phase 2 work)
   - Mitigation: Tests verify behavior

3. **Phase 4 - Cleanup**
   - Risk: Low (non-functional changes)
   - Mitigation: Tests verify behavior

---

## Timeline Estimate

- **Phase 0**: 2-4 hours (writing tests)
- **Phase 1**: 2-3 hours (config and logging)
- **Phase 2**: 4-6 hours (HTTP client refactor, timing fixes)
- **Phase 3**: 1-2 hours (completing Phase 2)
- **Phase 4**: 2-3 hours (cleanup and docs)

**Total**: 11-18 hours

---

## Next Steps

1. Review this plan and approve approach
2. Start with Phase 0 (test harness)
3. Proceed through phases sequentially
4. Update this document with actual changes made
5. Mark phases as complete when tests pass

---

## Notes

- All phases are test-driven: tests must pass before moving to next phase
- Each phase builds on the previous one
- Changes are incremental to minimize risk
- Documentation is updated throughout to reflect current state

