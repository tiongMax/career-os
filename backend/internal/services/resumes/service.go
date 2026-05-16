package resumes

import (
	"context"
	"errors"
	"strings"

	"careeros/backend/internal/db/queries"
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
}

type Service struct {
	store Store
}

func New(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, arg queries.CreateResumeVersionParams) (queries.ResumeVersion, error) {
	if strings.TrimSpace(arg.Name) == "" {
		return queries.ResumeVersion{}, ErrNameRequired
	}
	if !validTrack(arg.Track) {
		return queries.ResumeVersion{}, ErrInvalidTrack
	}
	if arg.Tags == nil {
		arg.Tags = []string{}
	}
	return s.store.CreateResumeVersion(ctx, arg)
}

func (s *Service) List(ctx context.Context) ([]queries.ResumeVersion, error) {
	return s.store.ListResumeVersions(ctx)
}

func (s *Service) Get(ctx context.Context, id string) (queries.ResumeVersion, error) {
	return s.store.GetResumeVersion(ctx, id)
}

func (s *Service) Update(ctx context.Context, arg queries.UpdateResumeVersionParams) (queries.ResumeVersion, error) {
	if arg.Name != nil && strings.TrimSpace(*arg.Name) == "" {
		return queries.ResumeVersion{}, ErrNameRequired
	}
	if arg.Track != nil && !validTrack(*arg.Track) {
		return queries.ResumeVersion{}, ErrInvalidTrack
	}
	if arg.SetTags && arg.Tags == nil {
		arg.Tags = []string{}
	}
	return s.store.UpdateResumeVersion(ctx, arg)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.store.DeleteResumeVersion(ctx, id)
}

func validTrack(track string) bool {
	_, ok := allowedResumeTrack[track]
	return ok
}
