# How to Run Backend Auth Tests

This guide explains how to run the auth integration tests using Gradle.

## Prerequisites

- Java 21 installed
- Backend directory: `backend/`
- Gradle wrapper scripts: `gradlew` (Unix) or `gradlew.bat` (Windows)

## Running Auth Integration Tests

### macOS/Linux

```bash
cd backend
./gradlew test --tests "com.timeblocks.web.AuthControllerIntegrationTest"
```

### Windows (PowerShell)

```powershell
cd backend
.\gradlew.bat test --tests "com.timeblocks.web.AuthControllerIntegrationTest"
```

### Windows (Command Prompt)

```cmd
cd backend
gradlew.bat test --tests "com.timeblocks.web.AuthControllerIntegrationTest"
```

## Running All Backend Tests

### macOS/Linux

```bash
cd backend
./gradlew test
```

### Windows (PowerShell)

```powershell
cd backend
.\gradlew.bat test
```

## Test Class Details

- **Full Qualified Name:** `com.timeblocks.web.AuthControllerIntegrationTest`
- **Location:** `backend/src/test/java/com/timeblocks/web/AuthControllerIntegrationTest.java`
- **Added in:** Phase 0.1 (Backend auth integration tests)

## What the Tests Cover

The `AuthControllerIntegrationTest` includes tests for:

1. **Login Flow**
   - Successful login with cookie attributes
   - Bad credentials handling
   - Cookie attribute verification (httpOnly, path, SameSite, Secure)

2. **Authentication Verification**
   - `/api/auth/me` with valid token
   - `/api/auth/me` without token (401 response)

3. **Token Refresh**
   - Valid refresh token rotation
   - Invalid refresh token handling

4. **Logout**
   - Cookie clearing verification
   - Token revocation

5. **Protected Endpoints**
   - `/api/types` with authentication
   - `/api/types` without authentication (401 response)

6. **Correlation ID**
   - Correlation ID propagation
   - Auto-generation when missing

## Troubleshooting

### Tests Fail with "Class not found"

- Ensure you're using the full qualified class name: `com.timeblocks.web.AuthControllerIntegrationTest`
- Verify the test file exists at the expected location

### Tests Fail with Database Errors

- Check that `application-test.yml` is properly configured
- Ensure test database is isolated (uses in-memory SQLite)

### Gradle Wrapper Not Executable (Unix/macOS)

```bash
chmod +x gradlew
```

### Java Version Mismatch

- Ensure Java 21 is installed
- Gradle will use the toolchain-configured Java 21 automatically

