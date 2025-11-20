# Backend Build Tooling

## Build Tool: Gradle (Kotlin DSL)

The TimeBlocks backend uses **Gradle** with Kotlin DSL for build configuration.

### Build Files

- **`build.gradle.kts`** - Main build configuration (Kotlin DSL)
- **`settings.gradle.kts`** - Project settings
- **`gradle.properties`** - Gradle properties

### Wrapper Scripts

- **`gradlew`** - Gradle wrapper for Unix/macOS/Linux
- **`gradlew.bat`** - Gradle wrapper for Windows

### Maven Status

- **No Maven files found** - The project does not use Maven
- No `pom.xml` files exist
- No `mvnw` or `mvnw.cmd` wrapper scripts exist

### Test Configuration

- **Test Framework:** JUnit 5 (Jupiter) via `spring-boot-starter-test`
- **Test Location:** `backend/src/test/java/`
- **Test Dependencies:**
  - `org.springframework.boot:spring-boot-starter-test` (includes JUnit 5, AssertJ, Mockito)
  - `org.springframework.security:spring-security-test` (for security testing)
- **Test Execution:** Configured to use JUnit Platform (`useJUnitPlatform()`)

### Java Version

- **Java 21** - Required Java version (configured via toolchain)

### Running Tests

#### All Tests
```bash
# macOS/Linux
./gradlew test

# Windows (PowerShell)
.\gradlew.bat test
```

#### Single Test Class
```bash
# macOS/Linux
./gradlew test --tests "com.timeblocks.web.AuthControllerIntegrationTest"

# Windows (PowerShell)
.\gradlew.bat test --tests "com.timeblocks.web.AuthControllerIntegrationTest"
```

### Auth Integration Tests

The auth integration tests were added in **Phase 0.1** and are located at:
- `backend/src/test/java/com/timeblocks/web/AuthControllerIntegrationTest.java`

These tests use:
- `@SpringBootTest` - Full Spring context
- `@AutoConfigureMockMvc` - MockMvc for HTTP testing
- `@ActiveProfiles("test")` - Test profile configuration
- JUnit 5 (`@Test`, `@AfterEach`)

All auth tests are runnable via the standard Gradle test task.

