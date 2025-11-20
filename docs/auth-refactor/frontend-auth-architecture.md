# Frontend Authentication Architecture

## Overview

The TimeBlocks frontend uses React with Zustand for state management. Authentication is handled through a centralized auth store that manages user state, login/logout flows, and token refresh. The app uses a shell-based architecture with separate components for authenticated and unauthenticated states.

## Auth State Machine

### Auth Store (`src/auth/store.ts`)

**State Shape**:
```typescript
{
  user: AuthUser | null,
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated',
  error: string | null,
  pendingEmail: string | null,
  hydrate: (force?: boolean) => Promise<void>,
  login: (email: string, password: string) => Promise<void>,
  logout: () => Promise<void>,
  signup: (email: string, password: string, name?: string | null) => Promise<void>,
  verifyEmail: (email: string, code: string) => Promise<void>,
  requestPasswordReset: (email: string) => Promise<void>,
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>,
  clearError: () => void
}
```

**AuthUser Type**:
```typescript
{
  id: string,      // UUID
  email: string,
  name: string,
  role: 'USER' | 'ADMIN'
}
```

**Status Transitions**:

1. **Initial State**: `'idle'`
   - On app mount, `useHydrateAuth()` is called
   - Transitions to `'loading'` when `hydrate()` starts

2. **Loading State**: `'loading'`
   - Set when `hydrate()` or `login()` starts
   - Indicates an auth operation is in progress

3. **Authenticated State**: `'authenticated'`
   - Set when:
     - `hydrate()` succeeds (via `api.me()`)
     - `login()` succeeds
     - `tokenBridge` refresh handler succeeds
   - User object is populated
   - App renders `AuthenticatedShell`

4. **Unauthenticated State**: `'unauthenticated'`
   - Set when:
     - `hydrate()` fails (no valid tokens)
     - `login()` fails
     - `logout()` completes
     - Refresh fails
   - User is `null`
   - App renders `UnauthenticatedShell`

5. **Error State**: 
   - Not a separate status, but `error` field is set
   - Status remains `'unauthenticated'` or `'loading'` depending on context

### Hydrate Flow (`hydrate()`)

**Purpose**: Bootstrap authentication on app load

**Flow**:
1. Check if already loading or authenticated (unless `force=true`)
2. Set status to `'loading'`
3. Call `api.me()` (GET `/api/auth/me`)
4. **If 200**: Set user and status to `'authenticated'`
5. **If 401**:
   - Attempt single refresh via `api.refresh()`
   - If refresh succeeds: Call `api.me()` again
   - If refresh fails: Set status to `'unauthenticated'`
6. **Other errors**: Set status to `'unauthenticated'`

**Guards**:
- Won't run if already `'loading'` or `'authenticated'` (unless `force=true`)
- Only attempts refresh once per hydrate call
- Prevents infinite loops

### Login Flow (`login()`)

**Purpose**: Authenticate user with email/password

**Flow**:
1. Set status to `'loading'`, clear error
2. Call `api.login({ email, password })` (POST `/api/auth/login`)
3. **If 200**: 
   - Reset refresh failure flag (via `resetRefreshFailure()`)
   - Set user from response, status to `'authenticated'`
   - Log cookie presence (for debugging)
4. **If error**: Set status to `'unauthenticated'`, set error message, throw error

**Navigation**: Handled by `LoginForm` component via `useEffect` watching `authStatus === 'authenticated'`

### Logout Flow (`logout()`)

**Purpose**: Clear authentication and revoke tokens

**Flow**:
1. Call `api.logout()` (POST `/api/auth/logout`)
2. Always set user to `null`, status to `'unauthenticated'`, clear error
3. Navigation handled by app shell (renders `UnauthenticatedShell`)

### Signup/Verification/Password Reset Flows

- **Signup**: Sets `pendingEmail`, status to `'unauthenticated'`
- **Verify Email**: Clears `pendingEmail` if matches
- **Password Reset**: No state changes (just API calls)

## HTTP Client Layer

### Primary HTTP Client (`src/lib/api/http.js`)

**Function**: `http(path, opts)`

**Base URL**: From `VITE_API_BASE` env var or `http://localhost:8080`

**Default Options**:
- `method`: `'GET'`
- `headers`: `{ 'Content-Type': 'application/json' }`
- `credentials`: `'include'` (always sends cookies)
- `timeout`: `12000ms` (12 seconds)

