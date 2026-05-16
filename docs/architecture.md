# Architecture

CareerOS is a single-user job application operating system. The current backend
includes a Go API, a Redis-backed reminder worker process, PostgreSQL, Redis,
Goose migrations, and a placeholder frontend.

## Current Runtime Shape

```text
frontend
   |
   | planned HTTP calls
   v
Go API process
   |
   | pgx pool
   v
PostgreSQL

Go API process
   |
   | go-redis client
   v
Redis

Reminder worker process
   |                 |
   | pgx pool        | go-redis client
   v                 v
PostgreSQL        Redis
```

## Processes

| Process | Entry point | Purpose |
| --- | --- | --- |
| API | `backend/cmd/api/main.go` | Starts the HTTP server and serves `/api/v1/*` routes. |
| Worker | `backend/cmd/worker/main.go` | Starts the reminder worker loop that claims due reminders from Redis, updates PostgreSQL state, retries failures, and dead-letters exhausted jobs. |
| Migrate | `backend/cmd/migrate/main.go` | Runs Goose migrations with `up`, `down`, or `status`. |
| Seed | `backend/cmd/seed/main.go` | Placeholder entry point for seed data. |

## Request Flow

The implemented HTTP flow uses thin handlers over service and query layers:

```text
HTTP request
  -> chi router
  -> middleware
  -> handler
  -> service
  -> PostgreSQL / Redis clients
  -> JSON response
```

Business-heavy endpoints follow this shape:

```text
HTTP request
  -> router
  -> handler
  -> service
  -> repository / sqlc query layer
  -> PostgreSQL
```

Application status transitions, reminder scheduling, and audit logging keep
business rules out of handlers.

## Main Dependencies

| Dependency | Used for |
| --- | --- |
| `github.com/go-chi/chi/v5` | Routing and middleware. |
| `github.com/jackc/pgx/v5` | PostgreSQL driver and connection pool. |
| `github.com/pressly/goose/v3` | Database migrations. |
| `github.com/redis/go-redis/v9` | Redis client. |
| `github.com/rs/zerolog` | Structured logging. |

## Docker Compose Topology

`docker-compose.yml` starts:

- `postgres` on port `5432`
- `redis` on port `6379`
- `api` on port `8080`
- `worker`

The API container runs migrations first:

```sh
./migrate up && ./api
```

Both API and worker wait for healthy PostgreSQL and Redis services before
starting.

## Environment Variables

| Variable | Default | Used by |
| --- | --- | --- |
| `APP_ENV` | `development` | Logger behavior. |
| `API_PORT` | `8080` | API listen address. |
| `DATABASE_URL` | local Postgres URL | API, worker, migrator. |
| `REDIS_URL` | `redis://localhost:6379` | API and worker. |
| `REMINDER_WORKER_POLL_INTERVAL_MS` | `1000` | Worker ticker interval. |
| `REMINDER_MAX_RETRIES` | `3` | Worker retry budget. |
| `LOG_LEVEL` | `info` | Zerolog level. |

## What Exists Now

- Health endpoint at `GET /api/v1/health`.
- PostgreSQL and Redis connectivity checks.
- Initial database schema migration.
- Docker Compose for local infrastructure.
- CRUD APIs for companies, resume versions, applications, job descriptions,
  contacts, interviews, and reminders.
- Service layer for validation, application status transitions, reminder
  scheduling, and worker retry behavior.
- Redis sorted-set scheduling for reminders.
- Reminder delivery idempotency and failed job storage.

## What Is Planned

- sqlc generated query layer.
- Search, analytics, seed data, performance benchmarks, and frontend UI.
