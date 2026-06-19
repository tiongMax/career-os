// Package interviews contains business rules for application interview rounds.
package interviews

import (
	"context"
	"errors"

	interviewdomain "careeros/backend/internal/domain/interviews"
	"careeros/backend/internal/persistence/postgres"
)

var (
	// ErrInvalidRoundType is returned when a round type is not part of the
	// supported interview workflow.
	ErrInvalidRoundType = errors.New("interview round_type must be one of recruiter, online_assessment, technical, system_design, behavioral, final")
	allowedRoundTypes   = map[string]struct{}{
		"recruiter":         {},
		"online_assessment": {},
		"technical":         {},
		"system_design":     {},
		"behavioral":        {},
		"final":             {},
	}
)

// Store is the persistence boundary required by Service.
type Store interface {
	CreateInterviewRound(context.Context, postgres.CreateInterviewRoundParams) (postgres.InterviewRound, error)
	ListInterviewRoundsByApplication(context.Context, string) ([]postgres.InterviewRound, error)
	UpdateInterviewRound(context.Context, postgres.UpdateInterviewRoundParams) (postgres.InterviewRound, error)
	DeleteInterviewRound(context.Context, string) error
}

// Service validates interview round workflow values before persistence.
type Service struct {
	store Store
}

// New builds an interview service backed by store.
func New(store Store) *Service {
	return &Service{store: store}
}

// Create validates and persists an interview round for an application.
func (s *Service) Create(ctx context.Context, arg postgres.CreateInterviewRoundParams) (interviewdomain.InterviewRound, error) {
	if !validRoundType(arg.RoundType) {
		return interviewdomain.InterviewRound{}, ErrInvalidRoundType
	}
	interview, err := s.store.CreateInterviewRound(ctx, arg)
	return interviewFromStore(interview), err
}

// ListByApplication returns interview rounds associated with an application.
func (s *Service) ListByApplication(ctx context.Context, applicationID string) ([]interviewdomain.InterviewRound, error) {
	interviews, err := s.store.ListInterviewRoundsByApplication(ctx, applicationID)
	if err != nil {
		return nil, err
	}
	return interviewsFromStore(interviews), nil
}

// Update validates mutable interview round fields and persists the patch.
func (s *Service) Update(ctx context.Context, arg postgres.UpdateInterviewRoundParams) (interviewdomain.InterviewRound, error) {
	if arg.RoundType != nil && !validRoundType(*arg.RoundType) {
		return interviewdomain.InterviewRound{}, ErrInvalidRoundType
	}
	interview, err := s.store.UpdateInterviewRound(ctx, arg)
	return interviewFromStore(interview), err
}

// Delete removes an interview round by ID.
func (s *Service) Delete(ctx context.Context, id string) error {
	return s.store.DeleteInterviewRound(ctx, id)
}

func validRoundType(roundType string) bool {
	_, ok := allowedRoundTypes[roundType]
	return ok
}

func interviewFromStore(interview postgres.InterviewRound) interviewdomain.InterviewRound {
	return interviewdomain.InterviewRound{
		ID:            interview.ID,
		ApplicationID: interview.ApplicationID,
		RoundType:     interview.RoundType,
		ScheduledAt:   interview.ScheduledAt,
		Interviewer:   interview.Interviewer,
		Notes:         interview.Notes,
		Outcome:       interview.Outcome,
		CreatedAt:     interview.CreatedAt,
		UpdatedAt:     interview.UpdatedAt,
	}
}

func interviewsFromStore(interviews []postgres.InterviewRound) []interviewdomain.InterviewRound {
	out := make([]interviewdomain.InterviewRound, 0, len(interviews))
	for _, interview := range interviews {
		out = append(out, interviewFromStore(interview))
	}
	return out
}
