package queries

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

type CreateReminderParams struct {
	ApplicationID  string    `json:"application_id"`
	ContactID      *string   `json:"contact_id"`
	Title          string    `json:"title"`
	Description    *string   `json:"description"`
	DueAt          time.Time `json:"due_at"`
	IdempotencyKey string    `json:"-"`
}

type UpdateReminderParams struct {
	ID            string     `json:"-"`
	ApplicationID *string    `json:"application_id"`
	ContactID     *string    `json:"contact_id"`
	Title         *string    `json:"title"`
	Description   *string    `json:"description"`
	DueAt         *time.Time `json:"due_at"`
}

type MarkReminderRetryParams struct {
	ID         string
	Status     string
	RetryCount int32
	LastError  string
}

type CreateFailedReminderJobParams struct {
	ReminderID   *string
	ErrorMessage string
	RetryCount   int32
	Payload      json.RawMessage
}

func (q *Queries) CreateReminder(ctx context.Context, arg CreateReminderParams) (Reminder, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO reminders (application_id, contact_id, title, description, due_at, idempotency_key)
		VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
		RETURNING id::text, application_id::text, contact_id::text, title, description, due_at, status,
			idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at
	`, arg.ApplicationID, arg.ContactID, arg.Title, arg.Description, arg.DueAt, arg.IdempotencyKey)
	return scanReminder(row)
}

func (q *Queries) ListReminders(ctx context.Context) ([]Reminder, error) {
	rows, err := q.db.Query(ctx, `
		SELECT id::text, application_id::text, contact_id::text, title, description, due_at, status,
			idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at
		FROM reminders
		ORDER BY due_at ASC, created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanReminders(rows)
}

func (q *Queries) ListDueReminders(ctx context.Context, now time.Time) ([]Reminder, error) {
	rows, err := q.db.Query(ctx, `
		SELECT id::text, application_id::text, contact_id::text, title, description, due_at, status,
			idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at
		FROM reminders
		WHERE status = 'pending' AND due_at <= $1
		ORDER BY due_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanReminders(rows)
}

func (q *Queries) GetReminder(ctx context.Context, id string) (Reminder, error) {
	row := q.db.QueryRow(ctx, `
		SELECT id::text, application_id::text, contact_id::text, title, description, due_at, status,
			idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at
		FROM reminders
		WHERE id = $1::uuid
	`, id)
	return scanReminder(row)
}

func (q *Queries) UpdateReminder(ctx context.Context, arg UpdateReminderParams) (Reminder, error) {
	row := q.db.QueryRow(ctx, `
		UPDATE reminders
		SET
			application_id = COALESCE($2::uuid, application_id),
			contact_id = COALESCE($3::uuid, contact_id),
			title = COALESCE($4, title),
			description = COALESCE($5, description),
			due_at = COALESCE($6, due_at),
			updated_at = now()
		WHERE id = $1::uuid
		RETURNING id::text, application_id::text, contact_id::text, title, description, due_at, status,
			idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at
	`, arg.ID, arg.ApplicationID, arg.ContactID, arg.Title, arg.Description, arg.DueAt)
	return scanReminder(row)
}

func (q *Queries) UpdateReminderStatus(ctx context.Context, id string, status string) (Reminder, error) {
	row := q.db.QueryRow(ctx, `
		UPDATE reminders
		SET status = $2, updated_at = now()
		WHERE id = $1::uuid
		RETURNING id::text, application_id::text, contact_id::text, title, description, due_at, status,
			idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at
	`, id, status)
	return scanReminder(row)
}

func (q *Queries) MarkReminderSent(ctx context.Context, id string) (Reminder, error) {
	row := q.db.QueryRow(ctx, `
		UPDATE reminders
		SET status = 'sent', delivered_at = now(), last_error = NULL, updated_at = now()
		WHERE id = $1::uuid
		RETURNING id::text, application_id::text, contact_id::text, title, description, due_at, status,
			idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at
	`, id)
	return scanReminder(row)
}

func (q *Queries) MarkReminderRetry(ctx context.Context, arg MarkReminderRetryParams) (Reminder, error) {
	row := q.db.QueryRow(ctx, `
		UPDATE reminders
		SET status = $2, retry_count = $3, last_error = $4, updated_at = now()
		WHERE id = $1::uuid
		RETURNING id::text, application_id::text, contact_id::text, title, description, due_at, status,
			idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at
	`, arg.ID, arg.Status, arg.RetryCount, arg.LastError)
	return scanReminder(row)
}

func (q *Queries) DeleteReminder(ctx context.Context, id string) error {
	tag, err := q.db.Exec(ctx, `DELETE FROM reminders WHERE id = $1::uuid`, id)
	if err != nil {
		return err
	}
	return ensureAffected(tag)
}

func (q *Queries) CreateReminderDelivery(ctx context.Context, reminder Reminder) (ReminderDelivery, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO reminder_deliveries (reminder_id, idempotency_key)
		VALUES ($1::uuid, $2)
		ON CONFLICT (idempotency_key) DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
		RETURNING id::text, reminder_id::text, idempotency_key, delivered_at, created_at
	`, reminder.ID, reminder.IdempotencyKey)
	return scanReminderDelivery(row)
}

