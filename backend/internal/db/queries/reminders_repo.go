package queries

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

func (q *Queries) CreateReminder(ctx context.Context, arg CreateReminderParams) (Reminder, error) {
	row, err := q.CreateReminderSQL(ctx, CreateReminderSQLParams{ApplicationID: arg.ApplicationID, ContactID: arg.ContactID, Title: arg.Title, Description: arg.Description, DueAt: pgtype.Timestamptz{Time: arg.DueAt, Valid: true}, IdempotencyKey: arg.IdempotencyKey})
	return reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) ListReminders(ctx context.Context) ([]Reminder, error) {
	rows, err := q.ListRemindersSQL(ctx)
	if err != nil {
		return nil, err
	}
	reminders := make([]Reminder, 0, len(rows))
	for _, row := range rows {
		reminders = append(reminders, reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt))
	}
	return reminders, nil
}

func (q *Queries) ListDueReminders(ctx context.Context, now time.Time) ([]Reminder, error) {
	rows, err := q.ListDueRemindersSQL(ctx, pgtype.Timestamptz{Time: now, Valid: true})
	if err != nil {
		return nil, err
	}
	reminders := make([]Reminder, 0, len(rows))
	for _, row := range rows {
		reminders = append(reminders, reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt))
	}
	return reminders, nil
}

func (q *Queries) GetReminder(ctx context.Context, id string) (Reminder, error) {
	row, err := q.GetReminderSQL(ctx, id)
	return reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateReminder(ctx context.Context, arg UpdateReminderParams) (Reminder, error) {
	row, err := q.UpdateReminderSQL(ctx, arg)
	return reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateReminderStatus(ctx context.Context, id string, status string) (Reminder, error) {
	row, err := q.UpdateReminderStatusSQL(ctx, UpdateReminderStatusSQLParams{ID: id, Status: status})
	return reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) MarkReminderSent(ctx context.Context, id string) (Reminder, error) {
	row, err := q.MarkReminderSentSQL(ctx, id)
	return reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) MarkReminderRetry(ctx context.Context, arg MarkReminderRetryParams) (Reminder, error) {
	row, err := q.MarkReminderRetrySQL(ctx, MarkReminderRetrySQLParams{ID: arg.ID, Status: arg.Status, RetryCount: arg.RetryCount, LastError: &arg.LastError})
	return reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) DeleteReminder(ctx context.Context, id string) error {
	return ensureRows(q.DeleteReminderRowCount(ctx, id))
}

func (q *Queries) CreateReminderDelivery(ctx context.Context, reminder Reminder) (ReminderDelivery, error) {
	row, err := q.CreateReminderDeliverySQL(ctx, CreateReminderDeliverySQLParams{ReminderID: reminder.ID, IdempotencyKey: reminder.IdempotencyKey})
	return ReminderDelivery{ID: row.ID, ReminderID: row.ReminderID, IdempotencyKey: row.IdempotencyKey, DeliveredAt: timeFrom(row.DeliveredAt), CreatedAt: timeFrom(row.CreatedAt)}, err
}

func (q *Queries) ListRemindersByApplication(ctx context.Context, applicationID string) ([]Reminder, error) {
	const sql = `SELECT id::text, application_id::text, COALESCE(contact_id::text, '') AS contact_id, title, description, due_at, status, idempotency_key, retry_count, last_error, delivered_at, created_at, updated_at FROM reminders WHERE application_id = $1::uuid ORDER BY due_at`
	rows, err := q.db.Query(ctx, sql, applicationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	reminders := make([]Reminder, 0)
	for rows.Next() {
		var id, appID, idempotencyKey, status string
		var contactID interface{}
		var title string
		var description, lastError *string
		var retryCount int32
		var dueAt, createdAt, updatedAt pgtype.Timestamptz
		var deliveredAt *time.Time
		if err := rows.Scan(&id, &appID, &contactID, &title, &description, &dueAt, &status, &idempotencyKey, &retryCount, &lastError, &deliveredAt, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		reminders = append(reminders, reminderFrom(id, appID, contactID, title, description, dueAt, status, idempotencyKey, retryCount, lastError, deliveredAt, createdAt, updatedAt))
	}
	return reminders, rows.Err()
}