**CSRF Handling**:
- For POST/PUT/PATCH/DELETE: Reads `XSRF-TOKEN` cookie
- Attaches `X-XSRF-TOKEN` header if cookie present
- Warns if missing (except for `/api/auth/**` endpoints which are exempt)

**Correlation IDs**:
- Generates: `fe-{random}-{timestamp}`
- Sends in `X-Correlation-Id` header
- Included in error objects

**401 Handling**:
- If 401 on non-auth endpoints: Attempts token refresh via `triggerRefresh()`
- Retries original request once after refresh
- Prevents infinite loops by checking `_retry` flag and excluding `/api/auth/refresh` and `/api/auth/login`

**Retry Logic**:
- GET requests: One automatic retry on failure (new AbortController)
- Other methods: No automatic retry

**Error Building**:
- Extracts `status`, `code`, `message`, `details` from response JSON
- Normalizes to: `{ status, code, message, details, cid, abort? }`

**Logging**:
- Debug logs: Request path, method, credentials, correlation ID
- Info logs: Response status, timing
- Warn logs: Missing CSRF, retry attempts, refresh failures

### API Service Layer (`src/services/api.js`)

**Function**: `apiRequest(path, opts)`

**Purpose**: Higher-level API client for data endpoints (types, events, schedules)

**Base URL**: From `VITE_API_BASE` env var or `http://localhost:8080`

**Default Options**:
- `method`: `'GET'`
- `headers`: `{ 'Content-Type': 'application/json', 'X-Correlation-Id': cid }`
- `credentials`: `'include'` (ensures cookies are sent)
- `timeout`: `12000ms` (via `withTimeout` wrapper)

**Key Difference from `http.js`**:
- Uses direct `fetch()` instead of `http()` helper
- Does NOT automatically handle CSRF (relies on backend exemption or manual header)
- Does NOT automatically handle 401 refresh (no integration with `tokenBridge`)

**Logging**: Uses `TBLog` for grouped logging with correlation IDs

**APIs Exposed**:
- `eventTypesApi.getAll()`: GET `/api/types`
- `scheduledEventsApi.getForRange(from, to, calendarId)`: GET `/api/calendars/{id}/events?from=...&to=...`
- `scheduleClient.list({ timeMin, timeMax })`: GET `/api/schedules?timeMin=...&timeMax=...`

## CSRF Handling

### CSRF Token Fetching (`src/auth/api.ts`)

**Function**: `ensureCsrf()`

**Flow**:
1. Checks for `XSRF-TOKEN` cookie in `document.cookie`
2. If present: Returns immediately
3. If missing: 
   - Creates promise to fetch `/api/auth/csrf` (GET)
   - Cookie is set by backend automatically
   - Waits for promise to resolve
   - Clears promise reference

**Usage**: Called before all POST requests in `api.ts`:
- `signup()`
- `login()`
- `logout()`
- `refresh()`
- `verifyEmail()`
- `requestPasswordReset()`
- `resetPassword()`

**Note**: GET requests (`me()`) do not call `ensureCsrf()` (not needed)

### CSRF Header Attachment

**Location**: `src/lib/api/http.js`

**Logic**:
- For POST/PUT/PATCH/DELETE: Reads `XSRF-TOKEN` cookie
- If present: Attaches `X-XSRF-TOKEN` header
- If missing: Warns (except for `/api/auth/**` which are exempt)

## Token Refresh Bridge (`src/auth/tokenBridge.ts`)

**Purpose**: Centralized token refresh handler to prevent infinite loops

**State**:
- `refreshHandler`: Registered callback (set by auth store)
- `inflight`: Promise for in-progress refresh (prevents concurrent refreshes)
- `refreshFailed`: Boolean flag to prevent infinite retries

**Functions**:

1. **`registerRefreshHandler(handler)`**:
   - Called by auth store on initialization
   - Sets the handler that will be called on refresh

2. **`triggerRefresh()`**:
   - If refresh already failed: Throws error (prevents infinite loops)
   - If refresh in progress: Returns existing promise
   - Otherwise: Calls handler, tracks success/failure
   - On success: Resets `refreshFailed` flag
   - On failure: Sets `refreshFailed` flag

