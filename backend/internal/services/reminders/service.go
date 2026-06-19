// Package reminders contains reminder validation and scheduling behavior.
package reminders

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"careeros/backend/internal/db/queries"
	reminderdomain "careeros/backend/internal/domain/reminders"
)

const (
	// StatusPending means a reminder is waiting for its due time.
	StatusPending = "pending"
	// StatusProcessing means a worker has claimed the reminder for delivery.
	StatusProcessing = "processing"
	// StatusSent means delivery completed successfully.
	StatusSent = "sent"
	// StatusFailed means delivery exhausted its retry budget.
	StatusFailed = "failed"
	// StatusCancelled means the user cancelled the reminder before delivery.
	StatusCancelled = "cancelled"
)

var (
	// ErrTitleRequired is returned when a reminder title is blank.
	ErrTitleRequired = errors.New("reminder title is required")
	// ErrDueAtRequired is returned when a reminder due_at timestamp is absent.
	ErrDueAtRequired = errors.New("reminder due_at is required")
)

// Store is the persistence boundary required by Service.
type Store interface {
	CreateReminder(context.Context, queries.CreateReminderParams) (queries.Reminder, error)
	ListReminders(context.Context) ([]queries.Reminder, error)
	ListDueReminders(context.Context, time.Time) ([]queries.Reminder, error)
	GetReminder(context.Context, string) (queries.Reminder, error)
	UpdateReminder(context.Context, queries.UpdateReminderParams) (queries.Reminder, error)
	UpdateReminderStatus(context.Context, string, string) (queries.Reminder, error)
	DeleteReminder(context.Context, string) error
	ListFailedReminderJobs(context.Context) ([]queries.FailedReminderJob, error)
	ResetReminderForRetry(context.Context, string) (queries.Reminder, error)
}

// Scheduler schedules and unschedules durable reminders in the async work
// queue. Redis is the production implementation.
type Scheduler interface {
	ScheduleReminder(context.Context, queries.Reminder) error
	UnscheduleReminder(context.Context, string) error
}

// Service validates reminder input, owns idempotency-key creation, and keeps
// the scheduler in sync with pending reminder rows.
type Service struct {
	store     Store
	scheduler Scheduler
	now       func() time.Time
}

// New builds a reminder service backed by store and scheduler.
func New(store Store, scheduler Scheduler) *Service {
	return &Service{store: store, scheduler: scheduler, now: time.Now}
}

// Create validates, persists, and schedules a reminder.
func (s *Service) Create(ctx context.Context, arg queries.CreateReminderParams) (reminderdomain.Reminder, error) {
	if strings.TrimSpace(arg.Title) == "" {
		return reminderdomain.Reminder{}, ErrTitleRequired
	}
	if arg.DueAt.IsZero() {
		return reminderdomain.Reminder{}, ErrDueAtRequired
	}
	key, err := newIdempotencyKey()
	if err != nil {
		return reminderdomain.Reminder{}, err
	}
	arg.IdempotencyKey = key

	reminder, err := s.store.CreateReminder(ctx, arg)
	if err != nil {
		return reminderdomain.Reminder{}, err
	}
	if s.scheduler != nil {
		if err := s.scheduler.ScheduleReminder(ctx, reminder); err != nil {
			return reminderdomain.Reminder{}, err
		}
	}
	return reminderFromStore(reminder), nil
}

// List returns all reminders ordered by the query layer.
func (s *Service) List(ctx context.Context) ([]reminderdomain.Reminder, error) {
	reminders, err := s.store.ListReminders(ctx)
	if err != nil {
		return nil, err
	}
	return remindersFromStore(reminders), nil
}

// ListDue returns pending reminders whose due_at is not later than now.
func (s *Service) ListDue(ctx context.Context) ([]reminderdomain.Reminder, error) {
	reminders, err := s.store.ListDueReminders(ctx, s.now())
	if err != nil {
		return nil, err
	}
	return remindersFromStore(reminders), nil
}

// Get returns one reminder by ID.
func (s *Service) Get(ctx context.Context, id string) (reminderdomain.Reminder, error) {
	reminder, err := s.store.GetReminder(ctx, id)
	return reminderFromStore(reminder), err
}

