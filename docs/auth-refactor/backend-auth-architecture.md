# Backend Authentication Architecture

## Overview

The TimeBlocks backend uses Spring Security with JWT-based authentication. Authentication is stateless (no server-side sessions), using HTTP-only cookies for token storage. Refresh tokens are persisted in the database for revocation tracking.

## Endpoint Inventory

### Authentication Endpoints (`/api/auth/**`)

#### 1. GET `/api/auth/csrf`
- **Purpose**: Fetch CSRF token for state-changing requests
- **Access**: `permitAll()`
- **CSRF Requirement**: Not required (endpoint itself is exempt)
- **Request**: No body, no cookies required
- **Response**: 
  - Status: `200 OK`
  - Body: `{ "token": "..." }`
  - Cookie: Sets `XSRF-TOKEN` cookie (httpOnly=false, sameSite from config, secure from config)
- **Implementation**: `AuthController.csrf()`

#### 2. POST `/api/auth/login`
- **Purpose**: Authenticate user with email/password
- **Access**: `permitAll()`
- **CSRF Requirement**: Exempted (all `/api/auth/**` are exempt)
- **Request**: 
  - Body: `{ "email": "string", "password": "string" }`
  - Cookies: Optional (none required)
  - Headers: Optional `X-XSRF-TOKEN` (exempted but frontend sends it)
- **Response**:
  - Success (`200 OK`): `{ "user": { "id": "uuid", "email": "string", "name": "string", "role": "USER|ADMIN" } }`
  - Bad Credentials (`401 Unauthorized`): `{ "error": "bad_credentials", "message": "Invalid email or password" }`
  - Login Blocked (`403 Forbidden`): `{ "error": "login_blocked", "message": "..." }`
  - Configuration Error (`500 Internal Server Error`): `{ "error": "configuration_error", "message": "Server configuration error: invalid secret encoding" }`
  - Token Error (`500 Internal Server Error`): `{ "error": "token_error", "message": "Token generation failed" }`
- **Cookies Set**: 
  - `tb_access`: Access JWT (httpOnly=true, path=/, sameSite from config, secure from config, maxAge=accessTtlMinutes * 60)
  - `tb_refresh`: Refresh JWT (httpOnly=true, path=/, sameSite from config, secure from config, maxAge=refreshTtlDays * 24 * 3600)
- **Rate Limiting**: Yes (by remote IP/forwarded-for)
- **Implementation**: `AuthController.login()`

#### 3. POST `/api/auth/refresh`
- **Purpose**: Refresh access token using refresh token
- **Access**: `permitAll()` (fixed - was previously requiring auth)
- **CSRF Requirement**: Exempted
- **Request**:
  - Body: None
  - Cookies: **Required** `tb_refresh` cookie with valid refresh JWT
  - Headers: Optional `X-XSRF-TOKEN` (exempted but frontend sends it)
- **Response**:
  - Success (`200 OK`): `{ "status": "refreshed" }`
  - Missing Token (`400 Bad Request`): Throws `IllegalArgumentException("Missing refresh token")`
  - Invalid Token (`400 Bad Request`): Throws `IllegalArgumentException("Invalid refresh token")`
  - Token Revoked (`400 Bad Request`): Throws `IllegalArgumentException("Refresh token has been revoked")`
- **Cookies Set**: New `tb_access` and `tb_refresh` cookies (same attributes as login)
- **Token Rotation**: Yes - old refresh token is revoked, new pair is issued
- **Implementation**: `AuthController.refresh()`

#### 4. GET `/api/auth/me`
- **Purpose**: Get current authenticated user
- **Access**: `authenticated()` (requires valid access token)
- **CSRF Requirement**: Not required (GET request)
- **Request**:
  - Body: None
  - Cookies: **Required** `tb_access` cookie with valid access JWT
  - Headers: Optional `X-Correlation-Id`
- **Response**:
  - Success (`200 OK`): `{ "user": { "id": "uuid", "email": "string", "name": "string", "role": "USER|ADMIN" } }`
  - Unauthenticated (`401 Unauthorized`): JSON via `LoggingAuthenticationEntryPoint`
- **Implementation**: `AuthController.me()`

#### 5. POST `/api/auth/logout`
- **Purpose**: Logout and revoke refresh token
- **Access**: `permitAll()` (allows logout even without valid auth)
- **CSRF Requirement**: Exempted
- **Request**:
  - Body: None
  - Cookies: Optional `tb_refresh` cookie (if present, token is revoked)
  - Headers: Optional `X-XSRF-TOKEN` (exempted but frontend sends it)
- **Response**:
  - Success (`200 OK`): `{ "status": "logged_out" }`
