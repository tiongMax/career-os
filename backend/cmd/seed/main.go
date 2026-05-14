package main

import (
	"careeros/backend/internal/config"
	"careeros/backend/internal/logger"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	log := logger.Configure(cfg.LogLevel, cfg.AppEnv)
	log.Info().Msg("seed command placeholder: seed data will be added after core APIs exist")
}
