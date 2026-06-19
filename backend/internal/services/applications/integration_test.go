package applications

import (
	"context"
	"encoding/json"
	"errors"
	"os"
	"testing"
	"time"

	"careeros/backend/internal/persistence/postgres"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestIntegrationApplicationWorkflowCreatesAuditLog(t *testing.T) {
	databaseURL := os.Getenv("CAREEROS_INTEGRATION_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set CAREEROS_INTEGRATION_DATABASE_URL to run PostgreSQL integration test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		t.Fatalf("connect postgres: %v", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		t.Fatalf("ping postgres: %v", err)
	}

	store := postgres.New(pool)
	service := New(store)

	company, err := store.CreateCompany(ctx, postgres.CreateCompanyParams{Name: "Integration Co"})
	if err != nil {
		t.Fatalf("create company: %v", err)
	}
	resume, err := store.CreateResumeVersion(ctx, postgres.CreateResumeVersionParams{
		Name:  "Backend Integration Resume",
		Track: "backend",
		Tags:  []string{"go", "postgresql"},
	})
	if err != nil {
		t.Fatalf("create resume version: %v", err)
	}
	application, err := service.Create(ctx, CreateParams{
		CompanyID:       company.ID,
		ResumeVersionID: &resume.ID,
		Title:           "Backend Engineer",
		RoleTrack:       "backend",
	})
	if err != nil {
		t.Fatalf("create application: %v", err)
	}

	t.Cleanup(func() {
		cleanupCtx, cleanupCancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cleanupCancel()
		_, _ = pool.Exec(cleanupCtx, `DELETE FROM audit_logs WHERE entity_type = 'application' AND entity_id = $1::uuid`, application.ID)
		_ = store.DeleteApplication(cleanupCtx, application.ID)
		_ = store.DeleteResumeVersion(cleanupCtx, resume.ID)
		_ = store.DeleteCompany(cleanupCtx, company.ID)
	})

	if _, err := store.CreateJobDescription(ctx, postgres.CreateJobDescriptionParams{
		ApplicationID:     application.ID,
		RawText:           "Build Go services with PostgreSQL and Redis.",
		ExtractedKeywords: []string{"go", "postgresql", "redis"},
	}); err != nil {
		t.Fatalf("create job description: %v", err)
	}

	updated, err := service.ChangeStatus(ctx, ChangeStatusParams{
		ID:     application.ID,
		Status: StatusApplied,
	})
	if err != nil {
		t.Fatalf("change status: %v", err)
	}
	if updated.Status != StatusApplied {
		t.Fatalf("expected status %q, got %q", StatusApplied, updated.Status)
	}

	logs, err := service.ListAuditLogs(ctx, application.ID)
	if err != nil {
		t.Fatalf("list audit logs: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected 1 audit log, got %d", len(logs))
	}
	if logs[0].Action != "status_changed" {
		t.Fatalf("expected status_changed action, got %q", logs[0].Action)
	}

	var oldValue map[string]string
	var newValue map[string]string
	if err := json.Unmarshal(logs[0].OldValue, &oldValue); err != nil {
		t.Fatalf("unmarshal old value: %v", err)
	}
	if err := json.Unmarshal(logs[0].NewValue, &newValue); err != nil {
		t.Fatalf("unmarshal new value: %v", err)
	}
	if oldValue["status"] != StatusSaved || newValue["status"] != StatusApplied {
		t.Fatalf("unexpected audit values: old=%v new=%v", oldValue, newValue)
	}

	_, err = service.ChangeStatus(ctx, ChangeStatusParams{
		ID:     application.ID,
		Status: StatusSaved,
	})
	if !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("expected invalid transition after applied -> saved, got %v", err)
	}

	logs, err = service.ListAuditLogs(ctx, application.ID)
	if err != nil {
		t.Fatalf("list audit logs after invalid transition: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected invalid transition not to create audit log, got %d logs", len(logs))
	}
}
