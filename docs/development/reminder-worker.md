# Reminder Worker

The reminder worker processes scheduled follow-ups asynchronously. PostgreSQL is
the source of truth for reminder state, and Redis only coordinates scheduling.

## Redis Schedule

Scheduled reminder IDs are stored in a Redis sorted set:

```text
reminders:scheduled
```

- member: reminder ID
- score: reminder `due_at` Unix timestamp

Creating a reminder inserts the PostgreSQL row first, generates a server-side
`idempotency_key`, then adds the reminder ID to this sorted set. Cancelling or
deleting a reminder removes the ID from Redis.

## Worker Flow

On each poll interval, the worker:

1. Reads reminder IDs with score less than or equal to the current Unix time.
2. Removes each claimed ID from `reminders:scheduled`. A worker only processes
   the reminder when this claim succeeds.
3. Loads the reminder from PostgreSQL.
4. Skips reminders that are no longer `pending`.
5. Marks pending reminders as `processing`.
6. Inserts a `reminder_deliveries` row using the unique `idempotency_key`.
7. Runs the simulated delivery function.
8. Marks the reminder `sent` and sets `delivered_at`.

## Retries And Dead Lettering

Failed work increments `retry_count`, stores `last_error`, marks the reminder
`pending`, and reinserts it into Redis with backoff:

```text
retry 1: 30 seconds
retry 2: 2 minutes
retry 3+: 5 minutes
```

When `retry_count` reaches `REMINDER_MAX_RETRIES`, the worker marks the reminder
`failed` and writes a row to `failed_reminder_jobs` with the failure payload.

## Idempotency

Each reminder has a server-generated `idempotency_key`. The worker writes that
key to `reminder_deliveries`, where it is protected by a unique constraint. This
keeps repeated processing attempts from creating duplicate delivery records for
the same reminder.

Redis claiming also reduces duplicate work: due IDs are removed from the sorted
set before processing, and a worker skips any ID it fails to remove.

## Configuration

The worker reads:

```text
REMINDER_WORKER_POLL_INTERVAL_MS
REMINDER_MAX_RETRIES
DATABASE_URL
REDIS_URL
LOG_LEVEL
```

Defaults are defined in `backend/internal/config/config.go`.

## Tests

Worker unit tests cover:

- Successful processing from pending to sent.
- Duplicate due IDs where only one claim succeeds.
- Skipping cancelled reminders.
- Retry count and backoff scheduling after delivery failure.
- Dead-letter insertion after retry exhaustion.

Run them with:

```sh
go test ./backend/internal/workers -cover
```

## Local Verification

Run the worker with:

```sh
make worker
```

Run tests with:

```sh
go test ./...
```
