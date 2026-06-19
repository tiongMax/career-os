package interviews

import (
	"context"
	"errors"
	"testing"

	"careeros/backend/internal/persistence/postgres"
)

func TestCreateRejectsInvalidRoundType(t *testing.T) {
	service := New(&fakeStore{})

	_, err := service.Create(context.Background(), postgres.CreateInterviewRoundParams{RoundType: "coffee"})

	if !errors.Is(err, ErrInvalidRoundType) {
		t.Fatalf("expected ErrInvalidRoundType, got %v", err)
	}
}

func TestUpdateRejectsInvalidRoundType(t *testing.T) {
	service := New(&fakeStore{})
	roundType := "coffee"

	_, err := service.Update(context.Background(), postgres.UpdateInterviewRoundParams{RoundType: &roundType})

	if !errors.Is(err, ErrInvalidRoundType) {
		t.Fatalf("expected ErrInvalidRoundType, got %v", err)
	}
}

type fakeStore struct {
	created postgres.CreateInterviewRoundParams
	updated postgres.UpdateInterviewRoundParams
}

func (f *fakeStore) CreateInterviewRound(_ context.Context, arg postgres.CreateInterviewRoundParams) (postgres.InterviewRound, error) {
	f.created = arg
	return postgres.InterviewRound{RoundType: arg.RoundType}, nil
}

func (f *fakeStore) ListInterviewRoundsByApplication(context.Context, string) ([]postgres.InterviewRound, error) {
	return nil, nil
}

func (f *fakeStore) UpdateInterviewRound(_ context.Context, arg postgres.UpdateInterviewRoundParams) (postgres.InterviewRound, error) {
	f.updated = arg
	return postgres.InterviewRound{}, nil
}

func (f *fakeStore) DeleteInterviewRound(context.Context, string) error {
	return nil
}
