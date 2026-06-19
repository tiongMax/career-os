// Command worker starts the CareerOS background worker process.
package main

import (
	"context"
	"errors"
	"os"
	"os/signal"
	"syscall"

	"careeros/backend/internal/app"
	"careeros/backend/internal/config"
	"careeros/backend/internal/db"
	"careeros/backend/internal/logger"
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

	appWorkers := app.NewWorkers(postgres, redisClient, log, app.WorkerConfig{
		ReminderWorkerPollInterval:   cfg.ReminderWorkerPollInterval,
		ReminderMaxRetries:           cfg.ReminderMaxRetries,
		AIAnalysisWorkerPollInterval: cfg.AIAnalysisWorkerPollInterval,
		AIAnalysisMaxRetries:         cfg.AIAnalysisMaxRetries,
		GeminiAPIKey:                 cfg.GeminiAPIKey,
		GeminiModel:                  cfg.GeminiModel,
		GeminiEmbeddingModel:         cfg.GeminiEmbeddingModel,
		GeminiBaseURL:                cfg.GeminiBaseURL,
		GeminiTimeout:                cfg.GeminiTimeout,
	})

	errCh := make(chan error, 2)
	go func() {
		errCh <- appWorkers.Reminder.Run(ctx)
	}()

	if appWorkers.Analysis == nil {
		log.Warn().Msg("analysis worker disabled because GEMINI_API_KEY is not set")
	} else {
		go func() {
			errCh <- appWorkers.Analysis.Run(ctx)
		}()
	}

	if err := <-errCh; err != nil && !errors.Is(err, context.Canceled) {
		log.Fatal().Err(err).Msg("worker failed")
	}
}
