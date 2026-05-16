// Package workers contains long-running background processors for asynchronous
// CareerOS workflows.
package workers

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"careeros/backend/internal/db/queries"
	remindersvc "careeros/backend/internal/services/reminders"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

// ReminderWorker polls for reminder work and coordinates retry behavior.
type ReminderWorker struct {
	// Postgres is the durable store for reminders and delivery state.
	Postgres *pgxpool.Pool
	// Redis is reserved for queueing, leases, or short-lived worker state.
	Redis *redis.Client
	// Logger emits structured lifecycle and processing events.
	Logger zerolog.Logger
	// PollInterval controls how often the worker checks for due reminders.
	PollInterval time.Duration
	// MaxRetries caps failed delivery attempts for an individual reminder.
	MaxRetries int
	// Deliver simulates or performs notification delivery. Nil means success.
	Deliver func(context.Context, queries.Reminder) error
	store   reminderStore
	queue   reminderQueue
}

type reminderStore interface {
	GetReminder(context.Context, string) (queries.Reminder, error)
	UpdateReminderStatus(context.Context, string, string) (queries.Reminder, error)
	CreateReminderDelivery(context.Context, queries.Reminder) (queries.ReminderDelivery, error)
	MarkReminderSent(context.Context, string) (queries.Reminder, error)
	MarkReminderRetry(context.Context, queries.MarkReminderRetryParams) (queries.Reminder, error)
	CreateFailedReminderJob(context.Context, queries.CreateFailedReminderJobParams) (queries.FailedReminderJob, error)
}

type reminderQueue interface {
	DueReminderIDs(context.Context, time.Time) ([]string, error)
	ClaimReminder(context.Context, string) (bool, error)
	ScheduleReminder(context.Context, string, time.Time) error
}

// Run starts the reminder polling loop and blocks until the context is
// canceled or an unrecoverable worker error occurs.
func (w ReminderWorker) Run(ctx context.Context) error {
	ticker := time.NewTicker(w.PollInterval)
	defer ticker.Stop()

	w.Logger.Info().Dur("poll_interval", w.PollInterval).Int("max_retries", w.MaxRetries).Msg("reminder worker started")

	for {
		select {
		case <-ctx.Done():
			w.Logger.Info().Msg("reminder worker stopped")
			return ctx.Err()
		case <-ticker.C:
			if err := w.ProcessDue(ctx); err != nil {
				w.Logger.Error().Err(err).Msg("process due reminders")
			}
		}
	}
}

// ProcessDue claims due reminder IDs from the scheduler and processes each
// claimed reminder. Item-level delivery failures are logged and converted into
// retry or dead-letter state so one failed reminder does not stop the batch.
func (w ReminderWorker) ProcessDue(ctx context.Context) error {
	queue := w.reminderQueue()
	dueIDs, err := queue.DueReminderIDs(ctx, time.Now())
	if err != nil {
		return err
	}

	store := w.reminderStore()
	for _, id := range dueIDs {
		claimed, err := queue.ClaimReminder(ctx, id)
		if err != nil {
			return err
		}
		if !claimed {
			continue
		}
		if err := w.processOne(ctx, store, id); err != nil {
			w.Logger.Error().Err(err).Str("reminder_id", id).Msg("process reminder")
		}
	}
	return nil
}

func (w ReminderWorker) processOne(ctx context.Context, store reminderStore, id string) error {
	reminder, err := store.GetReminder(ctx, id)
	if err != nil {
		return err
	}
	if reminder.Status != remindersvc.StatusPending {
		return nil
	}

	reminder, err = store.UpdateReminderStatus(ctx, id, remindersvc.StatusProcessing)
	if err != nil {
		return err
	}

	if _, err := store.CreateReminderDelivery(ctx, reminder); err != nil {
		return w.handleFailure(ctx, store, reminder, err)
	}
	if err := w.deliver(ctx, reminder); err != nil {
		return w.handleFailure(ctx, store, reminder, err)
	}
	if _, err := store.MarkReminderSent(ctx, reminder.ID); err != nil {
		return w.handleFailure(ctx, store, reminder, err)
	}
	w.Logger.Info().Str("reminder_id", reminder.ID).Msg("reminder processed")
	return nil
}

