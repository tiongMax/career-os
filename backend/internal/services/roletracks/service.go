package roletracks

import (
	"context"
	"errors"
	"strings"

	"careeros/backend/internal/db/queries"
)

var ErrNameRequired = errors.New("role track name is required")

type Store interface {
	CreateRoleTrack(context.Context, string) (queries.RoleTrack, error)
	ListRoleTracks(context.Context) ([]queries.RoleTrack, error)
}

type Service struct {
	store Store
}

func New(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, name string) (queries.RoleTrack, error) {
	name = strings.TrimSpace(strings.ToLower(name))
	if name == "" {
		return queries.RoleTrack{}, ErrNameRequired
	}
	return s.store.CreateRoleTrack(ctx, name)
}

func (s *Service) List(ctx context.Context) ([]queries.RoleTrack, error) {
	return s.store.ListRoleTracks(ctx)
}
