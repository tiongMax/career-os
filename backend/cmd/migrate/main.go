// Command migrate applies and inspects CareerOS database migrations.
package main

import (
	"database/sql"
	"fmt"
	"os"

	"careeros/backend/internal/config"
	"careeros/backend/internal/logger"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

// migrationsDir is the repository-relative directory that stores goose
// migration files.
const migrationsDir = "backend/migrations"

// main dispatches goose migration commands against the configured PostgreSQL
// database.
func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: migrate <up|down|status>")
		os.Exit(2)
	}

	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	log := logger.Configure(cfg.LogLevel, cfg.AppEnv)

	db, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("open postgres")
	}
	defer db.Close()

	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatal().Err(err).Msg("set goose dialect")
	}

	command := os.Args[1]
	switch command {
	case "up":
		err = goose.Up(db, migrationsDir)
	case "down":
		err = goose.Down(db, migrationsDir)
	case "status":
		err = goose.Status(db, migrationsDir)
	default:
		fmt.Fprintf(os.Stderr, "unknown migration command %q\n", command)
		os.Exit(2)
	}

	if err != nil {
		log.Fatal().Err(err).Str("command", command).Msg("migration failed")
	}

	log.Info().Str("command", command).Msg("migration complete")
}
