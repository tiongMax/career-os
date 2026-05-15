package queries

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

type CreateApplicationParams struct {
	CompanyID       string     `json:"company_id"`
	ResumeVersionID *string    `json:"resume_version_id"`
	Title           string     `json:"title"`
	RoleTrack       string     `json:"role_track"`
	Source          *string    `json:"source"`
	Status          *string    `json:"status"`
	Location        *string    `json:"location"`
	EmploymentType  *string    `json:"employment_type"`
	JobURL          *string    `json:"job_url"`
	AppliedAt       *time.Time `json:"applied_at"`
	DeadlineAt      *time.Time `json:"deadline_at"`
	Notes           *string    `json:"notes"`
}

type UpdateApplicationParams struct {
	ID              string     `json:"-"`
	CompanyID       *string    `json:"company_id"`
	ResumeVersionID *string    `json:"resume_version_id"`
	Title           *string    `json:"title"`
	RoleTrack       *string    `json:"role_track"`
	Source          *string    `json:"source"`
	Location        *string    `json:"location"`
	EmploymentType  *string    `json:"employment_type"`
	JobURL          *string    `json:"job_url"`
	AppliedAt       *time.Time `json:"applied_at"`
	DeadlineAt      *time.Time `json:"deadline_at"`
	Notes           *string    `json:"notes"`
}

func (q *Queries) CreateApplication(ctx context.Context, arg CreateApplicationParams) (Application, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO applications (
			company_id,
			resume_version_id,
			title,
			role_track,
			source,
			status,
			location,
			employment_type,
			job_url,
			applied_at,
			deadline_at,
			notes
		)
		VALUES ($1::uuid, $2::uuid, $3, $4, $5, COALESCE($6, 'saved'), $7, $8, $9, $10, $11, $12)
		RETURNING id::text, company_id::text, resume_version_id::text, title, role_track, source,
			status, location, employment_type, job_url, applied_at, deadline_at, notes, created_at, updated_at
	`, arg.CompanyID, arg.ResumeVersionID, arg.Title, arg.RoleTrack, arg.Source, arg.Status, arg.Location, arg.EmploymentType, arg.JobURL, arg.AppliedAt, arg.DeadlineAt, arg.Notes)
	return scanApplication(row)
}

func (q *Queries) ListApplications(ctx context.Context) ([]Application, error) {
	rows, err := q.db.Query(ctx, `
		SELECT id::text, company_id::text, resume_version_id::text, title, role_track, source,
			status, location, employment_type, job_url, applied_at, deadline_at, notes, created_at, updated_at
		FROM applications
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var applications []Application
	for rows.Next() {
		application, err := scanApplication(rows)
		if err != nil {
			return nil, err
		}
		applications = append(applications, application)
	}
	return applications, rows.Err()
}

func (q *Queries) GetApplication(ctx context.Context, id string) (Application, error) {
	row := q.db.QueryRow(ctx, `
		SELECT id::text, company_id::text, resume_version_id::text, title, role_track, source,
			status, location, employment_type, job_url, applied_at, deadline_at, notes, created_at, updated_at
		FROM applications
		WHERE id = $1::uuid
	`, id)
	return scanApplication(row)
}

func (q *Queries) UpdateApplication(ctx context.Context, arg UpdateApplicationParams) (Application, error) {
	row := q.db.QueryRow(ctx, `
		UPDATE applications
		SET
			company_id = COALESCE($2::uuid, company_id),
			resume_version_id = COALESCE($3::uuid, resume_version_id),
			title = COALESCE($4, title),
			role_track = COALESCE($5, role_track),
			source = COALESCE($6, source),
			location = COALESCE($7, location),
			employment_type = COALESCE($8, employment_type),
			job_url = COALESCE($9, job_url),
			applied_at = COALESCE($10, applied_at),
			deadline_at = COALESCE($11, deadline_at),
			notes = COALESCE($12, notes),
			updated_at = now()
		WHERE id = $1::uuid
		RETURNING id::text, company_id::text, resume_version_id::text, title, role_track, source,
			status, location, employment_type, job_url, applied_at, deadline_at, notes, created_at, updated_at
	`, arg.ID, arg.CompanyID, arg.ResumeVersionID, arg.Title, arg.RoleTrack, arg.Source, arg.Location, arg.EmploymentType, arg.JobURL, arg.AppliedAt, arg.DeadlineAt, arg.Notes)
	return scanApplication(row)
}

func (q *Queries) UpdateApplicationStatusWithAudit(ctx context.Context, id string, oldStatus string, newStatus string) (Application, error) {
	tx, err := q.pool.Begin(ctx)
	if err != nil {
		return Application{}, err
	}
	defer tx.Rollback(ctx)

	txq := q.WithTx(tx)
	updated, err := txq.updateApplicationStatus(ctx, id, newStatus)
	if err != nil {
		return Application{}, err
	}

	oldValue, err := json.Marshal(map[string]string{"status": oldStatus})
	if err != nil {
		return Application{}, err
	}
	newValue, err := json.Marshal(map[string]string{"status": newStatus})
	if err != nil {
		return Application{}, err
	}

	if _, err := txq.CreateAuditLog(ctx, CreateAuditLogParams{
		EntityType: "application",
		EntityID:   id,
		Action:     "status_changed",
		OldValue:   oldValue,
		NewValue:   newValue,
	}); err != nil {
		return Application{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return Application{}, err
	}

	return updated, nil
}

func (q *Queries) updateApplicationStatus(ctx context.Context, id string, status string) (Application, error) {
	row := q.db.QueryRow(ctx, `
		UPDATE applications
		SET status = $2, updated_at = now()
		WHERE id = $1::uuid
		RETURNING id::text, company_id::text, resume_version_id::text, title, role_track, source,
			status, location, employment_type, job_url, applied_at, deadline_at, notes, created_at, updated_at
	`, id, status)
	return scanApplication(row)
}

func (q *Queries) DeleteApplication(ctx context.Context, id string) error {
	tag, err := q.db.Exec(ctx, `DELETE FROM applications WHERE id = $1::uuid`, id)
	if err != nil {
		return err
	}
	return ensureAffected(tag)
}

type applicationScanner interface {
	Scan(dest ...any) error
}

func scanApplication(row applicationScanner) (Application, error) {
	var application Application
	var resumeVersionID, source, location, employmentType, jobURL, notes sql.NullString
	var appliedAt, deadlineAt sql.NullTime
	err := row.Scan(
		&application.ID,
		&application.CompanyID,
		&resumeVersionID,
		&application.Title,
		&application.RoleTrack,
		&source,
		&application.Status,
		&location,
		&employmentType,
		&jobURL,
		&appliedAt,
		&deadlineAt,
		&notes,
		&application.CreatedAt,
		&application.UpdatedAt,
	)
	application.ResumeVersionID = nullStringPtr(resumeVersionID)
	application.Source = nullStringPtr(source)
	application.Location = nullStringPtr(location)
	application.EmploymentType = nullStringPtr(employmentType)
	application.JobURL = nullStringPtr(jobURL)
	application.AppliedAt = nullTimePtr(appliedAt)
	application.DeadlineAt = nullTimePtr(deadlineAt)
	application.Notes = nullStringPtr(notes)
	return application, err
}