- **Cookies Cleared**: `tb_access` and `tb_refresh` (set to empty, maxAge=0)
- **Implementation**: `AuthController.logout()`

#### 6. POST `/api/auth/signup`
- **Purpose**: Register new user
- **Access**: `permitAll()`
- **CSRF Requirement**: Exempted
- **Request**: `{ "email": "string", "password": "string", "name": "string" }`
- **Response**: `{ "status": "verification_required" }` (201 Created)
- **Rate Limiting**: Yes (by remote IP/forwarded-for)
- **Implementation**: `AuthController.signup()`

#### 7. POST `/api/auth/verify-email`
- **Purpose**: Verify email with code
- **Access**: `permitAll()`
- **CSRF Requirement**: Exempted
- **Request**: `{ "email": "string", "code": "string" }`
- **Response**: `{ "verified": true, "alreadyVerified": boolean, "verifiedAt": "ISO datetime" }`
- **Implementation**: `AuthController.verifyEmail()`

#### 8. POST `/api/auth/request-password-reset`
- **Purpose**: Request password reset code
- **Access**: `permitAll()`
- **CSRF Requirement**: Exempted
- **Request**: `{ "email": "string" }`
- **Response**: `{ "status": "reset_requested" }`
- **Rate Limiting**: Yes (by email)
- **Implementation**: `AuthController.requestPasswordReset()`

#### 9. POST `/api/auth/reset-password`
- **Purpose**: Reset password with code
- **Access**: `permitAll()`
- **CSRF Requirement**: Exempted
- **Request**: `{ "email": "string", "code": "string", "newPassword": "string" }`
- **Response**: `{ "status": "password_updated" }`
- **Implementation**: `AuthController.resetPassword()`

### Protected Data Endpoints

#### GET `/api/types`
- **Purpose**: Get all event types
- **Access**: `authenticated()`
- **CSRF**: Not required (GET)
- **Request**: No body, requires `tb_access` cookie
- **Response**: Array of type objects
- **Implementation**: `TypeController`

#### GET `/api/calendars/{id}/events`
- **Purpose**: Get calendar events for date range
- **Access**: `authenticated()`
- **CSRF**: Not required (GET)
- **Request**: Query params `from` (ISO string), `to` (ISO string), requires `tb_access` cookie
- **Response**: Array of event objects
- **Implementation**: `CalendarController.window()`

#### GET `/api/schedules`
- **Purpose**: Get schedule occurrences for date range
- **Access**: `authenticated()`
- **CSRF**: Not required (GET)
- **Request**: Query params `timeMin` (ISO string), `timeMax` (ISO string), requires `tb_access` cookie
- **Response**: Array of schedule occurrence objects
- **Implementation**: `ScheduleController`

## Security Configuration

### Security Filter Chain (`SecurityConfig`)

**Order of Filters:**
1. CORS filter (via `corsConfigurationSource()`)
2. CSRF filter (via `csrfTokenRepository()`)
3. `JwtAuthenticationFilter` (before `UsernamePasswordAuthenticationFilter`)
4. `CsrfCookieFilter` (after `CsrfFilter`)

**Session Management:**
- `SessionCreationPolicy.STATELESS` - No server-side sessions

**Authentication Provider:**
- `DaoAuthenticationProvider` with `AppUserDetailsService` and `PasswordEncoder`

### Security Rules

```java
// Public endpoints
.requestMatchers("/api/auth/csrf").permitAll()
.requestMatchers(HttpMethod.GET, "/api/auth/csrf").permitAll()
.requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
.requestMatchers(HttpMethod.POST, "/api/auth/refresh").permitAll()
.requestMatchers(HttpMethod.POST, "/api/auth/logout").permitAll()
.requestMatchers("/api/auth/signup").permitAll()
.requestMatchers("/api/auth/verify-email").permitAll()
.requestMatchers("/api/auth/request-password-reset").permitAll()
.requestMatchers("/api/auth/reset-password").permitAll()
.requestMatchers("/api/health").permitAll()
.requestMatchers("/error").permitAll()
.requestMatchers(HttpMethod.GET, "/").permitAll()

// Protected endpoints
.requestMatchers("/api/auth/me").authenticated()  // Requires valid ACCESS token
.anyRequest().authenticated()  // All other /api/** require authentication
```

### CSRF Configuration

**Repository**: `CookieCsrfTokenRepository.withHttpOnlyFalse()`

**Cookie Name**: `XSRF-TOKEN`

**Header Name**: `X-XSRF-TOKEN`

**Cookie Attributes** (from `AuthProperties`):
- `path`: `/`
- `sameSite`: From `authProperties.getCookieSameSite()` (default: `"Lax"`, dev: `"Lax"`)
- `secure`: From `authProperties.isCookieSecure()` (default: `false`, dev: `false`)
- `httpOnly`: `false` (so JavaScript can read it)

