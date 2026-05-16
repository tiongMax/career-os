package companies

import (
	"context"
	"errors"
	"strings"

	"careeros/backend/internal/db/queries"
)

var ErrNameRequired = errors.New("company name is required")

type Store interface {
	CreateCompany(context.Context, queries.CreateCompanyParams) (queries.Company, error)
	ListCompanies(context.Context) ([]queries.Company, error)
	GetCompany(context.Context, string) (queries.Company, error)
	UpdateCompany(context.Context, queries.UpdateCompanyParams) (queries.Company, error)
	DeleteCompany(context.Context, string) error
}

type Service struct {
	store Store
}

func New(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, arg queries.CreateCompanyParams) (queries.Company, error) {
	if strings.TrimSpace(arg.Name) == "" {
		return queries.Company{}, ErrNameRequired
	}
	return s.store.CreateCompany(ctx, arg)
}

func (s *Service) List(ctx context.Context) ([]queries.Company, error) {
	return s.store.ListCompanies(ctx)
}

func (s *Service) Get(ctx context.Context, id string) (queries.Company, error) {
	return s.store.GetCompany(ctx, id)
}

func (s *Service) Update(ctx context.Context, arg queries.UpdateCompanyParams) (queries.Company, error) {
	if arg.Name != nil && strings.TrimSpace(*arg.Name) == "" {
		return queries.Company{}, ErrNameRequired
	}
	return s.store.UpdateCompany(ctx, arg)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.store.DeleteCompany(ctx, id)
}
