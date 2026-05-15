package queries

import (
	"context"
	"database/sql"
)

type CreateCompanyParams struct {
	Name     string  `json:"name"`
	Website  *string `json:"website"`
	Industry *string `json:"industry"`
	Location *string `json:"location"`
	Notes    *string `json:"notes"`
}

type UpdateCompanyParams struct {
	ID       string  `json:"-"`
	Name     *string `json:"name"`
	Website  *string `json:"website"`
	Industry *string `json:"industry"`
	Location *string `json:"location"`
	Notes    *string `json:"notes"`
}

func (q *Queries) CreateCompany(ctx context.Context, arg CreateCompanyParams) (Company, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO companies (name, website, industry, location, notes)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id::text, name, website, industry, location, notes, created_at, updated_at
	`, arg.Name, arg.Website, arg.Industry, arg.Location, arg.Notes)
	return scanCompany(row)
}

func (q *Queries) ListCompanies(ctx context.Context) ([]Company, error) {
	rows, err := q.db.Query(ctx, `
		SELECT id::text, name, website, industry, location, notes, created_at, updated_at
		FROM companies
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var companies []Company
	for rows.Next() {
		company, err := scanCompany(rows)
		if err != nil {
			return nil, err
		}
		companies = append(companies, company)
	}
	return companies, rows.Err()
}

func (q *Queries) GetCompany(ctx context.Context, id string) (Company, error) {
	row := q.db.QueryRow(ctx, `
		SELECT id::text, name, website, industry, location, notes, created_at, updated_at
		FROM companies
		WHERE id = $1::uuid
	`, id)
	return scanCompany(row)
}

func (q *Queries) UpdateCompany(ctx context.Context, arg UpdateCompanyParams) (Company, error) {
	row := q.db.QueryRow(ctx, `
		UPDATE companies
		SET
			name = COALESCE($2, name),
			website = COALESCE($3, website),
			industry = COALESCE($4, industry),
			location = COALESCE($5, location),
			notes = COALESCE($6, notes),
			updated_at = now()
		WHERE id = $1::uuid
		RETURNING id::text, name, website, industry, location, notes, created_at, updated_at
	`, arg.ID, arg.Name, arg.Website, arg.Industry, arg.Location, arg.Notes)
	return scanCompany(row)
}

func (q *Queries) DeleteCompany(ctx context.Context, id string) error {
	tag, err := q.db.Exec(ctx, `DELETE FROM companies WHERE id = $1::uuid`, id)
	if err != nil {
		return err
	}
	return ensureAffected(tag)
}

type companyScanner interface {
	Scan(dest ...any) error
}

func scanCompany(row companyScanner) (Company, error) {
	var company Company
	var website, industry, location, notes sql.NullString
	err := row.Scan(
		&company.ID,
		&company.Name,
		&website,
		&industry,
		&location,
		&notes,
		&company.CreatedAt,
		&company.UpdatedAt,
	)
	company.Website = nullStringPtr(website)
	company.Industry = nullStringPtr(industry)
	company.Location = nullStringPtr(location)
	company.Notes = nullStringPtr(notes)
	return company, err
}
