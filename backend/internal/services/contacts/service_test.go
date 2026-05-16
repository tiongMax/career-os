package contacts

import (
	"context"
	"errors"
	"testing"

	"careeros/backend/internal/db/queries"
)

func TestCreateRejectsBlankContactName(t *testing.T) {
	service := New(&fakeStore{})

	_, err := service.Create(context.Background(), queries.CreateContactParams{Name: "   "})

	if !errors.Is(err, ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}
}

func TestUpdateRejectsBlankContactName(t *testing.T) {
	service := New(&fakeStore{})
	name := ""

	_, err := service.Update(context.Background(), queries.UpdateContactParams{Name: &name})

	if !errors.Is(err, ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}
}

type fakeStore struct {
	created queries.CreateContactParams
	updated queries.UpdateContactParams
}

func (f *fakeStore) CreateContact(_ context.Context, arg queries.CreateContactParams) (queries.Contact, error) {
	f.created = arg
	return queries.Contact{Name: arg.Name}, nil
}

func (f *fakeStore) ListContacts(context.Context) ([]queries.Contact, error) {
	return nil, nil
}

func (f *fakeStore) GetContact(context.Context, string) (queries.Contact, error) {
	return queries.Contact{}, nil
}

func (f *fakeStore) UpdateContact(_ context.Context, arg queries.UpdateContactParams) (queries.Contact, error) {
	f.updated = arg
	return queries.Contact{}, nil
}

func (f *fakeStore) DeleteContact(context.Context, string) error {
	return nil
}
