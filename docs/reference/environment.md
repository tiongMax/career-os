# Environment Variables

CareerOS reads backend configuration from environment variables in `backend/internal/config/config.go`. The frontend also reads `NEXT_PUBLIC_API_URL` in `frontend/lib/api.ts`.

Do not commit real secrets. Use `.env.example` as the safe local template.

## Variables

| Variable | Required | Default | Used by | Description | Example |
| --- | --- | --- | --- | --- | --- |
| `APP_ENV` | Optional | `development` | API, worker, migrator | Names the runtime environment and affects logger formatting/behavior. | `development` |
| `API_PORT` | Optional | `8080` | API | TCP port for the HTTP server. | `8080` |
| `DATABASE_URL` | Optional for local defaults, required for real deployments | `postgres://postgres:postgres@localhost:5432/careeros?sslmode=disable` | API, worker, migrator | PostgreSQL connection string used by pgx and Goose. | `postgres://postgres:postgres@localhost:5433/careeros?sslmode=disable` |
| `REDIS_URL` | Optional for local defaults, required for real deployments | `redis://localhost:6379` | API, worker | Redis connection string used for reminder scheduling. | `redis://localhost:6379` |
| `REMINDER_WORKER_POLL_INTERVAL_MS` | Optional | `1000` | Worker | How often the reminder worker checks for due reminders, in milliseconds. Must be an integer. | `1000` |
| `REMINDER_MAX_RETRIES` | Optional | `3` | Worker | Maximum reminder delivery attempts before a job is marked failed/dead-lettered. Must be an integer. | `3` |
| `LOG_LEVEL` | Optional | `info` | API, worker, migrator | Zerolog verbosity. | `debug`, `info`, `warn`, `error` |
| `NEXT_PUBLIC_API_URL` | Optional | `http://localhost:8080/api/v1` | Frontend | Browser/server API base URL used by `frontend/lib/api.ts`. Must include `/api/v1`. | `http://localhost:8080/api/v1` |
| `CAREEROS_INTEGRATION_DATABASE_URL` | Optional | none | Go integration tests | Enables PostgreSQL-backed integration tests when set. | `postgres://postgres:postgres@localhost:5433/careeros?sslmode=disable` |

## Local Example

```env
APP_ENV=development
API_PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5433/careeros?sslmode=disable
REDIS_URL=redis://localhost:6379
REMINDER_WORKER_POLL_INTERVAL_MS=1000
REMINDER_MAX_RETRIES=3
LOG_LEVEL=info
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

## Docker Compose Notes

`docker-compose.yml` exposes PostgreSQL on host port `5433` and Redis on host port `6379`.

The `api` and `worker` services in the `full` profile override these URLs for container-to-container networking:

```env
DATABASE_URL=postgres://postgres:postgres@postgres:5432/careeros?sslmode=disable
REDIS_URL=redis://redis:6379
```

## Validation

`REMINDER_WORKER_POLL_INTERVAL_MS` and `REMINDER_MAX_RETRIES` are parsed as integers at startup. Invalid values cause startup to fail.

<!-- TODO: clarify production secret management and required deployment variables with team. -->