func (q *Queries) CreateFailedReminderJob(ctx context.Context, arg CreateFailedReminderJobParams) (FailedReminderJob, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO failed_reminder_jobs (reminder_id, error_message, retry_count, payload)
		VALUES ($1::uuid, $2, $3, $4::jsonb)
		RETURNING id::text, reminder_id::text, error_message, retry_count, payload, failed_at
	`, arg.ReminderID, arg.ErrorMessage, arg.RetryCount, arg.Payload)
	return scanFailedReminderJob(row)
}

type reminderScanner interface {
	Scan(dest ...any) error
}

func scanReminders(rows interface {
	Next() bool
	Err() error
	Scan(dest ...any) error
}) ([]Reminder, error) {
	var reminders []Reminder
	for rows.Next() {
		reminder, err := scanReminder(rows)
		if err != nil {
			return nil, err
		}
		reminders = append(reminders, reminder)
	}
	return reminders, rows.Err()
}

func scanReminder(row reminderScanner) (Reminder, error) {
	var reminder Reminder
	var contactID, description, lastError sql.NullString
	var deliveredAt sql.NullTime
	err := row.Scan(
		&reminder.ID,
		&reminder.ApplicationID,
		&contactID,
		&reminder.Title,
		&description,
		&reminder.DueAt,
		&reminder.Status,
		&reminder.IdempotencyKey,
		&reminder.RetryCount,
		&lastError,
		&deliveredAt,
		&reminder.CreatedAt,
		&reminder.UpdatedAt,
	)
	reminder.ContactID = nullStringPtr(contactID)
	reminder.Description = nullStringPtr(description)
	reminder.LastError = nullStringPtr(lastError)
	reminder.DeliveredAt = nullTimePtr(deliveredAt)
	return reminder, err
}

type reminderDeliveryScanner interface {
	Scan(dest ...any) error
}

func scanReminderDelivery(row reminderDeliveryScanner) (ReminderDelivery, error) {
	var delivery ReminderDelivery
	err := row.Scan(
		&delivery.ID,
		&delivery.ReminderID,
		&delivery.IdempotencyKey,
		&delivery.DeliveredAt,
		&delivery.CreatedAt,
	)
	return delivery, err
}

type failedReminderJobScanner interface {
	Scan(dest ...any) error
}

func scanFailedReminderJob(row failedReminderJobScanner) (FailedReminderJob, error) {
	var failedJob FailedReminderJob
	var reminderID sql.NullString
	err := row.Scan(
		&failedJob.ID,
		&reminderID,
		&failedJob.ErrorMessage,
		&failedJob.RetryCount,
		&failedJob.Payload,
		&failedJob.FailedAt,
	)
	failedJob.ReminderID = nullStringPtr(reminderID)
	return failedJob, err
}