func (w ReminderWorker) deliver(ctx context.Context, reminder queries.Reminder) error {
	if w.Deliver == nil {
		return nil
	}
	return w.Deliver(ctx, reminder)
}

func (w ReminderWorker) handleFailure(ctx context.Context, store reminderStore, reminder queries.Reminder, cause error) error {
	nextRetry := reminder.RetryCount + 1
	if int(nextRetry) >= w.maxRetries() {
		payload, err := json.Marshal(map[string]string{
			"reminder_id": reminder.ID,
			"title":       reminder.Title,
			"due_at":      reminder.DueAt.Format(time.RFC3339),
		})
		if err != nil {
			return err
		}
		if _, err := store.MarkReminderRetry(ctx, queries.MarkReminderRetryParams{
			ID:         reminder.ID,
			Status:     remindersvc.StatusFailed,
			RetryCount: nextRetry,
			LastError:  cause.Error(),
		}); err != nil {
			return err
		}
		if _, err := store.CreateFailedReminderJob(ctx, queries.CreateFailedReminderJobParams{
			ReminderID:   &reminder.ID,
			ErrorMessage: cause.Error(),
			RetryCount:   nextRetry,
			Payload:      payload,
		}); err != nil {
			return err
		}
		return fmt.Errorf("reminder failed after %d retries: %w", nextRetry, cause)
	}

	updated, err := store.MarkReminderRetry(ctx, queries.MarkReminderRetryParams{
		ID:         reminder.ID,
		Status:     remindersvc.StatusPending,
		RetryCount: nextRetry,
		LastError:  cause.Error(),
	})
	if err != nil {
		return err
	}
	nextDue := time.Now().Add(backoffForRetry(nextRetry))
	if err := w.reminderQueue().ScheduleReminder(ctx, updated.ID, nextDue); err != nil {
		return err
	}
	return fmt.Errorf("reminder rescheduled after failure: %w", cause)
}

func (w ReminderWorker) reminderStore() reminderStore {
	if w.store != nil {
		return w.store
	}
	return queries.New(w.Postgres)
}

func (w ReminderWorker) reminderQueue() reminderQueue {
	if w.queue != nil {
		return w.queue
	}
	return redisReminderQueue{client: w.Redis}
}

type redisReminderQueue struct {
	client *redis.Client
}

func (q redisReminderQueue) DueReminderIDs(ctx context.Context, now time.Time) ([]string, error) {
	return q.client.ZRangeByScore(ctx, remindersvc.ScheduledSetKey, &redis.ZRangeBy{
		Min: "-inf",
		Max: strconv.FormatInt(now.Unix(), 10),
	}).Result()
}

func (q redisReminderQueue) ClaimReminder(ctx context.Context, id string) (bool, error) {
	removed, err := q.client.ZRem(ctx, remindersvc.ScheduledSetKey, id).Result()
	return removed > 0, err
}

func (q redisReminderQueue) ScheduleReminder(ctx context.Context, id string, dueAt time.Time) error {
	return q.client.ZAdd(ctx, remindersvc.ScheduledSetKey, redis.Z{
		Score:  float64(dueAt.Unix()),
		Member: id,
	}).Err()
}

func (w ReminderWorker) maxRetries() int {
	if w.MaxRetries <= 0 {
		return 3
	}
	return w.MaxRetries
}

func backoffForRetry(retryCount int32) time.Duration {
	switch retryCount {
	case 1:
		return 30 * time.Second
	case 2:
		return 2 * time.Minute
	default:
		return 5 * time.Minute
	}
}
