package resumes

import (
	"context"
	"errors"
	"strings"

	"careeros/backend/internal/db/queries"
	resumedomain "careeros/backend/internal/domain/resumes"
)

var (
	ErrNameRequired    = errors.New("resume version name is required")
	ErrInvalidTrack    = errors.New("resume track must be one of backend, ai, quant, general")
	allowedResumeTrack = map[string]struct{}{
		"backend": {},
		"ai":      {},
		"quant":   {},
		"general": {},
	}
)

type Store interface {
	CreateResumeVersion(context.Context, queries.CreateResumeVersionParams) (queries.ResumeVersion, error)
	ListResumeVersions(context.Context) ([]queries.ResumeVersion, error)
	GetResumeVersion(context.Context, string) (queries.ResumeVersion, error)
	UpdateResumeVersion(context.Context, queries.UpdateResumeVersionParams) (queries.ResumeVersion, error)
	DeleteResumeVersion(context.Context, string) error
	StorePDF(context.Context, string, []byte) error
	GetPDF(context.Context, string) ([]byte, error)
}

type Service struct {
	store Store
}

func New(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, arg queries.CreateResumeVersionParams) (resumedomain.ResumeVersion, error) {
	if strings.TrimSpace(arg.Name) == "" {
		return resumedomain.ResumeVersion{}, ErrNameRequired
	}
	if !validTrack(arg.Track) {
		return resumedomain.ResumeVersion{}, ErrInvalidTrack
	}
	if arg.Tags == nil {
		arg.Tags = []string{}
	}
	resume, err := s.store.CreateResumeVersion(ctx, arg)
	return resumeFromStore(resume), err
}

func (s *Service) List(ctx context.Context) ([]resumedomain.ResumeVersion, error) {
	resumes, err := s.store.ListResumeVersions(ctx)
	if err != nil {
		return nil, err
	}
	return resumesFromStore(resumes), nil
}

func (s *Service) Get(ctx context.Context, id string) (resumedomain.ResumeVersion, error) {
	resume, err := s.store.GetResumeVersion(ctx, id)
	return resumeFromStore(resume), err
}

func (s *Service) Update(ctx context.Context, arg queries.UpdateResumeVersionParams) (resumedomain.ResumeVersion, error) {
	if arg.Name != nil && strings.TrimSpace(*arg.Name) == "" {
		return resumedomain.ResumeVersion{}, ErrNameRequired
	}
	if arg.Track != nil && !validTrack(*arg.Track) {
		return resumedomain.ResumeVersion{}, ErrInvalidTrack
	}
	if arg.SetTags && arg.Tags == nil {
		arg.Tags = []string{}
	}
	resume, err := s.store.UpdateResumeVersion(ctx, arg)
	return resumeFromStore(resume), err
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.store.DeleteResumeVersion(ctx, id)
}

func (s *Service) StorePDF(ctx context.Context, id string, data []byte) error {
	return s.store.StorePDF(ctx, id, data)
}

func (s *Service) GetPDF(ctx context.Context, id string) ([]byte, error) {
	return s.store.GetPDF(ctx, id)
}

func validTrack(track string) bool {
	_, ok := allowedResumeTrack[track]
	return ok
}

func resumeFromStore(resume queries.ResumeVersion) resumedomain.ResumeVersion {
	return resumedomain.ResumeVersion{
		ID:          resume.ID,
		Name:        resume.Name,
		Track:       resume.Track,
		ContentText: resume.ContentText,
		HasPDF:      resume.HasPDF,
		Tags:        resume.Tags,
		CreatedAt:   resume.CreatedAt,
		UpdatedAt:   resume.UpdatedAt,
	}
}

func resumesFromStore(resumes []queries.ResumeVersion) []resumedomain.ResumeVersion {
	out := make([]resumedomain.ResumeVersion, 0, len(resumes))
	for _, resume := range resumes {
		out = append(out, resumeFromStore(resume))
	}
	return out
}
