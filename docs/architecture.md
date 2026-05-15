# Architecture

CareerOS is a single-user job application operating system. The current codebase
is the Day 1 foundation: a Go API, a reminder worker process, PostgreSQL, Redis,
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
| Worker | `backend/cmd/worker/main.go` | Starts the reminder worker loop. Currently logs ticks on an interval. |
| Migrate | `backend/cmd/migrate/main.go` | Runs Goose migrations with `up`, `down`, or `status`. |
| Seed | `backend/cmd/seed/main.go` | Placeholder entry point for seed data. |

## Request Flow

The implemented HTTP flow is intentionally small:

```text
HTTP request
  -> chi router
  -> middleware
  -> handler
  -> PostgreSQL / Redis clients
  -> JSON response
```

The planned fuller backend shape from the PRD is:

```text
HTTP request
  -> router
  -> handler
  -> service
  -> repository / sqlc query layer
  -> PostgreSQL
```

Use that planned shape when adding business-heavy endpoints, especially
application status transitions, reminder scheduling, and audit logging.

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
- Reminder worker skeleton.

## What Is Planned

- CRUD APIs for companies, resume versions, applications, job descriptions,
  contacts, interviews, and reminders.
- Service layer for business rules.
- sqlc generated query layer.
- Transactional application workflow and audit logs.
- Search, analytics, reminder delivery, and frontend UI.
