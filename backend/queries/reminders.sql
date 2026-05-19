-- name: CreateReminderSQL :one
INSERT INTO reminders (application_id, contact_id, title, description, due_at, idempotency_key)
VALUES (
    sqlc.arg(application_id)::uuid,
    sqlc.narg(contact_id)::uuid,
    sqlc.arg(title),
    sqlc.narg(description),
    sqlc.arg(due_at),
    sqlc.arg(idempotency_key)
)
RETURNING id::text, application_id::text, COALESCE(contact_id::text, '') AS contact_id, title, description, due_at, status,
    idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at;

-- name: ListRemindersSQL :many
SELECT id::text, application_id::text, COALESCE(contact_id::text, '') AS contact_id, title, description, due_at, status,
    idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at
FROM reminders
ORDER BY due_at ASC, created_at DESC;

-- name: ListDueRemindersSQL :many
SELECT id::text, application_id::text, COALESCE(contact_id::text, '') AS contact_id, title, description, due_at, status,
    idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at
FROM reminders
WHERE status = 'pending' AND due_at <= sqlc.arg(now)
ORDER BY due_at ASC;

-- name: GetReminderSQL :one
SELECT id::text, application_id::text, COALESCE(contact_id::text, '') AS contact_id, title, description, due_at, status,
    idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at
FROM reminders
WHERE id = sqlc.arg(id)::uuid;

-- name: UpdateReminderSQL :one
UPDATE reminders
SET
    application_id = COALESCE(sqlc.narg(application_id)::uuid, application_id),
    contact_id = COALESCE(sqlc.narg(contact_id)::uuid, contact_id),
    title = COALESCE(sqlc.narg(title), title),
    description = COALESCE(sqlc.narg(description), description),
    due_at = COALESCE(sqlc.narg(due_at), due_at),
    updated_at = now()
WHERE id = sqlc.arg(id)::uuid
RETURNING id::text, application_id::text, COALESCE(contact_id::text, '') AS contact_id, title, description, due_at, status,
    idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at;

-- name: UpdateReminderStatusSQL :one
UPDATE reminders
SET status = sqlc.arg(status), updated_at = now()
WHERE id = sqlc.arg(id)::uuid
RETURNING id::text, application_id::text, COALESCE(contact_id::text, '') AS contact_id, title, description, due_at, status,
    idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at;

-- name: MarkReminderSentSQL :one
UPDATE reminders
SET status = 'sent', delivered_at = now(), last_error = NULL, updated_at = now()
WHERE id = sqlc.arg(id)::uuid
RETURNING id::text, application_id::text, COALESCE(contact_id::text, '') AS contact_id, title, description, due_at, status,
    idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at;

-- name: MarkReminderRetrySQL :one
UPDATE reminders
SET status = sqlc.arg(status), retry_count = sqlc.arg(retry_count), last_error = sqlc.arg(last_error), updated_at = now()
WHERE id = sqlc.arg(id)::uuid
RETURNING id::text, application_id::text, COALESCE(contact_id::text, '') AS contact_id, title, description, due_at, status,
    idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at;

-- name: DeleteReminderRowCount :execrows
DELETE FROM reminders
WHERE id = $1::uuid;

-- name: CreateReminderDeliverySQL :one
INSERT INTO reminder_deliveries (reminder_id, idempotency_key)
VALUES (sqlc.arg(reminder_id)::uuid, sqlc.arg(idempotency_key))
ON CONFLICT (idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
RETURNING id::text, reminder_id::text, idempotency_key, delivered_at, created_at;

-- name: CreateFailedReminderJobSQL :one
INSERT INTO failed_reminder_jobs (reminder_id, error_message, retry_count, payload)
VALUES (sqlc.narg(reminder_id)::uuid, sqlc.arg(error_message), sqlc.arg(retry_count), sqlc.arg(payload)::jsonb)
RETURNING id::text, COALESCE(reminder_id::text, '') AS reminder_id, error_message, retry_count, payload, failed_at;
