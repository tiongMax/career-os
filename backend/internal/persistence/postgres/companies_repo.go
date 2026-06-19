package postgres

import (
	"context"
)

func (q *Queries) CreateCompany(ctx context.Context, arg CreateCompanyParams) (Company, error) {
	row, err := q.CreateCompanySQL(ctx, arg)
	return companyFrom(row.ID, row.Name, row.Website, row.Industry, row.Location, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) ListCompanies(ctx context.Context) ([]Company, error) {
	rows, err := q.ListCompaniesSQL(ctx)
	if err != nil {
		return nil, err
	}
	companies := make([]Company, 0, len(rows))
	for _, row := range rows {
		companies = append(companies, companyFrom(row.ID, row.Name, row.Website, row.Industry, row.Location, row.Notes, row.CreatedAt, row.UpdatedAt))
	}
	return companies, nil
}

func (q *Queries) GetCompany(ctx context.Context, id string) (Company, error) {
	row, err := q.GetCompanySQL(ctx, id)
	return companyFrom(row.ID, row.Name, row.Website, row.Industry, row.Location, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateCompany(ctx context.Context, arg UpdateCompanyParams) (Company, error) {
	row, err := q.UpdateCompanySQL(ctx, arg)
	return companyFrom(row.ID, row.Name, row.Website, row.Industry, row.Location, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) DeleteCompany(ctx context.Context, id string) error {
	return ensureRows(q.DeleteCompanyRowCount(ctx, id))
}
