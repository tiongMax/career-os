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
	"careeros/backend/internal/db/queries"
	"careeros/backend/internal/logger"
	aianalysissvc "careeros/backend/internal/services/aianalysis"
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

	errCh := make(chan error, 2)
	go func() {
		errCh <- worker.Run(ctx)
	}()

	if cfg.GeminiAPIKey == "" {
		log.Warn().Msg("analysis worker disabled because GEMINI_API_KEY is not set")
	} else {
		store := queries.New(postgres)
		provider := aianalysissvc.NewGeminiProviderWithEmbeddingAndTimeout(cfg.GeminiAPIKey, cfg.GeminiModel, cfg.GeminiEmbeddingModel, cfg.GeminiBaseURL, cfg.GeminiTimeout)
		analysisWorker := workers.AnalysisWorker{
			Service:      aianalysissvc.NewProcessor(store, provider, cfg.AIAnalysisMaxRetries),
			Logger:       log,
			PollInterval: cfg.AIAnalysisWorkerPollInterval,
		}
		go func() {
			errCh <- analysisWorker.Run(ctx)
		}()
	}

	if err := <-errCh; err != nil && !errors.Is(err, context.Canceled) {
		log.Fatal().Err(err).Msg("worker failed")
	}
}