3. **`resetRefreshFailure()`**:
   - Called after successful login
   - Resets `refreshFailed` flag to allow future refreshes

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

## App Bootstrap Flow

### App Root (`AppRoot` in `src/App.jsx`)

**Component**: Top-level component that handles auth bootstrap

**Hooks** (unconditional, always called in same order):
1. `useHydrateAuth()` - Triggers auth hydration
2. `useAuthStore((state) => state.status)` - Reads auth status

**Logic**:
1. Derives flags: `isLoading`, `isAuthenticated`, `isUnauthenticated`
2. Conditional rendering (NO hooks below this):
   - If `isLoading`: Render "Loading TimeBlocks…" screen
   - If `isUnauthenticated`: Render `<UnauthenticatedShell />`
   - Otherwise: Render `<AuthenticatedShell />`

**Key Design**: All hooks are unconditional to follow Rules of Hooks

### Unauthenticated Shell (`UnauthenticatedShell`)

**Component**: Handles login/signup/verification/reset pages

**Routes**:
- `/login` → `<LoginPage />`
- `/signup` → `<SignupPage />`
- `/verify-email` → `<VerifyEmailPage />`
- `/reset-password` → `<ResetPasswordPage />`

**Behavior**:
- If authenticated user visits auth route: Redirects to `/`
- If unauthenticated user visits non-auth route: Redirects to `/login`
- Shows "Redirecting to sign in…" during redirect

### Authenticated Shell (`AuthenticatedShell`)

**Component**: Handles main app with data loading

**Hooks** (unconditional):
1. `useAuthStore((state) => state.status)`
2. `useAuthStore((state) => state.user)`

**Data Loading Effects** (gated INSIDE effects, not conditionally called):
1. `eventsStore.initialize()` - Initializes events store (only if authenticated)
2. Types loading - Handled by `AuthenticatedAppContent`
3. Schedules loading - Handled by `AuthenticatedAppContent`

**Renders**: `<AuthenticatedAppContent />` (main app component)

### Authenticated App Content (`AuthenticatedAppContent`)

**Component**: Main app with calendar, tasks, etc.

**Data Loading Effects** (all gated with `if (!isAuthenticated) return`):

1. **Types Loading**:
   - Effect depends on: `[isAuthenticated, authStatus]`
   - Calls: `eventTypesApi.getAll()` (GET `/api/types`)
   - Updates: `types` state, `typesLoaded` flag

2. **Events Loading**:
   - Effect depends on: `[activeView, isAuthenticated]`
   - Calls: `eventsStore.initialize()` (which calls GET `/api/calendars/cal_main/events?from=...&to=...`)
   - Updates: Events store

3. **Scheduled Events Loading**:
   - Effect depends on: `[activeView, isAuthenticated, displayedDays]`
   - Calls: `scheduledEventsApi.getForRange()` (GET `/api/calendars/cal_main/events?from=...&to=...`)
   - Updates: `scheduledItems` state

4. **Schedule Occurrences Loading**:
   - Effect depends on: `[activeView, isAuthenticated, displayedDays]`
   - Calls: `schedStore.loadRange()` (GET `/api/schedules?timeMin=...&timeMax=...`)
   - Updates: Schedule store

**Key Design**: All effects are declared unconditionally, but execution is gated inside the effect callback

## Routing & Navigation

### Route Structure

**Unauthenticated Routes** (in `UnauthenticatedShell`):
- `/login` - Login page
- `/signup` - Signup page
- `/verify-email` - Email verification page
- `/reset-password` - Password reset page

**Authenticated Routes** (in `AuthenticatedAppContent`):
- `/` - Main calendar view (default)
- `/api-testing` - API testing page
- Other app routes (calendar, tasks, etc.)

### Navigation Flow

**On Login Success**:
1. `LoginForm` calls `login(email, password)`
2. Auth store sets status to `'authenticated'`
3. `LoginForm` `useEffect` detects `authStatus === 'authenticated'`
4. Navigates to `/` (home)
5. `AppRoot` renders `AuthenticatedShell`
6. Data loading effects trigger

**On Logout**:
1. User calls `logout()`
2. Auth store sets status to `'unauthenticated'`
3. `AppRoot` renders `UnauthenticatedShell`
4. `UnauthenticatedShell` redirects to `/login`

