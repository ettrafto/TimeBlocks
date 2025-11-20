# How to Test Gradle Alignment

This document verifies that all auth-related tests and documentation are correctly aligned with Gradle (not Maven).

## Quick Verification

### Step 1: Verify Build Tool

```bash
cd backend
ls -la | grep -E "(gradlew|build.gradle|pom.xml)"
```

**Expected:**
- `gradlew` or `gradlew.bat` exists
- `build.gradle.kts` or `build.gradle` exists
- **No** `pom.xml` files

### Step 2: Run Auth Integration Tests

#### macOS/Linux

```bash
cd backend
./gradlew test --tests "com.timeblocks.web.AuthControllerIntegrationTest"
```

#### Windows (PowerShell)

```powershell
cd backend
.\gradlew.bat test --tests "com.timeblocks.web.AuthControllerIntegrationTest"
```

**Expected:**
- Tests compile successfully
- Tests run without errors
- No references to Maven or `mvnw` in output
- All tests pass

### Step 3: Run Full Test Suite

#### macOS/Linux

```bash
cd backend
./gradlew test
```

#### Windows (PowerShell)

```powershell
cd backend
.\gradlew.bat test
```

**Expected:**
- All backend tests run
- No build tool errors

## Verification Checklist

- [ ] `gradlew` or `gradlew.bat` exists in `backend/` directory
- [ ] `build.gradle.kts` exists (not `pom.xml`)
- [ ] Auth tests run successfully with `./gradlew test --tests "com.timeblocks.web.AuthControllerIntegrationTest"`
- [ ] No Maven references (`mvnw`, `mvn`, `pom.xml`) in documentation
- [ ] All test instructions use Gradle commands
- [ ] Test class FQN is correct: `com.timeblocks.web.AuthControllerIntegrationTest`

## What Was Changed

1. **Documentation Updated:**
   - Created `backend-build-tooling.md` documenting Gradle setup
   - Created `how-to-run-backend-auth-tests.md` with Gradle commands
   - Updated `how-to-test-step-1-2.md` to use correct test class FQN
   - Created this verification guide

2. **Code Changes:**
   - Fixed `CorrelationIdFilter` registration in `SecurityConfig` (changed from bean injection to direct instantiation)
   - Fixed test assertions for content type (using `contentTypeCompatibleWith` instead of exact match)
   - Fixed logout test to not send cookies after logout (simulating browser behavior)

## Notes

- The backend has always used Gradle; this step was primarily documentation alignment
- All auth tests are located in the standard Gradle test directory structure
- No Maven artifacts or references were found in the codebase
- All tests pass successfully with Gradle

