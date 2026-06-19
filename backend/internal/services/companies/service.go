package companies

import (
	"context"
	"errors"
	"strings"

	companydomain "careeros/backend/internal/domain/companies"
	"careeros/backend/internal/persistence/postgres"
)

var ErrNameRequired = errors.New("company name is required")

type Store interface {
	CreateCompany(context.Context, postgres.CreateCompanyParams) (postgres.Company, error)
	ListCompanies(context.Context) ([]postgres.Company, error)
	GetCompany(context.Context, string) (postgres.Company, error)
	UpdateCompany(context.Context, postgres.UpdateCompanyParams) (postgres.Company, error)
	DeleteCompany(context.Context, string) error
}

type Service struct {
	store Store
}

func New(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, arg postgres.CreateCompanyParams) (companydomain.Company, error) {
	if strings.TrimSpace(arg.Name) == "" {
		return companydomain.Company{}, ErrNameRequired
	}
	company, err := s.store.CreateCompany(ctx, arg)
	return companyFromStore(company), err
}

func (s *Service) List(ctx context.Context) ([]companydomain.Company, error) {
	companies, err := s.store.ListCompanies(ctx)
	if err != nil {
		return nil, err
	}
	return companiesFromStore(companies), nil
}

func (s *Service) Get(ctx context.Context, id string) (companydomain.Company, error) {
	company, err := s.store.GetCompany(ctx, id)
	return companyFromStore(company), err
}

func (s *Service) Update(ctx context.Context, arg postgres.UpdateCompanyParams) (companydomain.Company, error) {
	if arg.Name != nil && strings.TrimSpace(*arg.Name) == "" {
		return companydomain.Company{}, ErrNameRequired
	}
	company, err := s.store.UpdateCompany(ctx, arg)
	return companyFromStore(company), err
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.store.DeleteCompany(ctx, id)
}

func companyFromStore(company postgres.Company) companydomain.Company {
	return companydomain.Company{
		ID:        company.ID,
		Name:      company.Name,
		Website:   company.Website,
		Industry:  company.Industry,
		Location:  company.Location,
		Notes:     company.Notes,
		CreatedAt: company.CreatedAt,
		UpdatedAt: company.UpdatedAt,
	}
}

func companiesFromStore(companies []postgres.Company) []companydomain.Company {
	out := make([]companydomain.Company, 0, len(companies))
	for _, company := range companies {
		out = append(out, companyFromStore(company))
	}
	return out
}
