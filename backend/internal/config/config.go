package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	AppEnv                     string
	APIPort                    string
	DatabaseURL                string
	RedisURL                   string
	ReminderWorkerPollInterval time.Duration
	ReminderMaxRetries         int
	LogLevel                   string
}

func Load() (Config, error) {
	maxRetries, err := getInt("REMINDER_MAX_RETRIES", 3)
	if err != nil {
		return Config{}, err
	}

	pollIntervalMS, err := getInt("REMINDER_WORKER_POLL_INTERVAL_MS", 1000)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		AppEnv:                     getString("APP_ENV", "development"),
		APIPort:                    getString("API_PORT", "8080"),
		DatabaseURL:                getString("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/careeros?sslmode=disable"),
		RedisURL:                   getString("REDIS_URL", "redis://localhost:6379"),
		ReminderWorkerPollInterval: time.Duration(pollIntervalMS) * time.Millisecond,
		ReminderMaxRetries:         maxRetries,
		LogLevel:                   getString("LOG_LEVEL", "info"),
	}

	return cfg, nil
}

func (c Config) APIAddress() string {
	return ":" + c.APIPort
}

func getString(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

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
