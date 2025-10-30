# TimeBlocks Backend

Spring Boot backend for TimeBlocks with SQLite (dev) and Postgres-ready (prod) support.

## Prerequisites

- Java 21+
- Gradle (wrapper included)

## Running the Backend

### Development Mode (SQLite)

```bash
# On Linux/Mac
./gradlew bootRun --args='--spring.profiles.active=dev'

# On Windows
gradlew.bat bootRun --args='--spring.profiles.active=dev'
```

The backend will start on `http://localhost:8080`

### First Run Setup

On first run, Flyway will automatically:
1. Create the SQLite database at `~/timeblocks-dev.sqlite`
2. Run all migrations in `src/main/resources/db/migration/sqlite/`
3. Seed the database with dev data

### Testing the Backend

Once running, test the health endpoint:
```bash
curl http://localhost:8080/api/health
```

Expected response:
```json
{"ok":true,"service":"timeblocks-backend"}
```

### API Endpoints

- **Health Check**: `GET /api/health`
- **Get Calendar Events**: `GET /api/calendars/{id}/events?from={ISO_UTC}&to={ISO_UTC}`

Example:
```bash
curl "http://localhost:8080/api/calendars/cal_main/events?from=2025-10-13T00:00:00Z&to=2025-10-20T00:00:00Z"
```

## Database

### Development (SQLite)
- Location: `~/timeblocks-dev.sqlite`
- Migrations: `src/main/resources/db/migration/sqlite/`

### Production (Postgres)
Set environment variables:
- `DB_USER`: Postgres username
- `DB_PASS`: Postgres password
- Update `application-prod.yml` with correct host

Run with:
```bash
./gradlew bootRun --args='--spring.profiles.active=prod'
```

## Seeded Dev Data

The dev database includes:
- Workspace: `ws_dev` (Dev Workspace)
- User: `u_dev` (dev@example.com)
- Calendar: `cal_main` (Main)
- Event Types:
  - `type_deep`: Deep Work (blue)
  - `type_gym`: Workout (green)
- Sample Events:
  - Single event: "Deep Work Block" (Oct 15, 2025)
  - Recurring event: "Gym" (Weekly: Mon/Wed/Fri)

## Frontend Integration

The React frontend at `/backend-test` can connect to this backend to verify the integration.

Visit `http://localhost:5173/backend-test` (or your frontend port) after starting both servers.

