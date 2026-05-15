# Backend Guide

The backend is a Go service with a small current implementation and a clear
planned path toward service-layer business logic.

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
    http/      router, middleware, handlers
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

Router file: `backend/internal/http/router.go`

Current middleware:

- `middleware.RequestID`
- `middleware.RealIP`
- custom request logger
- `middleware.Recoverer`

Current route group:

```text
/api/v1
  GET /health
```

The request logger records method, path, status, bytes written, duration, and
request ID.

## Health Handler

File: `backend/internal/http/health.go`

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

Current `ReminderWorker.Run()` starts a ticker, logs startup, logs each tick at
debug level, and exits cleanly when the process is interrupted.

Planned reminder behavior belongs in `backend/internal/workers/reminders.go` or
small helper files under `backend/internal/workers`.

## Planned Backend Layers

The PRD calls for a richer backend than what exists today. When adding real CRUD
and workflow endpoints, prefer this structure:

```text
internal/http        HTTP parsing, route params, JSON responses
internal/services    business rules and transactions
internal/db/queries  generated sqlc query methods
backend/queries      source SQL files for sqlc
```

Rule of thumb:

- Handlers should know HTTP.
- Services should know business rules.
- Queries should know SQL.

Do not put application status transition rules directly in handlers.