// Update validates mutable reminder fields and reschedules pending reminders
// when their persisted values change.
func (s *Service) Update(ctx context.Context, arg queries.UpdateReminderParams) (reminderdomain.Reminder, error) {
	if arg.Title != nil && strings.TrimSpace(*arg.Title) == "" {
		return reminderdomain.Reminder{}, ErrTitleRequired
	}
	if arg.DueAt != nil && arg.DueAt.IsZero() {
		return reminderdomain.Reminder{}, ErrDueAtRequired
	}
	reminder, err := s.store.UpdateReminder(ctx, arg)
	if err != nil {
		return reminderdomain.Reminder{}, err
	}
	if reminder.Status == StatusPending && s.scheduler != nil {
		if err := s.scheduler.ScheduleReminder(ctx, reminder); err != nil {
			return reminderdomain.Reminder{}, err
		}
	}
	return reminderFromStore(reminder), nil
}

// Cancel marks a reminder cancelled and removes it from the scheduler.
func (s *Service) Cancel(ctx context.Context, id string) (reminderdomain.Reminder, error) {
	reminder, err := s.store.UpdateReminderStatus(ctx, id, StatusCancelled)
	if err != nil {
		return reminderdomain.Reminder{}, err
	}
	if s.scheduler != nil {
		if err := s.scheduler.UnscheduleReminder(ctx, id); err != nil {
			return reminderdomain.Reminder{}, err
		}
	}
	return reminderFromStore(reminder), nil
}

// Delete removes a reminder from the scheduler before deleting its row.
func (s *Service) Delete(ctx context.Context, id string) error {
	if s.scheduler != nil {
		if err := s.scheduler.UnscheduleReminder(ctx, id); err != nil {
			return err
		}
	}
	return s.store.DeleteReminder(ctx, id)
}

// ListFailed returns all failed reminder jobs ordered by failed_at DESC.
func (s *Service) ListFailed(ctx context.Context) ([]reminderdomain.FailedJob, error) {
	jobs, err := s.store.ListFailedReminderJobs(ctx)
	if err != nil {
		return nil, err
	}
	return failedJobsFromStore(jobs), nil
}

// Retry resets a failed reminder to pending and re-enqueues it in Redis.
// Returns pgx.ErrNoRows if the reminder is not in 'failed' status.
func (s *Service) Retry(ctx context.Context, id string) (reminderdomain.Reminder, error) {
	reminder, err := s.store.ResetReminderForRetry(ctx, id)
	if err != nil {
		return reminderdomain.Reminder{}, err
	}
	if s.scheduler != nil {
		if err := s.scheduler.ScheduleReminder(ctx, reminder); err != nil {
			return reminderdomain.Reminder{}, err
		}
	}
	return reminderFromStore(reminder), nil
}

func newIdempotencyKey() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", fmt.Errorf("generate reminder idempotency key: %w", err)
	}
	return hex.EncodeToString(b[:]), nil
}

func reminderFromStore(reminder queries.Reminder) reminderdomain.Reminder {
	return reminderdomain.Reminder{
		ID:             reminder.ID,
		ApplicationID:  reminder.ApplicationID,
		ContactID:      reminder.ContactID,
		Title:          reminder.Title,
		Description:    reminder.Description,
		DueAt:          reminder.DueAt,
		Status:         reminder.Status,
		IdempotencyKey: reminder.IdempotencyKey,
		RetryCount:     reminder.RetryCount,
		LastError:      reminder.LastError,
		DeliveredAt:    reminder.DeliveredAt,
		CreatedAt:      reminder.CreatedAt,
		UpdatedAt:      reminder.UpdatedAt,
	}
}

func remindersFromStore(reminders []queries.Reminder) []reminderdomain.Reminder {
	out := make([]reminderdomain.Reminder, 0, len(reminders))
	for _, reminder := range reminders {
		out = append(out, reminderFromStore(reminder))
	}
	return out
}

func failedJobFromStore(job queries.FailedReminderJob) reminderdomain.FailedJob {
	return reminderdomain.FailedJob{
		ID:           job.ID,
		ReminderID:   job.ReminderID,
		ErrorMessage: job.ErrorMessage,
		RetryCount:   job.RetryCount,
		Payload:      job.Payload,
		FailedAt:     job.FailedAt,
	}
}

func failedJobsFromStore(jobs []queries.FailedReminderJob) []reminderdomain.FailedJob {
	out := make([]reminderdomain.FailedJob, 0, len(jobs))
	for _, job := range jobs {
		out = append(out, failedJobFromStore(job))
	}
	return out
}
