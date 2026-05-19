package queries

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

const listFailedReminderJobsSQL = `
SELECT id::text, COALESCE(reminder_id::text, '') AS reminder_id, error_message, retry_count, payload, failed_at
FROM failed_reminder_jobs
ORDER BY failed_at DESC
`

// ListFailedReminderJobs returns all failed_reminder_jobs ordered by failed_at DESC.
func (q *Queries) ListFailedReminderJobs(ctx context.Context) ([]FailedReminderJob, error) {
	rows, err := q.db.Query(ctx, listFailedReminderJobsSQL)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []FailedReminderJob{}
	for rows.Next() {
		var (
			id           string
			reminderID   interface{}
			errorMessage string
			retryCount   int32
			payload      []byte
			failedAt     pgtype.Timestamptz
		)
		if err := rows.Scan(&id, &reminderID, &errorMessage, &retryCount, &payload, &failedAt); err != nil {
			return nil, err
		}
		items = append(items, FailedReminderJob{
			ID:           id,
			ReminderID:   ptrFromString(reminderID),
			ErrorMessage: errorMessage,
			RetryCount:   retryCount,
			Payload:      payload,
			FailedAt:     timeFrom(failedAt),
		})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const resetReminderForRetrySQL = `
UPDATE reminders
SET status = 'pending', retry_count = 0, last_error = NULL, updated_at = now()
WHERE id = $1::uuid AND status = 'failed'
RETURNING id::text, application_id::text, COALESCE(contact_id::text, '') AS contact_id, title,
    description, due_at, status, idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at
`

// ResetReminderForRetry resets a failed reminder to pending status.
// Returns pgx.ErrNoRows if the reminder is not in 'failed' status.
func (q *Queries) ResetReminderForRetry(ctx context.Context, id string) (Reminder, error) {
	row := q.db.QueryRow(ctx, resetReminderForRetrySQL, id)

	var (
		rID            string
		applicationID  string
		contactID      interface{}
		title          string
		description    *string
		dueAt          pgtype.Timestamptz
		status         string
		idempotencyKey string
		retryCount     int32
		lastError      *string
		deliveredAt    *time.Time
		createdAt      pgtype.Timestamptz
		updatedAt      pgtype.Timestamptz
	)

	err := row.Scan(
		&rID,
		&applicationID,
		&contactID,
		&title,
		&description,
		&dueAt,
		&status,
		&idempotencyKey,
		&retryCount,
		&lastError,
		&deliveredAt,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return Reminder{}, pgx.ErrNoRows
		}
		return Reminder{}, err
	}

	return reminderFrom(rID, applicationID, contactID, title, description, dueAt, status, idempotencyKey, retryCount, lastError, deliveredAt, createdAt, updatedAt), nil
}
