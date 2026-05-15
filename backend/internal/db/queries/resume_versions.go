package queries

import (
	"context"
	"database/sql"
)

type CreateResumeVersionParams struct {
	Name        string   `json:"name"`
	Track       string   `json:"track"`
	FilePath    *string  `json:"file_path"`
	ContentText *string  `json:"content_text"`
	Tags        []string `json:"tags"`
}

type UpdateResumeVersionParams struct {
	ID          string   `json:"-"`
	Name        *string  `json:"name"`
	Track       *string  `json:"track"`
	FilePath    *string  `json:"file_path"`
	ContentText *string  `json:"content_text"`
	Tags        []string `json:"tags"`
	SetTags     bool     `json:"-"`
}

func (q *Queries) CreateResumeVersion(ctx context.Context, arg CreateResumeVersionParams) (ResumeVersion, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO resume_versions (name, track, file_path, content_text, tags)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id::text, name, track, file_path, content_text, tags, created_at, updated_at
	`, arg.Name, arg.Track, arg.FilePath, arg.ContentText, arg.Tags)
	return scanResumeVersion(row)
}

func (q *Queries) ListResumeVersions(ctx context.Context) ([]ResumeVersion, error) {
	rows, err := q.db.Query(ctx, `
		SELECT id::text, name, track, file_path, content_text, tags, created_at, updated_at
		FROM resume_versions
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var resumes []ResumeVersion
	for rows.Next() {
		resume, err := scanResumeVersion(rows)
		if err != nil {
			return nil, err
		}
		resumes = append(resumes, resume)
	}
	return resumes, rows.Err()
}

func (q *Queries) GetResumeVersion(ctx context.Context, id string) (ResumeVersion, error) {
	row := q.db.QueryRow(ctx, `
		SELECT id::text, name, track, file_path, content_text, tags, created_at, updated_at
		FROM resume_versions
		WHERE id = $1::uuid
	`, id)
	return scanResumeVersion(row)
}

func (q *Queries) UpdateResumeVersion(ctx context.Context, arg UpdateResumeVersionParams) (ResumeVersion, error) {
	row := q.db.QueryRow(ctx, `
		UPDATE resume_versions
		SET
			name = COALESCE($2, name),
			track = COALESCE($3, track),
			file_path = COALESCE($4, file_path),
			content_text = COALESCE($5, content_text),
			tags = CASE WHEN $7 THEN $6 ELSE tags END,
			updated_at = now()
		WHERE id = $1::uuid
		RETURNING id::text, name, track, file_path, content_text, tags, created_at, updated_at
	`, arg.ID, arg.Name, arg.Track, arg.FilePath, arg.ContentText, arg.Tags, arg.SetTags)
	return scanResumeVersion(row)
}

func (q *Queries) DeleteResumeVersion(ctx context.Context, id string) error {
	tag, err := q.db.Exec(ctx, `DELETE FROM resume_versions WHERE id = $1::uuid`, id)
	if err != nil {
		return err
	}
	return ensureAffected(tag)
}

type resumeVersionScanner interface {
	Scan(dest ...any) error
}

func scanResumeVersion(row resumeVersionScanner) (ResumeVersion, error) {
	var resume ResumeVersion
	var filePath, contentText sql.NullString
	err := row.Scan(
		&resume.ID,
		&resume.Name,
		&resume.Track,
		&filePath,
		&contentText,
		&resume.Tags,
		&resume.CreatedAt,
		&resume.UpdatedAt,
	)
	resume.FilePath = nullStringPtr(filePath)
	resume.ContentText = nullStringPtr(contentText)
	if resume.Tags == nil {
		resume.Tags = []string{}
	}
	return resume, err
}
