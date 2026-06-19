// Package contacts contains business rules for company contact records.
package contacts

import (
	"context"
	"errors"
	"strings"

	contactdomain "careeros/backend/internal/domain/contacts"
	"careeros/backend/internal/persistence/postgres"
)

// ErrNameRequired is returned when a create or update request provides a blank
// contact name.
var ErrNameRequired = errors.New("contact name is required")

// Store is the persistence boundary required by Service.
type Store interface {
	CreateContact(context.Context, postgres.CreateContactParams) (postgres.Contact, error)
	ListContacts(context.Context) ([]postgres.Contact, error)
	GetContact(context.Context, string) (postgres.Contact, error)
	UpdateContact(context.Context, postgres.UpdateContactParams) (postgres.Contact, error)
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
func (s *Service) Create(ctx context.Context, arg postgres.CreateContactParams) (contactdomain.Contact, error) {
	if strings.TrimSpace(arg.Name) == "" {
		return contactdomain.Contact{}, ErrNameRequired
	}
	contact, err := s.store.CreateContact(ctx, arg)
	return contactFromStore(contact), err
}

// List returns all contacts ordered by the query layer.
func (s *Service) List(ctx context.Context) ([]contactdomain.Contact, error) {
	contacts, err := s.store.ListContacts(ctx)
	if err != nil {
		return nil, err
	}
	return contactsFromStore(contacts), nil
}

// Get returns one contact by ID.
func (s *Service) Get(ctx context.Context, id string) (contactdomain.Contact, error) {
	contact, err := s.store.GetContact(ctx, id)
	return contactFromStore(contact), err
}

// Update validates mutable contact fields and persists the patch.
func (s *Service) Update(ctx context.Context, arg postgres.UpdateContactParams) (contactdomain.Contact, error) {
	if arg.Name != nil && strings.TrimSpace(*arg.Name) == "" {
		return contactdomain.Contact{}, ErrNameRequired
	}
	contact, err := s.store.UpdateContact(ctx, arg)
	return contactFromStore(contact), err
}

// Delete removes a contact by ID.
func (s *Service) Delete(ctx context.Context, id string) error {
	return s.store.DeleteContact(ctx, id)
}

func contactFromStore(contact postgres.Contact) contactdomain.Contact {
	return contactdomain.Contact{
		ID:           contact.ID,
		CompanyID:    contact.CompanyID,
		Name:         contact.Name,
		Role:         contact.Role,
		Email:        contact.Email,
		LinkedinURL:  contact.LinkedinURL,
		Relationship: contact.Relationship,
		Notes:        contact.Notes,
		CreatedAt:    contact.CreatedAt,
		UpdatedAt:    contact.UpdatedAt,
	}
}

func contactsFromStore(contacts []postgres.Contact) []contactdomain.Contact {
	out := make([]contactdomain.Contact, 0, len(contacts))
	for _, contact := range contacts {
		out = append(out, contactFromStore(contact))
	}
	return out
}
