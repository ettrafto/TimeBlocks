# How to Test Step 1.2 - Backend Logging & Correlation-ID

This document provides manual testing steps to verify the logging enhancements, correlation-ID plumbing, and JWT diagnostics implemented in Phase 1.2.

## Prerequisites

- Backend server running on `http://localhost:8080`
- Terminal/console access to view backend logs
- `curl` or similar HTTP client (or browser DevTools)

## 1. Test JWT Filter Logging

### Test Missing Token (jwt_missing)

```bash
curl -v http://localhost:8080/api/types
```

**Expected Log Output:**
```
[JWT][Filter] no ACCESS cookie path=/api/types method=GET reason=jwt_missing cid=<uuid>
[Security][AuthEntryPoint] path=/api/types method=GET reason=... cookies=no-auth-cookies cid=<uuid>
```

**Verification:**
- Log contains `[JWT][Filter]`
- Log contains `reason=jwt_missing`
- Log contains `cid=<uuid>` (correlation ID)

### Test Malformed Token (jwt_malformed)

```bash
curl -v -H "Cookie: tb_access=not.a.valid.jwt" http://localhost:8080/api/types
```

**Expected Log Output:**
```
[JWT][Filter] ACCESS cookie found path=/api/types method=GET cid=<uuid>
[JWT][Filter] malformed token path=/api/types method=GET reason=jwt_malformed cid=<uuid>
[Security][AuthEntryPoint] path=/api/types method=GET reason=... cookies=tb_access=present cid=<uuid>
```

**Verification:**
- Log contains `reason=jwt_malformed`
- Log contains correlation ID

### Test Expired Token (jwt_expired)

To test expired tokens, you would need to:
1. Generate a token with a past expiration date
2. Or wait for a token to expire (15 minutes for access tokens)

**Expected Log Output:**
```
[JWT][Filter] expired token path=/api/types method=GET reason=jwt_expired cid=<uuid>
```

## 2. Test Correlation ID Echo

### Test with Provided Correlation ID

```bash
curl -v -H "X-Correlation-Id: abc123" http://localhost:8080/api/auth/me
```

**Expected:**
- **Response Header:** `X-Correlation-Id: abc123`
- **JSON Body:** Contains `"correlationId": "abc123"`
- **Logs:** All log entries include `cid=abc123`

**Verification:**
```bash
# Check response header
curl -v -H "X-Correlation-Id: abc123" http://localhost:8080/api/auth/me 2>&1 | grep -i "x-correlation-id"

# Check JSON body
curl -H "X-Correlation-Id: abc123" http://localhost:8080/api/auth/me | jq '.correlationId'
# Should output: "abc123"
```

### Test Auto Correlation ID Generation

```bash
curl -v http://localhost:8080/api/auth/me
```

**Expected:**
- **Response Header:** `X-Correlation-Id: <generated-uuid>`
- **JSON Body:** Contains `"correlationId": "<same-uuid>"`
- **Logs:** All log entries include `cid=<same-uuid>`

**Verification:**
```bash
# Extract correlation ID from header
CID=$(curl -s -D - http://localhost:8080/api/auth/me | grep -i "x-correlation-id" | cut -d' ' -f2 | tr -d '\r\n')

# Verify it's a UUID format
echo $CID | grep -E "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"

# Verify it's in JSON body
curl -s http://localhost:8080/api/auth/me | jq -r '.correlationId' | grep -E "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
```

## 3. Test Refresh Token Logging

### Full Flow: Login → Refresh → Logout

```bash
# 1. Login
LOGIN_RESPONSE=$(curl -s -c cookies.txt -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@local.test","password":"Admin123!"}')

echo "Login response: $LOGIN_RESPONSE"

# 2. Refresh (using cookies from login)
REFRESH_RESPONSE=$(curl -s -b cookies.txt -c cookies.txt -X POST http://localhost:8080/api/auth/refresh)

echo "Refresh response: $REFRESH_RESPONSE"

# 3. Logout
LOGOUT_RESPONSE=$(curl -s -b cookies.txt -X POST http://localhost:8080/api/auth/logout)

echo "Logout response: $LOGOUT_RESPONSE"
```

