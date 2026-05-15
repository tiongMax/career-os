# Testing Guide

The current repo has a `make test` command, but no test files are present yet.
This doc describes how tests should grow with the codebase.

## Current Test Command

```sh
make test
```

Runs:

```sh
go test ./...
```

## Testing Strategy

Add tests in layers as features become real.

## Unit Tests

Use for fast business-rule checks.

Good targets:

- Config parsing edge cases.
- Application status transition rules.
- Reminder retry decision logic.
- Keyword extraction and scoring helpers.
- Date filtering helpers.

Example future files:

```text
backend/internal/config/config_test.go
backend/internal/services/applications_test.go
backend/internal/workers/reminders_test.go
```

## HTTP Tests

Use for route behavior and JSON contracts.

Good targets:

- `GET /api/v1/health` healthy response.
- Health degraded response when PostgreSQL or Redis is unavailable.
- Request validation errors.
- Status codes for missing rows.
- JSON response shapes.

Keep HTTP tests focused on handler behavior. Mock or fake service dependencies
once the service layer exists.

## Integration Tests

Use when testing real PostgreSQL behavior matters.

Good targets:

- Migrations apply cleanly.
- Application create/update workflow.
- Transactional status update plus audit log.
- Full-text search queries.
- Reminder polling queries.

Gate integration tests behind an environment variable so normal `go test ./...`
stays lightweight.

Example:

```text
CAREEROS_INTEGRATION=1 go test ./backend/internal/...
```

## Worker Tests

The reminder worker should eventually have tests for:

- Finds due pending reminders.
- Marks reminders as processing before delivery.
- Writes reminder deliveries idempotently.
- Retries failed jobs up to `REMINDER_MAX_RETRIES`.
- Writes failed jobs after retry exhaustion.
- Does not deliver cancelled reminders.

## Manual Smoke Test

Use Docker Compose to test the whole local stack:

```sh
docker compose up --build
```

Then call:

```http
GET http://localhost:8080/api/v1/health
```

Expected healthy response:

```json
{
  "status": "ok",
  "postgres": "ok",
  "redis": "ok"
}
```

## What To Test First

Recommended order:

1. Health handler tests.
2. Config parsing tests.
3. Application status state machine tests.
4. Transactional application workflow integration test.
5. Reminder worker reliability tests.
