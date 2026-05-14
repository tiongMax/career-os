# CareerOS

CareerOS is a single-user job application operating system for tracking companies, applications, resume versions, job descriptions, contacts, interviews, reminders, and analytics.

## Day 1 Foundation

This scaffold provides:

- Go API using Chi.
- PostgreSQL connectivity through pgx.
- Redis connectivity through go-redis.
- Goose migrations for the core schema.
- sqlc-ready query layout.
- Zerolog structured logging.
- Docker Compose services for API, worker, PostgreSQL, and Redis.

## Setup

```sh
cp .env.example .env
docker compose up --build
```

The API listens on `http://localhost:8080`.

## Health Check

```http
GET /api/v1/health
```

Expected healthy response:

```json
{
  "status": "ok",
  "postgres": "ok",
  "redis": "ok"
}
```

## Local Commands

```sh
make api
make worker
make migrate-up
make test
```

## Architecture

```text
frontend -> api -> PostgreSQL
              -> Redis

worker   -> PostgreSQL
         -> Redis
```
