// Package workers contains long-running background processors for asynchronous
// CareerOS workflows.
package workers

import (
	"context"
	"time"

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
			w.Logger.Debug().Msg("reminder worker tick")
		}
	}
}
