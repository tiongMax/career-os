// Command api starts the CareerOS HTTP API server.
package main

import (
	"context"
	"errors"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"careeros/backend/internal/config"
	"careeros/backend/internal/db"
	"careeros/backend/internal/httpapi"
	"careeros/backend/internal/logger"
)

// main loads process configuration, initializes shared infrastructure clients,
// and runs the HTTP server with graceful shutdown handling.
func main() {
	ctx := context.Background()

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

	server := &http.Server{
		Addr:              cfg.APIAddress(),
		Handler:           httpapi.NewRouter(log, postgres, redisClient),
		ReadHeaderTimeout: 5 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info().Str("addr", cfg.APIAddress()).Msg("api server started")
		errCh <- server.ListenAndServe()
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal().Err(err).Msg("api server failed")
		}
	case <-stop:
		log.Info().Msg("api server shutting down")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatal().Err(err).Msg("api server shutdown failed")
	}
}
