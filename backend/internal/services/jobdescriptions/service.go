package jobdescriptions

import (
	"context"
	"errors"
	"strings"

	"careeros/backend/internal/db/queries"
)

var ErrRawTextRequired = errors.New("job description raw_text is required")

type Store interface {
	CreateJobDescription(context.Context, queries.CreateJobDescriptionParams) (queries.JobDescription, error)
	GetJobDescriptionByApplication(context.Context, string) (queries.JobDescription, error)
	UpdateJobDescription(context.Context, queries.UpdateJobDescriptionParams) (queries.JobDescription, error)
}

type Service struct {
	store Store
}

func New(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, arg queries.CreateJobDescriptionParams) (queries.JobDescription, error) {
	if strings.TrimSpace(arg.RawText) == "" {
		return queries.JobDescription{}, ErrRawTextRequired
	}
	if arg.ExtractedKeywords == nil {
		arg.ExtractedKeywords = []string{}
	}
	return s.store.CreateJobDescription(ctx, arg)
}

func (s *Service) GetByApplication(ctx context.Context, applicationID string) (queries.JobDescription, error) {
	return s.store.GetJobDescriptionByApplication(ctx, applicationID)
}

func (s *Service) Update(ctx context.Context, arg queries.UpdateJobDescriptionParams) (queries.JobDescription, error) {
	if arg.RawText != nil && strings.TrimSpace(*arg.RawText) == "" {
		return queries.JobDescription{}, ErrRawTextRequired
	}
	if arg.SetKeywords && arg.ExtractedKeywords == nil {
		arg.ExtractedKeywords = []string{}
	}
	return s.store.UpdateJobDescription(ctx, arg)
}
