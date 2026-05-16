# Testing Guide

The repo has fast unit tests for service rules, HTTP handler behavior,
application workflow rules, and reminder worker reliability. PostgreSQL
integration tests are available behind an environment variable so the default
test command stays lightweight.

## Current Test Command

```sh
make test
```

Runs:

```sh
go test ./...
```

Coverage can be checked with:

```sh
go test ./... -cover
```

## Testing Strategy

Keep tests layered by risk:

## Unit Tests

Use for fast business-rule checks.

Good targets:

- Config parsing edge cases.
- Application status transition rules.
- Contact, interview, resume, and reminder validation.
- Reminder retry decision logic.
- Keyword extraction and scoring helpers.
- Date filtering helpers.

Current examples:

```text
backend/internal/services/applications/service_test.go
backend/internal/services/contacts/service_test.go
backend/internal/services/interviews/service_test.go
backend/internal/services/reminders/service_test.go
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

Integration tests are gated behind environment variables so normal
`go test ./...` stays lightweight.

Example:

```sh
CAREEROS_INTEGRATION_DATABASE_URL=postgres://postgres:postgres@localhost:5432/careeros?sslmode=disable go test ./backend/internal/services/applications
```

## Worker Tests

The reminder worker has unit coverage for the core reliability behaviors:

- Finds due pending reminders.
- Claims scheduled reminders before processing.
- Marks pending reminders as `processing` before delivery.
- Writes reminder deliveries idempotently.
- Retries failed jobs up to `REMINDER_MAX_RETRIES`.
- Reschedules failed reminders with backoff.
- Writes failed jobs after retry exhaustion.
- Does not deliver cancelled reminders.

The worker tests use package-local store and queue fakes. That keeps the default
test suite fast while still exercising the state machine around delivery,
retry, and dead-lettering.

Day 3 service and handler tests cover:

- Contact validation and routes.
- Interview round validation and routes.
- Reminder creation, scheduling, cancellation, and routes.

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

Recommended Day 3 smoke flow:

1. Create a company.
2. Create an application for the company.
3. Create a contact for the company.
4. Create an interview round for the application.
5. Create a reminder due within a few seconds.
6. Confirm the worker changes the reminder from `pending` to `sent`.
7. Confirm invalid inputs return `400`, such as a blank contact name or invalid
   interview `round_type`.

## What To Test First

Recommended order:

1. Health handler tests.
2. Config parsing tests.
3. Application status state machine tests.
4. Transactional application workflow integration test.
5. Reminder worker reliability tests.
6. Query-layer integration tests for contacts, interviews, reminders, and Redis
   scheduling.
