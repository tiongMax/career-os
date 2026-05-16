// Package contacts contains business rules for company contact records.
package contacts

import (
	"context"
	"errors"
	"strings"

	"careeros/backend/internal/db/queries"
)

// ErrNameRequired is returned when a create or update request provides a blank
// contact name.
var ErrNameRequired = errors.New("contact name is required")

// Store is the persistence boundary required by Service.
type Store interface {
	CreateContact(context.Context, queries.CreateContactParams) (queries.Contact, error)
	ListContacts(context.Context) ([]queries.Contact, error)
	GetContact(context.Context, string) (queries.Contact, error)
	UpdateContact(context.Context, queries.UpdateContactParams) (queries.Contact, error)
	DeleteContact(context.Context, string) error
}

// Service validates contact input before delegating persistence to Store.
type Service struct {
	store Store
}

// New builds a contact service backed by store.
func New(store Store) *Service {
	return &Service{store: store}
}

// Create validates and persists a contact.
func (s *Service) Create(ctx context.Context, arg queries.CreateContactParams) (queries.Contact, error) {
	if strings.TrimSpace(arg.Name) == "" {
		return queries.Contact{}, ErrNameRequired
	}
	return s.store.CreateContact(ctx, arg)
}

// List returns all contacts ordered by the query layer.
func (s *Service) List(ctx context.Context) ([]queries.Contact, error) {
	return s.store.ListContacts(ctx)
}

// Get returns one contact by ID.
func (s *Service) Get(ctx context.Context, id string) (queries.Contact, error) {
	return s.store.GetContact(ctx, id)
}

// Update validates mutable contact fields and persists the patch.
func (s *Service) Update(ctx context.Context, arg queries.UpdateContactParams) (queries.Contact, error) {
	if arg.Name != nil && strings.TrimSpace(*arg.Name) == "" {
		return queries.Contact{}, ErrNameRequired
	}
	return s.store.UpdateContact(ctx, arg)
}

// Delete removes a contact by ID.
func (s *Service) Delete(ctx context.Context, id string) error {
	return s.store.DeleteContact(ctx, id)
}
