package logger

import (
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func Configure(level string, appEnv string) zerolog.Logger {
	parsedLevel, err := zerolog.ParseLevel(level)
	if err != nil {
		parsedLevel = zerolog.InfoLevel
	}

	zerolog.SetGlobalLevel(parsedLevel)
	zerolog.TimeFieldFormat = time.RFC3339

	if appEnv == "development" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: time.RFC3339})
	}

	return log.With().Str("service", "careeros").Logger()
}
