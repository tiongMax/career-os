package app

import (
	"time"

	pgstore "careeros/backend/internal/persistence/postgres"
	aianalysissvc "careeros/backend/internal/services/aianalysis"
	"careeros/backend/internal/workers"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

type WorkerConfig struct {
	ReminderWorkerPollInterval   time.Duration
	ReminderMaxRetries           int
	AIAnalysisWorkerPollInterval time.Duration
	AIAnalysisMaxRetries         int
	GeminiAPIKey                 string
	GeminiModel                  string
	GeminiEmbeddingModel         string
	GeminiBaseURL                string
	GeminiTimeout                time.Duration
}

type Workers struct {
	Reminder workers.ReminderWorker
	Analysis *workers.AnalysisWorker
}

func NewWorkers(postgres *pgxpool.Pool, redisClient *redis.Client, log zerolog.Logger, cfg WorkerConfig) Workers {
	result := Workers{
		Reminder: workers.ReminderWorker{
			Postgres:     postgres,
			Redis:        redisClient,
			Logger:       log,
			PollInterval: cfg.ReminderWorkerPollInterval,
			MaxRetries:   cfg.ReminderMaxRetries,
		},
	}
	if cfg.GeminiAPIKey == "" {
		return result
	}

	store := pgstore.New(postgres)
	provider := aianalysissvc.NewGeminiProviderWithEmbeddingAndTimeout(
		cfg.GeminiAPIKey,
		cfg.GeminiModel,
		cfg.GeminiEmbeddingModel,
		cfg.GeminiBaseURL,
		cfg.GeminiTimeout,
	)
	result.Analysis = &workers.AnalysisWorker{
		Service:      aianalysissvc.NewProcessor(store, provider, cfg.AIAnalysisMaxRetries),
		Logger:       log,
		PollInterval: cfg.AIAnalysisWorkerPollInterval,
	}
	return result
}
