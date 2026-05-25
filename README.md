# CareerOS

[![CI](https://github.com/tiongMax/career-os/actions/workflows/ci.yml/badge.svg)](https://github.com/tiongMax/career-os/actions/workflows/ci.yml)

CareerOS is a backend-focused job application platform built as a production-equivalent system, not a CRUD demo. It pairs a Go REST API with a transactional status state machine and audit logging, an idempotent Redis-backed reminder worker with retries and dead-lettering, weighted PostgreSQL full-text search, a Next.js operational UI, and k6 load-test benchmarks with enforced p95 thresholds.

The domain is a single-user job search workflow — companies, applications, resume versions, job descriptions, contacts, interviews, reminders, search, and analytics — but the engineering choices are deliberately scaled to demonstrate the patterns that matter in real services.

## Table of Contents

- [Engineering Highlights](#engineering-highlights)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Running the App](#running-the-app)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Benchmarks](#benchmarks)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)

## Engineering Highlights

The patterns worth looking at, with direct file links:

| Pattern | Where | What it demonstrates |
| --- | --- | --- |
| Transactional state machine + audit log | [backend/internal/services/applications/status.go](backend/internal/services/applications/status.go), [docs/development/application-workflow.md](docs/development/application-workflow.md) | 8-state application lifecycle with whitelisted transitions; status changes and audit-log inserts happen in the same transaction so history cannot diverge from state. |
| Idempotent async worker | [backend/internal/workers/](backend/internal/workers/), [docs/development/reminder-worker.md](docs/development/reminder-worker.md) | Redis sorted set as scheduled queue, claim-based dequeue, server-generated idempotency keys protected by a unique constraint, exponential backoff (30s → 2m → 5m), and dead-lettering into `failed_reminder_jobs` at max retries. |
| Layered backend | [backend/internal/httpapi/](backend/internal/httpapi/), [backend/internal/services/](backend/internal/services/), [backend/internal/db/queries/](backend/internal/db/queries/) | Thin handlers own HTTP concerns; services own validation, workflows, and orchestration; query packages own SQL and model mapping. No fat handlers, no leaking SQL into HTTP. |
| Weighted PostgreSQL full-text search | [backend/internal/services/search/](backend/internal/services/search/) | `tsvector` ranking across applications and job descriptions, surfaced via a single `/search` endpoint. |
| OpenAPI 3.1 + Swagger UI | [backend/internal/httpapi/openapi.yaml](backend/internal/httpapi/openapi.yaml) | Spec served at `/api/v1/openapi.yaml`, UI at `/api/v1/docs`. |
| Load tests with enforced thresholds | [benchmarks/k6/](benchmarks/k6/), [benchmarks/README.md](benchmarks/README.md) | 5 weighted-scenario scripts (search, create, status-update, reminder-create, mixed) with built-in p95 thresholds that fail CI on regression. |
| CI on every PR | [.github/workflows/ci.yml](.github/workflows/ci.yml) | `go test -race -cover`, `golangci-lint`, frontend lint + build, and a Postgres-and-Redis-backed integration test job. |

For the prioritized backlog of what to harden next, see [docs/development/improvements.md](docs/development/improvements.md).

## Features

- Track companies, applications, role tracks, sources, statuses, and status history.
- Store resume versions, including tags, role track metadata, and optional PDF data.
- Attach job descriptions and extract keywords for resume comparison and prep workflows.
- Manage contacts, interview rounds, follow-ups, and reminders.
- Schedule reminder work through Redis with retry and failed-job handling.
- Search across application data and view analytics summaries.
- Export analytics data from the frontend.
- Serve OpenAPI YAML and Swagger UI from the API.
- Run local k6 benchmarks for search, application, reminder, and mixed workloads.

## Tech Stack

| Area | Technology |
| --- | --- |
| Backend | Go 1.24, Chi, pgx, Goose, go-redis, zerolog |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, lucide-react |
| Database | PostgreSQL 16 |
| Queue/cache | Redis 7 |
| Tooling | Docker Compose, Make, npm, sqlc-style query layout, k6 |

## Architecture

```text
Next.js frontend
  -> Go REST API
  -> PostgreSQL
  -> Redis reminder queue/state
  -> Reminder worker
```

Runtime components:

| Component | Entry point | Purpose |
| --- | --- | --- |
| Frontend | `frontend/app` | Operational UI for applications, contacts, resume versions, reminders, and analytics. |
| API | `backend/cmd/api` | REST API under `/api/v1`, health checks, OpenAPI, and Swagger UI. |
| Worker | `backend/cmd/worker` | Polls Redis for due reminders and records delivery state in PostgreSQL. |
| Migrator | `backend/cmd/migrate` | Applies and rolls back database migrations. |
| Seed command | `backend/cmd/seed` | Loads local development data. |

For more detail, see [Architecture](docs/reference/architecture.md).

## Prerequisites

- Go 1.24 or newer
- Node.js and npm
- Docker Desktop or another Docker Compose runtime
- Make, optional but recommended
- k6, optional for benchmarks

## Quick Start

From the repository root:

```sh
npm install
npm install --prefix frontend
cp .env.example .env
docker compose up -d postgres redis
make migrate-up
npm run build:api
npm run dev
```

Default local URLs:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| API | `http://localhost:8080/api/v1` |
| Health check | `http://localhost:8080/api/v1/health` |
| Swagger UI | `http://localhost:8080/api/v1/docs` |
| OpenAPI YAML | `http://localhost:8080/api/v1/openapi.yaml` |

## Running the App

Run the compiled API and frontend together:

```sh
npm run build:api
npm run dev
```

Run individual processes:

```sh
docker compose up -d postgres redis
make migrate-up
make api
make worker
npm run dev --prefix frontend
```

Run the backend API and worker through Docker Compose:

```sh
docker compose --profile full up --build
```

The frontend is not included in the `full` Compose profile. Run it separately with:

```sh
npm run dev --prefix frontend
```

## Environment Variables

Copy `.env.example` to `.env` for local development. The default values connect the API to PostgreSQL on `localhost:5433` and Redis on `localhost:6379`.

Common variables:

| Variable | Used by | Description |
| --- | --- | --- |
| `APP_ENV` | API, worker, migrator | Runtime environment name. |
| `API_PORT` | API | HTTP server port. |
| `DATABASE_URL` | API, worker, migrator | PostgreSQL connection string. |
| `REDIS_URL` | API, worker | Redis connection string. |
| `REMINDER_WORKER_POLL_INTERVAL_MS` | Worker | Reminder polling interval in milliseconds. |
| `REMINDER_MAX_RETRIES` | Worker | Maximum reminder delivery attempts. |
| `LOG_LEVEL` | API, worker, migrator | Structured logger verbosity. |
| `NEXT_PUBLIC_API_URL` | Frontend | API base URL. Must include `/api/v1` when set. |
| `CAREEROS_INTEGRATION_DATABASE_URL` | Tests | Enables PostgreSQL integration tests. |

See [Environment Variables](docs/reference/environment.md) for the complete reference.

## Testing

Run the Go test suite:

```sh
make test
```

Run frontend linting and production build checks:

```sh
npm run lint --prefix frontend
npm run build --prefix frontend
```

Run PostgreSQL-backed integration tests by setting `CAREEROS_INTEGRATION_DATABASE_URL`:

```sh
CAREEROS_INTEGRATION_DATABASE_URL=postgres://postgres:postgres@localhost:5433/careeros?sslmode=disable go test ./backend/internal/services/applications
```

See [Testing Guide](docs/development/testing-guide.md) for the testing strategy and manual smoke test flow.

## Benchmarks

k6 scripts live in `benchmarks/k6` and expect a running API with seeded data.

```sh
make seed
make bench-search
make bench-mixed
```

Additional scripts:

```sh
k6 run benchmarks/k6/create-application.js
k6 run benchmarks/k6/reminder-create.js
k6 run benchmarks/k6/status-update.js
```

See [Benchmarks](benchmarks/README.md) for prerequisites, thresholds, and target workloads.

## Project Structure

```text
career-os/
  backend/
    cmd/              API, worker, migrator, and seed entry points
    internal/         HTTP, services, database, logging, config, and workers
    migrations/       Goose database migrations
    queries/          SQL query source files
  frontend/
    app/              Next.js App Router pages
    components/       Shared UI components
    lib/              API client, domain constants, and utilities
  benchmarks/k6/      API benchmark scripts
  docs/
    reference/        Architecture, API, environment, and schema docs
    development/      Backend, testing, workflow, worker, and decision docs
    product/          Product requirements
```

## Documentation

- [Documentation Index](docs/README.md)
- [Architecture](docs/reference/architecture.md)
- [API Reference](docs/reference/api.md)
- [Database Schema](docs/reference/database-schema.md)
- [Environment Variables](docs/reference/environment.md)
- [Backend Guide](docs/development/backend-guide.md)
- [Application Workflow](docs/development/application-workflow.md)
- [Reminder Worker](docs/development/reminder-worker.md)
- [Testing Guide](docs/development/testing-guide.md)
- [Improvements Plan](docs/development/improvements.md)
- [Product Requirements](docs/product/prd.md)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. Keep docs current with behavior changes, run the relevant tests, and avoid committing local secrets or generated binaries.
