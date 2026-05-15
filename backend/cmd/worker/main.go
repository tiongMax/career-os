// Command worker starts the CareerOS background worker process.
package main

import (
	"context"
	"errors"
	"os"
	"os/signal"
	"syscall"

	"careeros/backend/internal/config"
	"careeros/backend/internal/db"
	"careeros/backend/internal/logger"
	"careeros/backend/internal/workers"
)

// main loads process configuration, initializes shared infrastructure clients,
// and runs the reminder worker until the process receives a shutdown signal.
func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	log := logger.Configure(cfg.LogLevel, cfg.AppEnv)

	postgres, err := db.NewPostgresPool(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("connect postgres")
	}
	defer postgres.Close()

	redisClient, err := db.NewRedisClient(ctx, cfg.RedisURL)
	if err != nil {
		log.Fatal().Err(err).Msg("connect redis")
	}
	defer redisClient.Close()

	worker := workers.ReminderWorker{
		Postgres:     postgres,
		Redis:        redisClient,
		Logger:       log,
		PollInterval: cfg.ReminderWorkerPollInterval,
		MaxRetries:   cfg.ReminderMaxRetries,
	}

	if err := worker.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		log.Fatal().Err(err).Msg("worker failed")
	}
}
