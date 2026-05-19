package search

import (
	"context"
	"strings"

	"careeros/backend/internal/db/queries"
)

// Store is the subset of *queries.Queries used by this service.
type Store interface {
	Search(ctx context.Context, query string) ([]queries.SearchResult, error)
}

// Service provides full-text search over applications and job descriptions.
type Service struct {
	store Store
}

// New creates a Service backed by the given store.
func New(store Store) *Service {
	return &Service{store: store}
}

// Search runs a full-text search against the store. An empty query returns an
// empty slice immediately without hitting the database.
func (s *Service) Search(ctx context.Context, query string) ([]queries.SearchResult, error) {
	if strings.TrimSpace(query) == "" {
		return []queries.SearchResult{}, nil
	}
	return s.store.Search(ctx, query)
}
