package interviews

import (
	"context"
	"errors"
	"testing"

	"careeros/backend/internal/db/queries"
)

func TestCreateRejectsInvalidRoundType(t *testing.T) {
	service := New(&fakeStore{})

	_, err := service.Create(context.Background(), queries.CreateInterviewRoundParams{RoundType: "coffee"})

	if !errors.Is(err, ErrInvalidRoundType) {
		t.Fatalf("expected ErrInvalidRoundType, got %v", err)
	}
}

func TestUpdateRejectsInvalidRoundType(t *testing.T) {
	service := New(&fakeStore{})
	roundType := "coffee"

	_, err := service.Update(context.Background(), queries.UpdateInterviewRoundParams{RoundType: &roundType})

	if !errors.Is(err, ErrInvalidRoundType) {
		t.Fatalf("expected ErrInvalidRoundType, got %v", err)
	}
}

type fakeStore struct {
	created queries.CreateInterviewRoundParams
	updated queries.UpdateInterviewRoundParams
}

func (f *fakeStore) CreateInterviewRound(_ context.Context, arg queries.CreateInterviewRoundParams) (queries.InterviewRound, error) {
	f.created = arg
	return queries.InterviewRound{RoundType: arg.RoundType}, nil
}

func (f *fakeStore) ListInterviewRoundsByApplication(context.Context, string) ([]queries.InterviewRound, error) {
	return nil, nil
}

func (f *fakeStore) UpdateInterviewRound(_ context.Context, arg queries.UpdateInterviewRoundParams) (queries.InterviewRound, error) {
	f.updated = arg
	return queries.InterviewRound{}, nil
}

func (f *fakeStore) DeleteInterviewRound(context.Context, string) error {
	return nil
}
