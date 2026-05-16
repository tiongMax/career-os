package companies

import (
	"context"
	"errors"
	"testing"

	"careeros/backend/internal/db/queries"
)

func TestCreateRejectsBlankCompanyName(t *testing.T) {
	service := New(&fakeStore{})

	_, err := service.Create(context.Background(), queries.CreateCompanyParams{Name: "   "})

	if !errors.Is(err, ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}
}

func TestUpdateRejectsBlankCompanyName(t *testing.T) {
	service := New(&fakeStore{})
	name := ""

	_, err := service.Update(context.Background(), queries.UpdateCompanyParams{Name: &name})

	if !errors.Is(err, ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}
}

type fakeStore struct {
	created queries.CreateCompanyParams
	updated queries.UpdateCompanyParams
}

func (f *fakeStore) CreateCompany(_ context.Context, arg queries.CreateCompanyParams) (queries.Company, error) {
	f.created = arg
	return queries.Company{Name: arg.Name}, nil
}

func (f *fakeStore) ListCompanies(context.Context) ([]queries.Company, error) {
	return nil, nil
}

func (f *fakeStore) GetCompany(context.Context, string) (queries.Company, error) {
	return queries.Company{}, nil
}

func (f *fakeStore) UpdateCompany(_ context.Context, arg queries.UpdateCompanyParams) (queries.Company, error) {
	f.updated = arg
	return queries.Company{}, nil
}

func (f *fakeStore) DeleteCompany(context.Context, string) error {
	return nil
}