**Exemptions**: All `/api/auth/**` endpoints are exempted via `.ignoringRequestMatchers("/api/auth/**")`

**Filter**: `CsrfCookieFilter` ensures CSRF cookie is set on every request by touching the token

### CORS Configuration

**Allowed Origins**: 
- `http://localhost:5173` (Vite dev server)
- `http://localhost:3000` (alternative dev port)
- Plus any patterns from `authProperties.getCookieDomain()` if set

**Allowed Methods**: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`

**Allowed Headers**: 
- `Content-Type`
- `Authorization`
- `X-XSRF-TOKEN`
- `X-Correlation-Id`
- `X-Requested-With`

**Credentials**: `true` (allows cookies to be sent cross-origin)

**Max Age**: `3600` seconds (1 hour)

### Authentication Entry Point

**Class**: `LoggingAuthenticationEntryPoint`

**Behavior**:
- Logs 401 attempts with path, method, reason, cookie presence, correlation ID
- Returns JSON response: `{ "error": "unauthorized", "message": "Full authentication is required to access this resource" }`
- Status: `401 Unauthorized`
- Content-Type: `application/json`

### Access Denied Handler

**Class**: `LoggingAccessDeniedHandler`

**Behavior**:
- Logs 403 attempts with path, method, reason
- Re-throws exception (default Spring behavior)

## JWT & Token Design

### Access Token

**Storage**: HTTP-only cookie `tb_access`

**Format**: JWT (JSON Web Token)

**Algorithm**: HMAC-SHA512 (`Jwts.SIG.HS512`)

**Secret**: From `authProperties.getAccessSecret()` (default: `"dev-access-secret"`, can be Base64 or plain text)

**Claims**:
- `sub` (subject): User UUID as string
- `role`: User role (USER/ADMIN)
- `email`: User email
- `iat` (issued at): Current timestamp
- `exp` (expiration): Current time + `accessTtlMinutes` (default: 15 minutes)

**Validation**: 
- Parsed by `JwtService.parseAccessToken()`
- Validated in `JwtAuthenticationFilter.authenticateWithToken()`
- User is loaded from database by UUID from `sub` claim

**Cookie Attributes**:
- `httpOnly`: `true`
- `secure`: From `authProperties.isCookieSecure()` (dev: `false`)
- `sameSite`: From `authProperties.getCookieSameSite()` (dev: `"Lax"`)
- `path`: `/`
- `maxAge`: `accessTtlMinutes * 60` seconds

### Refresh Token

**Storage**: HTTP-only cookie `tb_refresh` + Database (`auth_tokens` table)

**Format**: JWT (JSON Web Token)

**Algorithm**: HMAC-SHA512 (`Jwts.SIG.HS512`)

**Secret**: From `authProperties.getRefreshSecret()` (default: `"dev-refresh-secret"`, can be Base64 or plain text)

**Claims**:
- `jti` (JWT ID): Token UUID as string (matches database `id`)
- `sub` (subject): User UUID as string
- `iat` (issued at): Current timestamp
- `exp` (expiration): Current time + `refreshTtlDays` (default: 30 days)

**Database Persistence**:
- Table: `auth_tokens`
- Fields: `id` (UUID, matches JWT `jti`), `user_id` (FK to users), `token_hash` (SHA-256 hash of token), `expires_at`, `revoked_at`, `created_at`
- Purpose: Enable token revocation and detect reuse

**Token Rotation**: 
- On refresh, old token is revoked (`revoked_at` set)
- New token pair is issued
- Old token hash is stored for reuse detection

**Cookie Attributes**: Same as access token (httpOnly, secure, sameSite, path, maxAge)

### JWT Service (`JwtService`)

**Key Generation**:
- Secrets can be: URL-safe Base64, standard Base64, or plain text
- `ensureKeyBytes()` tries URL-safe Base64 first, then standard Base64, then treats as UTF-8
- If decoded bytes < 64 bytes, strengthened via SHA-512 to get 64 bytes
- Final key: `Keys.hmacShaKeyFor(keyBytes)` for HMAC-SHA512

**Token Generation**:
- `generateAccessToken(userId, claims)`: Creates access JWT
- `generateRefreshToken(tokenId, userId)`: Creates refresh JWT

**Token Parsing**:
- `parseAccessToken(token)`: Validates and parses access JWT
- `parseRefreshToken(token)`: Validates and parses refresh JWT
- Both throw `JwtException` on invalid/expired tokens

## User & Auth Data Model

### User Entity (`User`)

**Table**: `users`

**Fields**:
- `id`: UUID (primary key, auto-generated)
- `email`: String (unique, not null, lowercased on persist/update)
- `password_hash`: String (not null, BCrypt hashed)
- `name`: String (nullable)
- `role`: `UserRole` enum (USER/ADMIN, default: USER)
- `email_verified_at`: LocalDateTime (nullable)
- `created_at`: LocalDateTime (not null, auto-set)
- `updated_at`: LocalDateTime (not null, auto-updated)

**Lifecycle**:
- `@PrePersist`: Sets `id` if null, sets `created_at`/`updated_at`, lowercases email
- `@PreUpdate`: Updates `updated_at`, lowercases email

### AuthToken Entity (`AuthToken`)

**Table**: `auth_tokens`

**Fields**:
- `id`: UUID (primary key, matches JWT `jti`, auto-generated)
- `user_id`: UUID (FK to users, not null)
- `token_hash`: String (SHA-256 hash of refresh token, not null)
- `expires_at`: LocalDateTime (not null)
- `revoked_at`: LocalDateTime (nullable, set when token is revoked)
- `created_at`: LocalDateTime (not null, auto-set)

**Lifecycle**:
- `@PrePersist`: Sets `id` if null, sets `created_at`

**Methods**:
- `isRevoked()`: Returns `true` if `revoked_at != null`

### Refresh Token Service (`RefreshTokenService`)

**Responsibilities**:
- Issue new refresh token pairs (`issue()`)
- Rotate refresh tokens (`rotateRefresh()`)
- Revoke tokens (`revoke()`, `revokeAllFor()`)
- Find active tokens by hash (`findActiveByToken()`)

**Token Hashing**: SHA-256 hash of token string (stored in DB, not the token itself)

**Reuse Detection**: If token is used but already revoked, all tokens for that user are revoked

## Dev Admin Seeder

**Class**: `DevAdminSeeder`

**Trigger**: Runs on application startup if `app.seed-admin.enabled=true` (default: `true`)

**Configuration**:
- Email: `app.seed-admin.email` (default: `"admin@local.test"`)
- Password: `app.seed-admin.password` (default: `"Admin123!"`)

**Behavior**:
- If user exists: Updates password, sets role to ADMIN, ensures email verified
- If user doesn't exist: Creates new user with ADMIN role, email verified
- Logs final state (email, role, verifiedAt, createdAt, updatedAt)

## Rate Limiting

**Service**: `RateLimiterService`

**Configuration** (from `application-dev.yml`):
- Window: `auth.rate-limit.window-ms` (default: `60000` = 1 minute)
- Max requests: `auth.rate-limit.max` (default: `20`)

**Applied To**:
- Login: Key = `"login:" + remoteKey`
- Signup: Key = `"signup:" + remoteKey`
- Password reset request: Key = `"pwdreset:" + email`

**Behavior**: Throws `IllegalStateException("Too many requests")` if limit exceeded

## Error Handling

### Authentication Errors

**401 Unauthorized**: 
- Triggered by: Missing/invalid access token, expired token, invalid JWT signature
- Handler: `LoggingAuthenticationEntryPoint`
- Response: JSON `{ "error": "unauthorized", "message": "Full authentication is required..." }`

**403 Forbidden**:
- Triggered by: Valid auth but insufficient permissions (not currently used, but handler exists)
- Handler: `LoggingAccessDeniedHandler`
- Response: Re-throws exception (default Spring 403)

### Token Errors

**Base64 Decoding Errors**: 
- Caught in `AuthController.login()` 
- Returns `500` with `{ "error": "configuration_error", "message": "Server configuration error: invalid secret encoding" }`

**JWT Generation Errors**:
- Caught in `AuthController.login()`
- Returns `500` with `{ "error": "token_error", "message": "Token generation failed" }`

**Invalid Refresh Token**:
- Thrown as `IllegalArgumentException` in `AuthController.refresh()`
- Returns `400 Bad Request` (Spring default)

## Logging

**Levels** (from `application-dev.yml`):
- Root: `INFO`
- `com.timeblocks`: `INFO`
- Spring Security filters: `INFO` (can be `DEBUG` for detailed JWT filter logs)

**Key Log Points**:
- `[Auth][Login]`: Login attempts, successes, failures
- `[Auth][Refresh]`: Refresh attempts, successes, failures, reuse detection
- `[Auth][Logout]`: Logout events
- `[JWT][Filter]`: JWT validation attempts, successes, failures
- `[Security][AuthEntryPoint]`: 401 events with cookie presence
- `[Security][AccessDenied]`: 403 events
- `[DevAdminSeeder]`: Admin user seeding

**Correlation IDs**: 
- Frontend sends `X-Correlation-Id` header
- Logged in auth endpoints for request tracing

