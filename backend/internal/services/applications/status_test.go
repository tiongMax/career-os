package applications

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"careeros/backend/internal/persistence/postgres"
)

func TestValidateTransition(t *testing.T) {
	tests := []struct {
		name    string
		from    string
		to      string
		wantErr error
	}{
		{
			name: "valid saved to applied",
			from: StatusSaved,
			to:   StatusApplied,
		},
		{
			name: "valid applied to online assessment",
			from: StatusApplied,
			to:   StatusOnlineAssessment,
		},
		{
			name: "valid first technical to second technical",
			from: StatusTechnicalScreen,
			to:   StatusTechnicalScreen2,
		},
		{
			name:    "invalid saved to onsite",
			from:    StatusSaved,
			to:      StatusOnsite,
			wantErr: ErrInvalidTransition,
		},
		{
			name: "rejected can reopen to applied",
			from: StatusRejected,
			to:   StatusApplied,
		},
		{
			name:    "withdrawn is terminal",
			from:    StatusWithdrawn,
			to:      StatusApplied,
			wantErr: ErrInvalidTransition,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateTransition(tt.from, tt.to)
			if tt.wantErr == nil && err != nil {
				t.Fatalf("expected nil error, got %v", err)
			}
			if tt.wantErr != nil && !errors.Is(err, tt.wantErr) {
				t.Fatalf("expected %v, got %v", tt.wantErr, err)
			}
		})
	}
}

func TestChangeStatusCreatesAuditForValidTransition(t *testing.T) {
	store := &fakeStore{
		application: postgres.Application{
			ID:     "00000000-0000-4000-8000-000000000001",
			Status: StatusSaved,
		},
	}
	service := New(store)

	updated, err := service.ChangeStatus(context.Background(), ChangeStatusParams{
		ID:     store.application.ID,
		Status: StatusApplied,
	})
	if err != nil {
		t.Fatalf("ChangeStatus returned error: %v", err)
	}
	if updated.Status != StatusApplied {
		t.Fatalf("expected updated status %q, got %q", StatusApplied, updated.Status)
	}
	if !store.auditCreated {
		t.Fatal("expected status change to create audit log")
	}
	if store.auditLog.EntityType != "application" {
		t.Fatalf("expected audit entity type application, got %q", store.auditLog.EntityType)
	}
	if store.auditLog.EntityID != store.application.ID {
		t.Fatalf("expected audit entity id %q, got %q", store.application.ID, store.auditLog.EntityID)
	}
	if store.auditLog.Action != "status_changed" {
		t.Fatalf("expected audit action status_changed, got %q", store.auditLog.Action)
	}
	assertStatusAuditValue(t, store.auditLog.OldValue, StatusSaved)
	assertStatusAuditValue(t, store.auditLog.NewValue, StatusApplied)
}

func TestChangeStatusDoesNotAuditInvalidTransition(t *testing.T) {
	store := &fakeStore{
		application: postgres.Application{
			ID:     "00000000-0000-4000-8000-000000000001",
			Status: StatusSaved,
		},
	}
	service := New(store)

	_, err := service.ChangeStatus(context.Background(), ChangeStatusParams{
		ID:     store.application.ID,
		Status: StatusOnsite,
	})
	if !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("expected invalid transition error, got %v", err)
	}
	if store.auditCreated {
		t.Fatal("did not expect audit log write for invalid transition")
	}
}

func TestChangeStatusRecordsDatesForCurrentStatus(t *testing.T) {
	store := &fakeStore{
		application: postgres.Application{
			ID:     "00000000-0000-4000-8000-000000000001",
			Status: StatusOnlineAssessment,
		},
	}
	service := New(store)
	receivedAt := time.Date(2026, 6, 23, 0, 0, 0, 0, time.UTC)
	completedAt := time.Date(2026, 6, 24, 0, 0, 0, 0, time.UTC)

	updated, err := service.ChangeStatus(context.Background(), ChangeStatusParams{
		ID:          store.application.ID,
		Status:      StatusOnlineAssessment,
		ReceivedAt:  &receivedAt,
		CompletedAt: &completedAt,
	})
	if err != nil {
		t.Fatalf("ChangeStatus returned error: %v", err)
	}
	if updated.Status != StatusOnlineAssessment {
		t.Fatalf("expected status to remain %q, got %q", StatusOnlineAssessment, updated.Status)
	}
	if !store.auditCreated {
		t.Fatal("expected status date update to create audit log")
	}
	if store.auditLog.Action != "status_dates_recorded" {
		t.Fatalf("expected status_dates_recorded action, got %q", store.auditLog.Action)
	}
	assertStatusAuditValue(t, store.auditLog.NewValue, StatusOnlineAssessment)
	assertAuditValue(t, store.auditLog.NewValue, "received_at", receivedAt.Format(time.RFC3339))
	assertAuditValue(t, store.auditLog.NewValue, "completed_at", completedAt.Format(time.RFC3339))
}

