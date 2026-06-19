// Command migrate applies and inspects CareerOS database migrations.
package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"careeros/backend/internal/config"
	"careeros/backend/internal/logger"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

var migrationsDirCandidates = []string{
	"migrations",
	filepath.Join("backend", "migrations"),
}

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
	migrationsDir, err := resolveMigrationsDir()
	if err != nil {
		log.Fatal().Err(err).Msg("resolve migrations directory")
	}
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

func resolveMigrationsDir() (string, error) {
	for _, dir := range migrationsDirCandidates {
		info, err := os.Stat(dir)
		if err == nil && info.IsDir() {
			return dir, nil
		}
	}
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	return "", fmt.Errorf("migrations directory not found from %s", wd)
}