**Expected Log Output:**

**During Login:**
```
[RefreshToken][Issue] token issued tokenId=<uuid> userId=<uuid> cid=<uuid>
```

**During Refresh:**
```
[RefreshToken][Validate] token valid tokenId=<uuid> userId=<uuid> reason=valid cid=<uuid>
[RefreshToken][Rotate] token rotated oldTokenId=<uuid> newTokenId=<uuid> userId=<uuid> cid=<uuid>
[RefreshToken][Revoke] token revoked tokenId=<uuid> userId=<uuid> immediate=false cid=<uuid>
[RefreshToken][Issue] token issued tokenId=<uuid> userId=<uuid> cid=<uuid>
```

**During Logout:**
```
[RefreshToken][Revoke] token revoked tokenId=<uuid> userId=<uuid> immediate=true cid=<uuid>
```

**Verification:**
- All logs include `[RefreshToken][...]` prefix
- All logs include `reason=...` where applicable
- All logs include correlation ID (`cid=...`)
- No raw token values are logged

## 4. Test Correlation ID Propagation Across Filters

### Verify Correlation ID in All Logs

```bash
# Make a request with a known correlation ID
curl -H "X-Correlation-Id: test-flow-123" \
     -H "Cookie: tb_access=invalid.token" \
     http://localhost:8080/api/types
```

**Expected Log Sequence:**
```
[CorrelationIdFilter] (if logging enabled)
[JWT][Filter] ... cid=test-flow-123
[Security][AuthEntryPoint] ... cid=test-flow-123
```

**Verification:**
- All log entries for this request contain `cid=test-flow-123`
- Response header contains `X-Correlation-Id: test-flow-123`

## 5. Run Full Test Suite

```bash
cd backend
./gradlew test --tests "com.timeblocks.web.AuthControllerIntegrationTest"
```

**Windows (PowerShell):**
```powershell
cd backend
.\gradlew.bat test --tests "com.timeblocks.web.AuthControllerIntegrationTest"
```

**Expected:**
- All tests pass
- Tests verify:
  - Correlation ID propagation
  - Correlation ID auto-generation
  - Cookie attribute assertions
  - 401 JSON format

## 6. Manual Verification Checklist

- [ ] JWT filter logs `reason=jwt_missing` when no token present
- [ ] JWT filter logs `reason=jwt_malformed` when token is invalid
- [ ] JWT filter logs `reason=jwt_expired` when token is expired (if testable)
- [ ] JWT filter logs `reason=jwt_user_not_found` when user doesn't exist
- [ ] JWT filter logs `reason=valid` when authentication succeeds
- [ ] All JWT filter logs include `cid=<correlation-id>`
- [ ] RefreshTokenService logs `[RefreshToken][Validate]` with reason codes
- [ ] RefreshTokenService logs `[RefreshToken][Rotate]` during refresh
- [ ] RefreshTokenService logs `[RefreshToken][Revoke]` during logout
- [ ] RefreshTokenService logs `[RefreshToken][Issue]` during login
- [ ] All RefreshTokenService logs include correlation ID
- [ ] Correlation ID from request header is echoed in response header
- [ ] Correlation ID is auto-generated when header is missing
- [ ] Correlation ID appears in all log entries for a request
- [ ] Correlation ID appears in 401 JSON response body
- [ ] No raw token values are logged anywhere

## Troubleshooting

### Logs Not Appearing

- Check log level configuration in `application-test.yml` or `application-dev.yml`
- Ensure log level for `com.timeblocks.security` is at least `DEBUG` for detailed logs
- Check that console output is not being filtered

### Correlation ID Not Propagating

- Verify `CorrelationIdFilter` is registered before `JwtAuthenticationFilter` in `SecurityConfig`
- Check that `CorrelationIdHolder.clear()` is called in filter's `finally` block
- Verify ThreadLocal is being used correctly (not shared across threads)

### Tests Failing

- Ensure test database is properly isolated
- Check that test profile (`application-test.yml`) has correct configuration
- Verify all required beans are available in test context

