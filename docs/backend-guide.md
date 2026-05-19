# Backend Guide

The backend is a Go service organized around thin HTTP handlers, service-layer
business rules, hand-written query methods, PostgreSQL, Redis, and a background
reminder worker.

## Directory Map

```text
backend/
  cmd/
    api/       starts the HTTP API server
    migrate/   runs Goose migrations
    seed/      future seed-data entry point
    worker/    starts the reminder worker
  internal/
    config/    environment config
    db/        PostgreSQL and Redis client constructors
      queries/ hand-written query methods and scan helpers
    http/      router, middleware, handlers
    services/  business rules and workflow coordination
    logger/    zerolog setup
    workers/   background worker code
  migrations/  database schema migrations
  sqlc.yaml    sqlc config placeholder
```

## API Startup

Entry point: `backend/cmd/api/main.go`

Startup sequence:

1. Load environment config with `config.Load()`.
2. Configure structured logging.
3. Open and ping the PostgreSQL pool.
4. Open and ping the Redis client.
5. Build the HTTP router with shared dependencies.
6. Start `http.Server`.
7. Listen for interrupt or SIGTERM.
8. Gracefully shut down with a 10 second timeout.

The API address is derived from `API_PORT` through `Config.APIAddress()`.

## Router and Middleware

Router file: `backend/internal/httpapi/router.go`

Current middleware:

- `middleware.RequestID`
- `middleware.RealIP`
- custom request logger
- `middleware.Recoverer`

Current route group:

```text
/api/v1
  GET /health
  CRUD /companies
  CRUD /resume-versions
  CRUD /applications
  PATCH /applications/{id}/status
  GET /applications/{id}/audit-logs
  POST,GET /applications/{id}/job-description
  PATCH /job-descriptions/{id}
  CRUD /contacts
  POST,GET /applications/{id}/interviews
  PATCH,DELETE /interviews/{id}
  CRUD /reminders
  GET /reminders/due
  POST /reminders/{id}/cancel
```

The request logger records method, path, status, bytes written, duration, and
request ID.

## Service Layer

Service packages live under `backend/internal/services`. Handlers decode HTTP
input and call services; services own validation and workflow rules; query
methods own SQL.

Current services:

- `companies`: company CRUD validation.
- `resumes`: resume version validation and tag update semantics.
- `applications`: application validation, status transition rules, and audit
  log creation.
- `jobdescriptions`: job description validation and keyword update semantics.
- `contacts`: contact name validation.
- `interviews`: interview `round_type` validation.
- `reminders`: reminder validation, idempotency-key creation, and Redis
  scheduling coordination.

Keep business rules out of HTTP handlers. If an endpoint needs validation,
state transitions, scheduling, or transactions, put that behavior in the
service package and expose it through a small interface in the handler.

## Query Layer

Query methods live under `backend/internal/db/queries`. They are hand-written in
the current codebase but intentionally shaped like generated query methods:

- Parameter structs describe insert and update inputs.
- Model structs carry API JSON tags.
- Scan helpers centralize nullable PostgreSQL handling.
- Mutations that should report missing rows use `ensureAffected`.

When adding SQL, prefer parameterized queries, explicit column lists, and scan
helpers over ad hoc row handling inside services or handlers.

## Health Handler

File: `backend/internal/httpapi/health.go`

`GET /api/v1/health` checks both PostgreSQL and Redis with a 2 second timeout.

Healthy response:

```json
{
  "status": "ok",
  "postgres": "ok",
  "redis": "ok"
}
```

If either dependency fails, the handler returns HTTP `503` with `status:
"degraded"` and marks the failing dependency as `error`.

## Config

File: `backend/internal/config/config.go`

`config.Load()` reads environment variables, applies defaults, and validates
integer values for worker settings.

The current config is intentionally simple. If config grows, keep parsing and
validation here rather than scattering `os.Getenv` calls through the app.

## Database Clients

Files:

- `backend/internal/db/postgres.go`
- `backend/internal/db/redis.go`

PostgreSQL:

- Uses `pgxpool`.
- Sets pool limits and health-check timings.
- Pings before returning the pool.

Redis:

- Parses `REDIS_URL`.
- Pings before returning the client.
- Closes the client if the initial ping fails.

## Migrations

Entry point: `backend/cmd/migrate/main.go`

Supported commands:

```sh
go run ./backend/cmd/migrate up
go run ./backend/cmd/migrate down
go run ./backend/cmd/migrate status
```

The Makefile aliases the common commands:

```sh
make migrate-up
make migrate-down
```

Migration files live in `backend/migrations`.

## Worker

Entry point: `backend/cmd/worker/main.go`

The worker currently:

1. Loads config.
2. Opens PostgreSQL and Redis clients.
3. Builds `workers.ReminderWorker`.
4. Runs until context cancellation.

Current `ReminderWorker.Run()` starts a ticker, claims due reminder IDs from the
`reminders:scheduled` Redis sorted set, updates reminder state in PostgreSQL,
records idempotent delivery rows, and exits cleanly when the process is
interrupted.

Failed delivery attempts increment `retry_count`, store `last_error`, and
reschedule with backoff. Exhausted reminders are marked `failed` and copied to
`failed_reminder_jobs`.

Worker reliability is covered by unit tests in
`backend/internal/workers/reminders_test.go`. Those tests use package-local
store and queue fakes so the retry/dead-letter state machine can be tested
without requiring Docker for every `go test ./...` run.

## Backend Layering

When adding new backend behavior, prefer this structure:

```text
internal/httpapi     HTTP parsing, route params, JSON responses
internal/services    business rules and transactions
internal/db/queries  SQL query methods and scan helpers
backend/migrations   schema changes
```

Rule of thumb:

- Handlers should know HTTP.
- Services should know business rules.
- Queries should know SQL.

Do not put application status transition rules directly in handlers.