**On Page Reload**:
1. `AppRoot` mounts
2. `useHydrateAuth()` triggers `hydrate()`
3. `hydrate()` calls `api.me()`
4. If 401: Attempts refresh, then retries `me()`
5. If success: Renders `AuthenticatedShell`
6. If failure: Renders `UnauthenticatedShell`

## Login Page Component

### LoginForm (`src/auth/components/LoginForm.tsx`)

**Props**: `onSuccess?: () => void`

**State**:
- `email`: string
- `password`: string
- `isSubmitting`: boolean

**Behavior**:
1. On submit: Calls `login(email, password)` from auth store
2. On success: `useEffect` watches `authStatus === 'authenticated'` and navigates to `/`
3. On error: Error is displayed (from auth store `error` field)

**UI**: Form with email/password inputs, submit button, error display, links to signup/reset

### LoginPage (`src/auth/pages/LoginPage.tsx`)

**Component**: Wrapper around `LoginForm`

**Layout**: Centered card with title, form, signup link, reset password link

## Data Loading vs Auth State

### Timing Issues

**Current Behavior**:
- Data loading effects in `AuthenticatedAppContent` depend on `[isAuthenticated, authStatus]`
- Effects run when component mounts, but check `isAuthenticated` inside
- If auth status changes from `'loading'` to `'authenticated'`, effects re-run

**Potential Race Conditions**:
1. Component mounts before auth is hydrated → Effects run but skip (safe)
2. Auth status changes while effects are running → Effects may run multiple times
3. Data calls made before cookies are fully set → 401 errors

### Current Mitigations

1. **Gating Inside Effects**: Effects check `if (!isAuthenticated) return` before making calls
2. **Cancellation**: Some effects use `cancelled` flags to prevent state updates after unmount
3. **Dependency Arrays**: Effects depend on `isAuthenticated` to re-run when auth state changes

### Known Issues

1. **Dual HTTP Clients**: 
   - Auth calls use `http.js` (has CSRF, refresh handling)
   - Data calls use `api.js` (direct fetch, no refresh handling)
   - If `api.js` gets 401, it doesn't trigger refresh

2. **No Retry After Refresh**: 
   - If data call gets 401, `http.js` refreshes and retries
   - But `api.js` doesn't have this logic
   - Data calls may fail even after successful refresh

3. **CSRF for Data Calls**:
   - `api.js` doesn't attach CSRF headers
   - But data endpoints are GET, so CSRF not required
   - However, if any data endpoints become POST/PUT/DELETE, CSRF will be missing

## Error Handling

### Auth Errors

**Login Errors**: 
- Displayed in `LoginForm` via `error` field from auth store
- Error message from API response or generic "Login failed"

**Hydrate Errors**: 
- Not displayed to user (silent failure)
- Status set to `'unauthenticated'`
- User sees login page

**Refresh Errors**: 
- Handled silently by `tokenBridge`
- Sets `refreshFailed` flag to prevent infinite loops
- User must manually log in again

### Network Errors

**401 Errors**:
- `http.js`: Attempts refresh, retries request
- `api.js`: Throws error, no retry

**Other Errors**:
- Displayed in console
- Some components show error states (e.g., types loading error)

## Logging

### Frontend Logs

**Auth Store**:
- `[Auth][Store] login called`
- `[Auth][Store] login complete, status set to authenticated`
- `[Auth][Store] login failed`

**Auth API**:
- `[Auth][CSRF] token fetched and cookie set`
- `[Auth][CSRF] failed to fetch token`

**HTTP Client**:
- `[HTTP] request` (debug)
- `[HTTP] response` (debug)
- `[HTTP] 401 received, attempting token refresh`
- `[HTTP] token refresh succeeded, retrying request`

**App Shell**:
- `[AuthShell] effect: eventsStore.initialize`
- `[AuthAppContent] effect: loadTypes`
- `[AuthAppContent] effect: loadScheduledEvents`
- `[AuthAppContent] effect: loadScheduleRange`

**API Service**:
- `[API] request` (with correlation ID)
- `[API] response` (with status)

### Correlation IDs

- Generated by `http.js`: `fe-{random}-{timestamp}`
- Generated by `api.js`: `api-{random}-{timestamp}`
- Sent in `X-Correlation-Id` header
- Included in error objects for tracing

