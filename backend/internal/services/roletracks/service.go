package roletracks

import (
	"context"
	"errors"
	"strings"

	"careeros/backend/internal/db/queries"
	trackdomain "careeros/backend/internal/domain/roletracks"
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

func (s *Service) Create(ctx context.Context, name string) (trackdomain.RoleTrack, error) {
	name = strings.TrimSpace(strings.ToLower(name))
	if name == "" {
		return trackdomain.RoleTrack{}, ErrNameRequired
	}
	track, err := s.store.CreateRoleTrack(ctx, name)
	return roleTrackFromStore(track), err
}

func (s *Service) List(ctx context.Context) ([]trackdomain.RoleTrack, error) {
	tracks, err := s.store.ListRoleTracks(ctx)
	if err != nil {
		return nil, err
	}
	return roleTracksFromStore(tracks), nil
}

func roleTrackFromStore(track queries.RoleTrack) trackdomain.RoleTrack {
	return trackdomain.RoleTrack{
		ID:        track.ID,
		Name:      track.Name,
		CreatedAt: track.CreatedAt,
	}
}

func roleTracksFromStore(tracks []queries.RoleTrack) []trackdomain.RoleTrack {
	out := make([]trackdomain.RoleTrack, 0, len(tracks))
	for _, track := range tracks {
		out = append(out, roleTrackFromStore(track))
	}
	return out
}
