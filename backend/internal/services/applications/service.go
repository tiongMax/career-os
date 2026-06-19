package applications

import (
	"context"
	"errors"
	"strings"

	"careeros/backend/internal/db/queries"
)

var (
	ErrTitleRequired = errors.New("application title is required")
	ErrTrackRequired = errors.New("application track is required")
)

type Store interface {
	CreateApplication(context.Context, queries.CreateApplicationParams) (queries.Application, error)
	ListApplications(context.Context) ([]queries.Application, error)
	GetApplication(context.Context, string) (queries.Application, error)
	UpdateApplication(context.Context, queries.UpdateApplicationParams) (queries.Application, error)
	UpdateApplicationStatusWithAudit(context.Context, string, string, string) (queries.Application, error)
	ListAuditLogsForEntity(context.Context, string, string) ([]queries.AuditLog, error)
	DeleteApplication(context.Context, string) error
}

type Service struct {
	store Store
}

type ChangeStatusParams struct {
	ID     string `json:"-"`
	Status string `json:"status"`
}

func New(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, arg queries.CreateApplicationParams) (queries.Application, error) {
	if strings.TrimSpace(arg.Title) == "" {
		return queries.Application{}, ErrTitleRequired
	}
	if strings.TrimSpace(arg.RoleTrack) == "" && len(arg.RoleTracks) == 0 {
		return queries.Application{}, ErrTrackRequired
	}
	if arg.Status != nil {
		if _, ok := allowedTransitions[*arg.Status]; !ok {
			return queries.Application{}, ErrInvalidStatus
		}
	}
	return s.store.CreateApplication(ctx, arg)
}

func (s *Service) List(ctx context.Context) ([]queries.Application, error) {
	return s.store.ListApplications(ctx)
}

func (s *Service) Get(ctx context.Context, id string) (queries.Application, error) {
	return s.store.GetApplication(ctx, id)
}

func (s *Service) Update(ctx context.Context, arg queries.UpdateApplicationParams) (queries.Application, error) {
	if arg.Title != nil && strings.TrimSpace(*arg.Title) == "" {
		return queries.Application{}, ErrTitleRequired
	}
	if len(arg.RoleTracks) > 0 && !hasAnyTrack(arg.RoleTracks) {
		return queries.Application{}, ErrTrackRequired
	}
	if arg.Status != nil {
		if _, ok := allowedTransitions[*arg.Status]; !ok {
			return queries.Application{}, ErrInvalidStatus
		}
	}
	return s.store.UpdateApplication(ctx, arg)
}

func (s *Service) ChangeStatus(ctx context.Context, arg ChangeStatusParams) (queries.Application, error) {
	current, err := s.store.GetApplication(ctx, arg.ID)
	if err != nil {
		return queries.Application{}, err
	}
	if err := ValidateTransition(current.Status, arg.Status); err != nil {
		return queries.Application{}, err
	}
	return s.store.UpdateApplicationStatusWithAudit(ctx, arg.ID, current.Status, arg.Status)
}

func (s *Service) ListAuditLogs(ctx context.Context, applicationID string) ([]queries.AuditLog, error) {
	return s.store.ListAuditLogsForEntity(ctx, "application", applicationID)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.store.DeleteApplication(ctx, id)
}

func hasAnyTrack(tracks []string) bool {
	for _, track := range tracks {
		if strings.TrimSpace(track) != "" {
			return true
		}
	}
	return false
}
