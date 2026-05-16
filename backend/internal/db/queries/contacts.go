package queries

import (
	"context"
	"database/sql"
)

type CreateContactParams struct {
	CompanyID    string  `json:"company_id"`
	Name         string  `json:"name"`
	Role         *string `json:"role"`
	Email        *string `json:"email"`
	LinkedinURL  *string `json:"linkedin_url"`
	Relationship *string `json:"relationship"`
	Notes        *string `json:"notes"`
}

type UpdateContactParams struct {
	ID           string  `json:"-"`
	CompanyID    *string `json:"company_id"`
	Name         *string `json:"name"`
	Role         *string `json:"role"`
	Email        *string `json:"email"`
	LinkedinURL  *string `json:"linkedin_url"`
	Relationship *string `json:"relationship"`
	Notes        *string `json:"notes"`
}

func (q *Queries) CreateContact(ctx context.Context, arg CreateContactParams) (Contact, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO contacts (company_id, name, role, email, linkedin_url, relationship, notes)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
		RETURNING id::text, company_id::text, name, role, email, linkedin_url, relationship, notes, created_at, updated_at
	`, arg.CompanyID, arg.Name, arg.Role, arg.Email, arg.LinkedinURL, arg.Relationship, arg.Notes)
	return scanContact(row)
}

func (q *Queries) ListContacts(ctx context.Context) ([]Contact, error) {
	rows, err := q.db.Query(ctx, `
		SELECT id::text, company_id::text, name, role, email, linkedin_url, relationship, notes, created_at, updated_at
		FROM contacts
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var contacts []Contact
	for rows.Next() {
		contact, err := scanContact(rows)
		if err != nil {
			return nil, err
		}
		contacts = append(contacts, contact)
	}
	return contacts, rows.Err()
}

func (q *Queries) GetContact(ctx context.Context, id string) (Contact, error) {
	row := q.db.QueryRow(ctx, `
		SELECT id::text, company_id::text, name, role, email, linkedin_url, relationship, notes, created_at, updated_at
		FROM contacts
		WHERE id = $1::uuid
	`, id)
	return scanContact(row)
}

func (q *Queries) UpdateContact(ctx context.Context, arg UpdateContactParams) (Contact, error) {
	row := q.db.QueryRow(ctx, `
		UPDATE contacts
		SET
			company_id = COALESCE($2::uuid, company_id),
			name = COALESCE($3, name),
			role = COALESCE($4, role),
			email = COALESCE($5, email),
			linkedin_url = COALESCE($6, linkedin_url),
			relationship = COALESCE($7, relationship),
			notes = COALESCE($8, notes),
			updated_at = now()
		WHERE id = $1::uuid
		RETURNING id::text, company_id::text, name, role, email, linkedin_url, relationship, notes, created_at, updated_at
	`, arg.ID, arg.CompanyID, arg.Name, arg.Role, arg.Email, arg.LinkedinURL, arg.Relationship, arg.Notes)
	return scanContact(row)
}

func (q *Queries) DeleteContact(ctx context.Context, id string) error {
	tag, err := q.db.Exec(ctx, `DELETE FROM contacts WHERE id = $1::uuid`, id)
	if err != nil {
		return err
	}
	return ensureAffected(tag)
}

type contactScanner interface {
	Scan(dest ...any) error
}

func scanContact(row contactScanner) (Contact, error) {
	var contact Contact
	var role, email, linkedinURL, relationship, notes sql.NullString
	err := row.Scan(
		&contact.ID,
		&contact.CompanyID,
		&contact.Name,
		&role,
		&email,
		&linkedinURL,
		&relationship,
		&notes,
		&contact.CreatedAt,
		&contact.UpdatedAt,
	)
	contact.Role = nullStringPtr(role)
	contact.Email = nullStringPtr(email)
	contact.LinkedinURL = nullStringPtr(linkedinURL)
	contact.Relationship = nullStringPtr(relationship)
	contact.Notes = nullStringPtr(notes)
	return contact, err
}
