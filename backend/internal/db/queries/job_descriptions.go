package queries

import (
	"context"
	"database/sql"
)

type CreateJobDescriptionParams struct {
	ApplicationID     string   `json:"-"`
	RawText           string   `json:"raw_text"`
	ExtractedKeywords []string `json:"extracted_keywords"`
	AISummary         *string  `json:"ai_summary"`
}

type UpdateJobDescriptionParams struct {
	ID                string   `json:"-"`
	RawText           *string  `json:"raw_text"`
	ExtractedKeywords []string `json:"extracted_keywords"`
	SetKeywords       bool     `json:"-"`
	AISummary         *string  `json:"ai_summary"`
}

func (q *Queries) CreateJobDescription(ctx context.Context, arg CreateJobDescriptionParams) (JobDescription, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO job_descriptions (application_id, raw_text, extracted_keywords, ai_summary)
		VALUES ($1::uuid, $2, $3, $4)
		RETURNING id::text, application_id::text, raw_text, extracted_keywords, ai_summary, created_at, updated_at
	`, arg.ApplicationID, arg.RawText, arg.ExtractedKeywords, arg.AISummary)
	return scanJobDescription(row)
}

func (q *Queries) GetJobDescriptionByApplication(ctx context.Context, applicationID string) (JobDescription, error) {
	row := q.db.QueryRow(ctx, `
		SELECT id::text, application_id::text, raw_text, extracted_keywords, ai_summary, created_at, updated_at
		FROM job_descriptions
		WHERE application_id = $1::uuid
		ORDER BY created_at DESC
		LIMIT 1
	`, applicationID)
	return scanJobDescription(row)
}

func (q *Queries) UpdateJobDescription(ctx context.Context, arg UpdateJobDescriptionParams) (JobDescription, error) {
	row := q.db.QueryRow(ctx, `
		UPDATE job_descriptions
		SET
			raw_text = COALESCE($2, raw_text),
			extracted_keywords = CASE WHEN $4 THEN $3 ELSE extracted_keywords END,
			ai_summary = COALESCE($5, ai_summary),
			updated_at = now()
		WHERE id = $1::uuid
		RETURNING id::text, application_id::text, raw_text, extracted_keywords, ai_summary, created_at, updated_at
	`, arg.ID, arg.RawText, arg.ExtractedKeywords, arg.SetKeywords, arg.AISummary)
	return scanJobDescription(row)
}

type jobDescriptionScanner interface {
	Scan(dest ...any) error
}

func scanJobDescription(row jobDescriptionScanner) (JobDescription, error) {
	var jobDescription JobDescription
	var aiSummary sql.NullString
	err := row.Scan(
		&jobDescription.ID,
		&jobDescription.ApplicationID,
		&jobDescription.RawText,
		&jobDescription.ExtractedKeywords,
		&aiSummary,
		&jobDescription.CreatedAt,
		&jobDescription.UpdatedAt,
	)
	jobDescription.AISummary = nullStringPtr(aiSummary)
	if jobDescription.ExtractedKeywords == nil {
		jobDescription.ExtractedKeywords = []string{}
	}
	return jobDescription, err
}
