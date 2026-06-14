// Package config centralizes runtime configuration loaded from environment
// variables. It provides typed defaults for local development while surfacing
// malformed values early during process startup.
package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// Config contains all process-level settings required by the API, worker, and
// command-line utilities.
type Config struct {
	// AppEnv identifies the current deployment environment, such as
	// "development", "staging", or "production".
	AppEnv string
	// APIPort is the TCP port the HTTP API listens on.
	APIPort string
	// DatabaseURL is the PostgreSQL connection string used by pgx and goose.
	DatabaseURL string
	// RedisURL is the Redis connection string used by background services.
	RedisURL string
	// ReminderWorkerPollInterval controls how often the reminder worker wakes
	// up to look for due reminders.
	ReminderWorkerPollInterval time.Duration
	// ReminderMaxRetries is the maximum number of delivery attempts before a
	// reminder job should be treated as exhausted.
	ReminderMaxRetries int
	// AIAnalysisWorkerPollInterval controls how often the AI analysis worker
	// checks for queued jobs.
	AIAnalysisWorkerPollInterval time.Duration
	// AIAnalysisMaxRetries is the maximum analysis attempts before failure.
	AIAnalysisMaxRetries int
	// GeminiAPIKey authenticates calls to the Gemini API.
	GeminiAPIKey string
	// GeminiModel is the Gemini model used for structured analysis.
	GeminiModel string
	// GeminiEmbeddingModel is the Gemini model used for resume/JD embeddings.
	GeminiEmbeddingModel string
	// GeminiBaseURL is the Gemini API base URL, mostly useful for tests.
	GeminiBaseURL string
	// GeminiTimeout controls how long the worker waits for a Gemini response.
	GeminiTimeout time.Duration
	// LogLevel controls zerolog verbosity.
	LogLevel string
}

// Load reads configuration from environment variables and applies safe local
// defaults for values that are not set.
func Load() (Config, error) {
	maxRetries, err := getInt("REMINDER_MAX_RETRIES", 3)
	if err != nil {
		return Config{}, err
	}

	pollIntervalMS, err := getInt("REMINDER_WORKER_POLL_INTERVAL_MS", 1000)
	if err != nil {
		return Config{}, err
	}

	aiPollIntervalMS, err := getInt("AI_ANALYSIS_WORKER_POLL_INTERVAL_MS", 1000)
	if err != nil {
		return Config{}, err
	}

	aiMaxRetries, err := getInt("AI_ANALYSIS_MAX_RETRIES", 3)
	if err != nil {
		return Config{}, err
	}

	geminiTimeoutMS, err := getInt("GEMINI_TIMEOUT_MS", 90000)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		AppEnv:                       getString("APP_ENV", "development"),
		APIPort:                      getString("API_PORT", "8080"),
		DatabaseURL:                  getString("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/careeros?sslmode=disable"),
		RedisURL:                     getString("REDIS_URL", "redis://localhost:6379"),
		ReminderWorkerPollInterval:   time.Duration(pollIntervalMS) * time.Millisecond,
		ReminderMaxRetries:           maxRetries,
		AIAnalysisWorkerPollInterval: time.Duration(aiPollIntervalMS) * time.Millisecond,
		AIAnalysisMaxRetries:         aiMaxRetries,
		GeminiAPIKey:                 getString("GEMINI_API_KEY", ""),
		GeminiModel:                  getString("GEMINI_MODEL", "gemini-3.5-flash"),
		GeminiEmbeddingModel:         getString("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001"),
		GeminiBaseURL:                getString("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"),
		GeminiTimeout:                time.Duration(geminiTimeoutMS) * time.Millisecond,
		LogLevel:                     getString("LOG_LEVEL", "info"),
	}

	return cfg, nil
}

// APIAddress returns the net/http-compatible bind address for the API server.
func (c Config) APIAddress() string {
	return ":" + c.APIPort
}

// getString returns an environment variable value or fallback when the variable
// is unset.
func getString(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

// getInt parses an integer environment variable, returning fallback when the
// variable is unset.
func getInt(key string, fallback int) (int, error) {
	value := os.Getenv(key)
	if value == "" {
		return fallback, nil
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, fmt.Errorf("parse %s: %w", key, err)
	}

	return parsed, nil
}
