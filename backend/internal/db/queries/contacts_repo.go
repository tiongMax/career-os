package queries

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

func (q *Queries) CreateContact(ctx context.Context, arg CreateContactParams) (Contact, error) {
	row, err := q.CreateContactSQL(ctx, CreateContactSQLParams{CompanyID: arg.CompanyID, Name: arg.Name, Role: arg.Role, Email: arg.Email, LinkedinUrl: arg.LinkedinURL, Relationship: arg.Relationship, Notes: arg.Notes})
	return contactFrom(row.ID, row.CompanyID, row.Name, row.Role, row.Email, row.LinkedinUrl, row.Relationship, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) ListContacts(ctx context.Context) ([]Contact, error) {
	rows, err := q.ListContactsSQL(ctx)
	if err != nil {
		return nil, err
	}
	contacts := make([]Contact, 0, len(rows))
	for _, row := range rows {
		contacts = append(contacts, contactFrom(row.ID, row.CompanyID, row.Name, row.Role, row.Email, row.LinkedinUrl, row.Relationship, row.Notes, row.CreatedAt, row.UpdatedAt))
	}
	return contacts, nil
}

func (q *Queries) GetContact(ctx context.Context, id string) (Contact, error) {
	row, err := q.GetContactSQL(ctx, id)
	return contactFrom(row.ID, row.CompanyID, row.Name, row.Role, row.Email, row.LinkedinUrl, row.Relationship, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateContact(ctx context.Context, arg UpdateContactParams) (Contact, error) {
	row, err := q.UpdateContactSQL(ctx, UpdateContactSQLParams{CompanyID: arg.CompanyID, Name: arg.Name, Role: arg.Role, Email: arg.Email, LinkedinUrl: arg.LinkedinURL, Relationship: arg.Relationship, Notes: arg.Notes, ID: arg.ID})
	return contactFrom(row.ID, row.CompanyID, row.Name, row.Role, row.Email, row.LinkedinUrl, row.Relationship, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) DeleteContact(ctx context.Context, id string) error {
	return ensureRows(q.DeleteContactRowCount(ctx, id))
}

func (q *Queries) ListContactsByCompany(ctx context.Context, companyID string) ([]Contact, error) {
	const sql = `SELECT id::text, company_id::text, name, role, email, linkedin_url, relationship, notes, created_at, updated_at FROM contacts WHERE company_id = $1::uuid ORDER BY name`
	rows, err := q.db.Query(ctx, sql, companyID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	contacts := make([]Contact, 0)
	for rows.Next() {
		var id, cid, name string
		var role, email, linkedinURL, relationship, notes *string
		var createdAt, updatedAt pgtype.Timestamptz
		if err := rows.Scan(&id, &cid, &name, &role, &email, &linkedinURL, &relationship, &notes, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		contacts = append(contacts, contactFrom(id, cid, name, role, email, linkedinURL, relationship, notes, createdAt, updatedAt))
	}
	return contacts, rows.Err()
}
