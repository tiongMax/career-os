package applications

import (
	"context"
	"errors"
	"testing"

	"careeros/backend/internal/db/queries"
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
			name:    "invalid saved to onsite",
			from:    StatusSaved,
			to:      StatusOnsite,
			wantErr: ErrInvalidTransition,
		},
		{
			name:    "rejected is terminal",
			from:    StatusRejected,
			to:      StatusApplied,
			wantErr: ErrInvalidTransition,
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
		application: queries.Application{
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
		t.Fatal("expected status update repository method to create audit log")
	}
}

func TestChangeStatusDoesNotAuditInvalidTransition(t *testing.T) {
	store := &fakeStore{
		application: queries.Application{
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

type fakeStore struct {
	application  queries.Application
	auditCreated bool
}

func (f *fakeStore) CreateApplication(context.Context, queries.CreateApplicationParams) (queries.Application, error) {
	return queries.Application{}, nil
}

func (f *fakeStore) ListApplications(context.Context) ([]queries.Application, error) {
	return nil, nil
}

func (f *fakeStore) GetApplication(_ context.Context, _ string) (queries.Application, error) {
	return f.application, nil
}

func (f *fakeStore) UpdateApplication(context.Context, queries.UpdateApplicationParams) (queries.Application, error) {
	return queries.Application{}, nil
}

func (f *fakeStore) UpdateApplicationStatusWithAudit(_ context.Context, _ string, _ string, newStatus string) (queries.Application, error) {
	f.auditCreated = true
	f.application.Status = newStatus
	return f.application, nil
}

func (f *fakeStore) ListAuditLogsForEntity(context.Context, string, string) ([]queries.AuditLog, error) {
	return nil, nil
}

func (f *fakeStore) DeleteApplication(context.Context, string) error {
	return nil
}
