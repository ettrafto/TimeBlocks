<!-- a63694fd-8f80-4dca-b67b-b795b71c3728 38ab0129-e403-40f6-8b15-10728e67c113 -->
# Auth Modernization Plan (Track A: Java + Spring Boot)

## Stack Decision & Rationale

- **Backend**: Track A (Java Spring Boot) to stay aligned with existing codebase, leverage Spring Security, Hibernate, Flyway, and reuse current services without rewriting integrations.
- **Auth Style**: Short-lived JWT access tokens + refresh token rotation, stored in httpOnly SameSite cookies. Pros: stateless access control, easy horizontal scaling; Cons: need rotation logic. Server sessions rejected (stateful, more DB/cache load). Decisions documented in PLAN.md.

## Phase 1 – DB & Migrations (Flyway)

- Add Flyway V11+ migrations creating tables: `users`, `auth_tokens`, `email_verifications`, `password_resets` with proper indexes, UUID primary keys, FK constraints, timestamps.
- Seed admin user (dev only) with hashed password in migration or dedicated seed script.
- Update entities + repositories (User, AuthToken, EmailVerification, PasswordReset).

## Phase 2 – Backend Auth Module

- Introduce Spring Security config: password encoder (argon2/BCrypt), authentication filter, JWT utility, refresh-token service, rate-limiter, CORS hardening.
- Implement controllers under `/api/auth`: signup, verify-email, login, refresh, logout, request-reset, reset-password, me.
- Email verification & reset codes logged to console in dev (extendable later).
- Enforce auth on existing resource controllers via SecurityFilterChain; allow anonymous on auth routes, health, static.
- Add exception handling + structured error responses.
- Tests: unit (service, token helpers), integration (controller flows, refresh rotation, revoke on logout).

## Phase 3 – Frontend Auth Module

- Create `/src/auth/` with API wrapper, Zustand store, hooks, UI components, and pages (login/signup/verify/reset).
- Implement `<Protected>` wrapper and guard routes (calendar, settings, API test, etc.).
- Update `App.jsx` routing + hydrate auth on start via `/api/auth/me`; handle auto-refresh on 401.
- Insert account menu into TopNav (name/email, logout, admin link when role=admin).
- Extend API-testing page to display auth status & invoke auth endpoints.

## Phase 4 – QA & Tests

- Backend: extend integration test suite (signup→verify→login→me→refresh→logout, reset password, unauthorized access guard).
- Frontend: basic component tests for auth store/hooks, E2E-style manual QA checklist (documented) covering flows.
- Ensure existing drag/drop, calendar CRUD untouched; run regression smoke.

## Phase 5 – Docs & Env

- Add `PLAN.md` with architecture notes, sequence diagram (login/refresh), risk mitigations.
- Provide `.env.example` with all new variables.
- Update README with setup instructions, auth flow description, cookie behavior, roles, testing instructions.
- Document future enhancements + known limitations.

## Implementation Order

1. Draft PLAN.md (architecture, sequence diagram, risks).
2. Migrations + entities + initial seed.
3. Backend auth services/controllers/config + tests.
4. Frontend auth module & routing + API-testing page updates.
5. QA, documentation, env files, final verification.

### To-dos

- [ ] Create Settings page route and left‑nav layout
- [ ] Implement General section (timezone, formats, week/work hours)
- [ ] Implement Appearance section with instant theme apply
- [ ] Add Notifications section with channels/types/quiet hours/digest
- [ ] Implement Time & Scheduling defaults
- [ ] Implement Task Defaults options
- [ ] Add Calendar section with Google connect UI and options
- [ ] Add Export, Clear cache; defer Delete account control
- [ ] Implement Accessibility controls
- [ ] Create UserSettings entity, repo, controller for GET/PUT/export
- [ ] Wire frontend to load/save settings via API with optimistic updates