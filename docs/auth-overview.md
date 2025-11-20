# TimeBlocks Authentication System Overview

## Backend Endpoints

### Authentication Endpoints (`/api/auth/*`)

1. **GET `/api/auth/csrf`**
   - Purpose: Fetch CSRF token
   - Access: `permitAll()`
   - CSRF: Not required (exempted)
   - Response: `{ "token": "..." }`
   - Cookie: Sets `XSRF-TOKEN` cookie

2. **POST `/api/auth/login`**
   - Purpose: Authenticate user with email/password
   - Access: `permitAll()`
   - CSRF: Required (but exempted in config)
   - Request: `{ "email": "...", "password": "..." }`
   - Response: `{ "user": { ... } }`
   - Cookies: Sets `ACCESS` and `REFRESH` tokens

3. **POST `/api/auth/refresh`**
   - Purpose: Refresh access token using refresh token
   - Access: **Currently requires authentication** (ISSUE: Should be `permitAll()`)
   - CSRF: Exempted for `/api/auth/**`
   - Request: No body, reads refresh token from cookie
   - Response: `{ "status": "refreshed" }`
   - Cookies: Sets new `ACCESS` and `REFRESH` tokens

4. **GET `/api/auth/me`**
   - Purpose: Get current authenticated user
   - Access: `authenticated()` (requires valid access token)
   - CSRF: Not required for GET
   - Response: `{ "user": { ... } }` or 401

5. **POST `/api/auth/logout`**
   - Purpose: Logout and revoke refresh token
   - Access: `authenticated()` (but should work without auth too)
   - CSRF: Exempted for `/api/auth/**`
   - Response: `{ "status": "logged_out" }`
   - Cookies: Clears `ACCESS` and `REFRESH` tokens

6. **POST `/api/auth/signup`**
   - Purpose: Register new user
   - Access: `permitAll()`
   - CSRF: Exempted
   - Response: `{ "status": "verification_required" }`

7. **POST `/api/auth/verify-email`**
   - Purpose: Verify email with code
   - Access: `permitAll()`
   - CSRF: Exempted

8. **POST `/api/auth/request-password-reset`**
   - Purpose: Request password reset code
   - Access: `permitAll()`
   - CSRF: Exempted

9. **POST `/api/auth/reset-password`**
   - Purpose: Reset password with code
   - Access: `permitAll()`
   - CSRF: Exempted

## Security Configuration

### CSRF Protection
- **Repository**: `CookieCsrfTokenRepository` with `withHttpOnlyFalse()`
- **Cookie Name**: `XSRF-TOKEN`
- **Header Name**: `X-XSRF-TOKEN`
- **Exemptions**: All `/api/auth/**` endpoints are exempted
- **Filter**: `CsrfCookieFilter` ensures CSRF cookie is set on every request

### CORS Configuration
- **Allowed Origins**: `http://localhost:5173`, `http://localhost:3000`
- **Allowed Methods**: GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization, X-XSRF-TOKEN, X-Correlation-Id, X-Requested-With
- **Credentials**: `true` (cookies allowed)

### Authentication Flow
1. **JWT Authentication Filter** (`JwtAuthenticationFilter`)
   - Runs before Spring Security authentication
   - Reads `ACCESS` cookie
   - Validates JWT and sets `SecurityContext`

2. **Access Token**: JWT in `ACCESS` cookie (httpOnly, secure in prod)
3. **Refresh Token**: JWT in `REFRESH` cookie (httpOnly, secure in prod)

### Security Rules (Current - FIXED)
```java
- /api/auth/csrf → permitAll()
- POST /api/auth/login → permitAll()
- POST /api/auth/refresh → permitAll() (FIXED: was requiring auth)
- POST /api/auth/logout → permitAll() (FIXED: now allows logout without auth)
- /api/auth/signup → permitAll()
- /api/auth/verify-email → permitAll()
- /api/auth/request-password-reset → permitAll()
- /api/auth/reset-password → permitAll()
- /api/health → permitAll()
- /error → permitAll()
- GET / → permitAll()
- GET /api/auth/me → authenticated()
- All other /api/** → authenticated()
```

## Frontend Authentication Flow

### Files
- `src/auth/store.ts` - Zustand store for auth state
- `src/auth/api.ts` - API functions
- `src/auth/hooks.ts` - React hooks
- `src/auth/tokenBridge.ts` - Refresh token handler
- `src/lib/api/http.js` - HTTP client with CSRF and retry logic

### Auth State Machine
```typescript
status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
```

### Bootstrap Flow (Current - BROKEN)
1. App mounts → `useHydrateAuth()` called
2. `hydrate()` calls `api.me()`
3. If 401:
   - `http.js` catches 401, calls `triggerRefresh()`
   - `tokenBridge.ts` calls `api.refresh()`
   - If refresh succeeds → calls `hydrate(true)` again
   - If refresh fails → sets status to 'unauthenticated'
4. **ISSUE**: Infinite loop if refresh also returns 401

### CSRF Handling
1. `api.ts` functions call `ensureCsrf()` before POST requests
2. `ensureCsrf()` checks for `XSRF-TOKEN` cookie
3. If missing, calls `GET /api/auth/csrf`
4. `http.js` reads cookie and attaches `X-XSRF-TOKEN` header

### Issues Fixed

1. ✅ **Backend**: `/api/auth/refresh` now `permitAll()` - fixed in SecurityConfig
2. ✅ **Backend**: `LoggingAuthenticationEntryPoint` now returns JSON 401 response
3. ✅ **Backend**: Fixed Base64 decoding error in `JwtService` - eliminated double encoding/decoding
4. ✅ **Backend**: Improved error handling for token generation failures
5. ✅ **Frontend**: Fixed infinite loop by adding refresh failure tracking in `tokenBridge.ts`
6. ✅ **Frontend**: Added guards to prevent repeated refresh attempts
7. ✅ **Frontend**: Fixed "Loading TimeBlocks" spinner - now shows login page when unauthenticated
8. ✅ **Frontend**: Login form now properly navigates after successful login
9. ✅ **Frontend**: Improved CSRF handling and logging

### Token Encoding/Decoding

- **JWT Secrets**: Can be provided as URL-safe Base64, standard Base64, or plain text
- **Decoding**: `JwtService.decodeMaybe()` tries URL-safe Base64 first, then standard Base64, then treats as UTF-8
- **Key Generation**: Secrets are decoded to raw bytes, strengthened if needed (SHA-512), then used directly for HMAC-SHA512 keys
- **Error Handling**: Base64 decoding errors are caught and return 500 with "configuration_error" message

