package workers

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

type ReminderWorker struct {
	Postgres     *pgxpool.Pool
	Redis        *redis.Client
	Logger       zerolog.Logger
	PollInterval time.Duration
	MaxRetries   int
}

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