func TestChangeStatusRejectsDatesForApplied(t *testing.T) {
	store := &fakeStore{
		application: postgres.Application{
			ID:     "00000000-0000-4000-8000-000000000001",
			Status: StatusApplied,
		},
	}
	service := New(store)
	receivedAt := time.Date(2026, 6, 23, 0, 0, 0, 0, time.UTC)

	_, err := service.ChangeStatus(context.Background(), ChangeStatusParams{
		ID:         store.application.ID,
		Status:     StatusApplied,
		ReceivedAt: &receivedAt,
	})
	if !errors.Is(err, ErrInvalidStatusDates) {
		t.Fatalf("expected invalid status dates error, got %v", err)
	}
	if store.auditCreated {
		t.Fatal("did not expect audit log write for applied status dates")
	}
}

func TestChangeStatusRejectsCompletionBeforeReceived(t *testing.T) {
	store := &fakeStore{
		application: postgres.Application{
			ID:     "00000000-0000-4000-8000-000000000001",
			Status: StatusApplied,
		},
	}
	service := New(store)
	receivedAt := time.Date(2026, 6, 24, 0, 0, 0, 0, time.UTC)
	completedAt := time.Date(2026, 6, 23, 0, 0, 0, 0, time.UTC)

	_, err := service.ChangeStatus(context.Background(), ChangeStatusParams{
		ID:          store.application.ID,
		Status:      StatusApplied,
		ReceivedAt:  &receivedAt,
		CompletedAt: &completedAt,
	})
	if !errors.Is(err, ErrInvalidStatusDates) {
		t.Fatalf("expected invalid status dates error, got %v", err)
	}
	if store.auditCreated {
		t.Fatal("did not expect audit log write for invalid dates")
	}
}

type fakeStore struct {
	application  postgres.Application
	auditCreated bool
	auditLog     postgres.CreateAuditLogParams
}

func (f *fakeStore) CreateApplication(context.Context, postgres.CreateApplicationParams) (postgres.Application, error) {
	return postgres.Application{}, nil
}

func (f *fakeStore) ListApplications(context.Context) ([]postgres.Application, error) {
	return nil, nil
}

func (f *fakeStore) ListApplicationsPage(context.Context, int, int) (postgres.ApplicationPage, error) {
	return postgres.ApplicationPage{}, nil
}

func (f *fakeStore) GetApplication(_ context.Context, _ string) (postgres.Application, error) {
	return f.application, nil
}

func (f *fakeStore) UpdateApplication(context.Context, postgres.UpdateApplicationParams) (postgres.Application, error) {
	return postgres.Application{}, nil
}

func (f *fakeStore) UpdateApplicationStatusAndCreateAudit(_ context.Context, _ string, newStatus string, auditLog postgres.CreateAuditLogParams) (postgres.Application, error) {
	f.auditCreated = true
	f.auditLog = auditLog
	f.application.Status = newStatus
	return f.application, nil
}

func (f *fakeStore) CreateAuditLog(_ context.Context, auditLog postgres.CreateAuditLogParams) (postgres.AuditLog, error) {
	f.auditCreated = true
	f.auditLog = auditLog
	return postgres.AuditLog{EntityID: auditLog.EntityID, Action: auditLog.Action, NewValue: auditLog.NewValue}, nil
}

func (f *fakeStore) ListAuditLogsForEntity(context.Context, string, string) ([]postgres.AuditLog, error) {
	return nil, nil
}

func (f *fakeStore) DeleteApplication(context.Context, string) error {
	return nil
}

func assertStatusAuditValue(t *testing.T, raw []byte, want string) {
	t.Helper()
	assertAuditValue(t, raw, "status", want)
}

func assertAuditValue(t *testing.T, raw []byte, key string, want string) {
	t.Helper()
	var value map[string]string
	if err := json.Unmarshal(raw, &value); err != nil {
		t.Fatalf("expected audit value to be valid JSON: %v", err)
	}
	if value[key] != want {
		t.Fatalf("expected audit %s %q, got %q", key, want, value[key])
	}
}
