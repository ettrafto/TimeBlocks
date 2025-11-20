# Base64 Decoding Error Investigation

## Error Message
```
Illegal base64 character: '-'
```

## Root Cause Identified

### Problem
In `JwtService.java`, the `ensureBase64()` method was:
1. Decoding the secret (handling URL-safe, standard Base64, or plain text)
2. Re-encoding it as standard Base64
3. Returning the Base64-encoded string

Then `accessKey()` and `refreshKey()` were:
- Calling `Decoders.BASE64.decode(ensureBase64(...))` to decode the Base64 string again
- Passing the result to `Keys.hmacShaKeyFor()`

### Issue
The double encoding/decoding was unnecessary and error-prone. More importantly, if the secret from config was already Base64 (especially URL-safe Base64), the decoding logic could fail or produce unexpected results.

### Solution Applied
Changed the approach:
- Renamed `ensureBase64()` to `ensureKeyBytes()`
- Now returns raw bytes directly (not Base64-encoded)
- Removed the unnecessary re-encoding step
- `accessKey()` and `refreshKey()` now pass raw bytes directly to `Keys.hmacShaKeyFor()`

### Code Changes
- `JwtService.java`: Refactored key generation to work with raw bytes
- `AuthController.java`: Fixed multi-catch compilation error (SecurityException is subclass of JwtException)

## Solution Implemented

### Changes Made

1. **JwtService.java** - Refactored key generation:
   - Renamed `ensureBase64()` → `ensureKeyBytes()`
   - Now returns raw bytes directly (not Base64-encoded)
   - Removed unnecessary re-encoding step
   - `accessKey()` and `refreshKey()` now pass raw bytes directly to `Keys.hmacShaKeyFor()`

2. **JwtService.java** - Improved error handling:
   - Added catch-all exception handler in `decodeMaybe()` to wrap unexpected errors
   - Better error messages for debugging

3. **AuthController.java** - Enhanced error handling:
   - Added specific handling for Base64-related errors
   - Returns 500 with "configuration_error" for Base64 decoding failures
   - Fixed multi-catch compilation error (SecurityException is subclass of JwtException)

### How It Works Now

1. Secret from config (e.g., "dev-access-secret") → `decodeMaybe()`
2. `decodeMaybe()` tries URL-safe Base64, then standard Base64, then treats as UTF-8
3. Returns raw bytes
4. If bytes < 64, strengthens via SHA-512
5. Returns raw bytes to `Keys.hmacShaKeyFor()`

No more double encoding/decoding, which eliminates the Base64 mismatch error.

## Testing

To verify the fix:
1. Start backend
2. Attempt login with admin credentials
3. Should get 200 response (not 500)
4. Check that ACCESS and REFRESH cookies are set
5. Verify `/api/auth/me` works after login
