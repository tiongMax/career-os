package companies

import (
	"context"
	"errors"
	"testing"

	"careeros/backend/internal/persistence/postgres"
)

func TestCreateRejectsBlankCompanyName(t *testing.T) {
	service := New(&fakeStore{})

	_, err := service.Create(context.Background(), postgres.CreateCompanyParams{Name: "   "})

	if !errors.Is(err, ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}
}

func TestUpdateRejectsBlankCompanyName(t *testing.T) {
	service := New(&fakeStore{})
	name := ""

	_, err := service.Update(context.Background(), postgres.UpdateCompanyParams{Name: &name})

	if !errors.Is(err, ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}
}

type fakeStore struct {
	created postgres.CreateCompanyParams
	updated postgres.UpdateCompanyParams
}

func (f *fakeStore) CreateCompany(_ context.Context, arg postgres.CreateCompanyParams) (postgres.Company, error) {
	f.created = arg
	return postgres.Company{Name: arg.Name}, nil
}

func (f *fakeStore) ListCompanies(context.Context) ([]postgres.Company, error) {
	return nil, nil
}

func (f *fakeStore) GetCompany(context.Context, string) (postgres.Company, error) {
	return postgres.Company{}, nil
}

func (f *fakeStore) UpdateCompany(_ context.Context, arg postgres.UpdateCompanyParams) (postgres.Company, error) {
	f.updated = arg
	return postgres.Company{}, nil
}

func (f *fakeStore) DeleteCompany(context.Context, string) error {
	return nil
}
