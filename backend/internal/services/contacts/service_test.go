package contacts

import (
	"context"
	"errors"
	"testing"

	"careeros/backend/internal/persistence/postgres"
)

func TestCreateRejectsBlankContactName(t *testing.T) {
	service := New(&fakeStore{})

	_, err := service.Create(context.Background(), postgres.CreateContactParams{Name: "   "})

	if !errors.Is(err, ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}
}

func TestUpdateRejectsBlankContactName(t *testing.T) {
	service := New(&fakeStore{})
	name := ""

	_, err := service.Update(context.Background(), postgres.UpdateContactParams{Name: &name})

	if !errors.Is(err, ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}
}

type fakeStore struct {
	created postgres.CreateContactParams
	updated postgres.UpdateContactParams
}

func (f *fakeStore) CreateContact(_ context.Context, arg postgres.CreateContactParams) (postgres.Contact, error) {
	f.created = arg
	return postgres.Contact{Name: arg.Name}, nil
}

func (f *fakeStore) ListContacts(context.Context) ([]postgres.Contact, error) {
	return nil, nil
}

func (f *fakeStore) GetContact(context.Context, string) (postgres.Contact, error) {
	return postgres.Contact{}, nil
}

func (f *fakeStore) UpdateContact(_ context.Context, arg postgres.UpdateContactParams) (postgres.Contact, error) {
	f.updated = arg
	return postgres.Contact{}, nil
}

func (f *fakeStore) DeleteContact(context.Context, string) error {
	return nil
}
