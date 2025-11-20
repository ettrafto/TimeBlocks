# Auth Refactor Progress

## Phase 0 – Test Harness

- [x] 0.1 Backend auth integration tests (AuthControllerIntegrationTest)
- [x] 0.2 Frontend auth test harness & manual checklist

## Phase 1 – Backend Correctness & Observability

- [x] 1.1 Security config, CSRF/CORS, cookie attributes, 401 JSON
- [x] 1.2 Token diagnostics, correlation-ID, and logging upgrades

## Phase 2 – Frontend Correctness & Observability

- [x] 2.1 HTTP client + refresh flow
- [x] 2.2 Auth bootstrap timing + logging
- [x] 2.3 Error/logging standardization

## Phase 3 – Contract Alignment

- [x] 3.1 Data endpoint client alignment
- [x] 3.2 Cookie timing fixes
- [x] 3.3 CSRF for data mutations

## Phase 4 – Cleanup & Hardening

- [ ] 4.1 Log noise reduction
- [ ] 4.2 Error boundaries & UI messages
- [ ] 4.3 Docs & code cleanup

---

**Tooling note:** Backend auth tests and docs verified to use Gradle (`./gradlew`) rather than Maven. All test instructions updated to use correct Gradle commands with proper test class FQN (`com.timeblocks.web.AuthControllerIntegrationTest`).

_Last updated: 2024-12-19 – Phase 3.3 complete: CSRF for data mutations implemented - centralized CSRF handling in client.ts with /api/auth/** exemption, created ensureCsrfForMutations() for data mutations, wired CSRF guards into all data mutation endpoints, and added comprehensive CSRF debug telemetry._

