# Auth Modernization — Track A (Spring Boot & React)

## Stack & Architecture Overview

- **Backend**: Java 21 + Spring Boot, Spring Security 6, Spring Data JPA (Hibernate), Flyway, Argon2 password hashing.
- **Frontend**: React + Zustand + React Router + Tailwind; httpOnly cookie-based tokens.
- **Tokens**: 
  - Access JWT (~15 min) signed with `JWT_ACCESS_SECRET`.
  - Refresh JWT (~30 days) signed with `JWT_REFRESH_SECRET`, stored hashed in `auth_tokens`.
- **Storage**:
  - Dev: SQLite auto-migrated via Flyway.
  - Prod: PostgreSQL with the same migrations.
- **Email flows**: verification & reset codes persisted; delivery as console log in dev (extensible to SMTP).

## Login/Refresh Sequence Diagram (ASCII)

```
Client        Backend (Spring)           DB
  | POST /login (email,pw)  |
  |------------------------>|  Verify pw hash
  |                         |--> lookup user, check verified
  |                         |
  |<--- Set cookies (AT,RT)-|  store refresh token hash
  |       body: user        |
  |                         |
  |--- Auth request w/ AT --> (Filter validates JWT)
  |<------- 200 (data) -----|
  |                         |
  |--- Request with expired access token -->|
  |<------ 401 (handled) -------------------|
  |--- POST /auth/refresh (cookie RT) ----->| validate RT, ensure not revoked
  |                         |--> rotate token (mark old revoked, issue new, store hash)
  |<--- new cookies (AT,RT)-|
  |--- Retry original call ->|
  |<------- 200 -------------|
```

## Tradeoffs (JWT vs Server Sessions)

| Aspect | JWT + Refresh (chosen) | Server Sessions |
|--------|------------------------|-----------------|
| Scaling | Stateless access, easy horizontal scaling | Requires sticky sessions / shared cache |
| Storage | Minimal DB writes (only refresh rotation) | Store session state (DB/Redis) |
| Security | Needs rotation / revocation list; JWT theft mitigated by httpOnly cookies | Simpler invalidation, but still vulnerable if session id leaks |
| DX | Works with existing RESTful architecture | Requires session serialization |
| Complexity | Need token helpers, rotation logic | Simpler, but more server state |

Chosen JWT approach because we already plan hashed refresh storage & rotation, enabling stateless access tokens and compatibility with API clients.

## Risks & Mitigations

- **Token theft via XSS** → Use httpOnly, Secure, SameSite cookies, strict CORS, CSP (future).
- **Refresh token reuse** → Rotate on every refresh; detect reuse, revoke all tokens for user.
- **Brute-force login/signup** → Add rate limiting (bucket4j/filter).
- **Email spoofing** → Codes stored hashed; future enhancement: email service with domain verification.
- **Password resets abuse** → Rate limit requests and invalid after use/expiry.
 

