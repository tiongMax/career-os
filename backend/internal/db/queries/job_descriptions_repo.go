package queries

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

func (q *Queries) CreateJobDescription(ctx context.Context, arg CreateJobDescriptionParams) (JobDescription, error) {
	row, err := q.CreateJobDescriptionSQL(ctx, CreateJobDescriptionSQLParams{
		ApplicationID:     arg.ApplicationID,
		RawText:           arg.RawText,
		ExtractedKeywords: arg.ExtractedKeywords,
		AiSummary:         arg.AISummary,
	})
	return jobDescriptionFrom(row.ID, row.ApplicationID, row.RawText, row.ExtractedKeywords, row.AiSummary, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) GetJobDescriptionByApplication(ctx context.Context, applicationID string) (JobDescription, error) {
	row, err := q.GetJobDescriptionByApplicationSQL(ctx, applicationID)
	return jobDescriptionFrom(row.ID, row.ApplicationID, row.RawText, row.ExtractedKeywords, row.AiSummary, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) GetJobDescriptionByID(ctx context.Context, id string) (JobDescription, error) {
	const sql = `SELECT id::text, application_id::text, raw_text, extracted_keywords, ai_summary, created_at, updated_at FROM job_descriptions WHERE id = $1::uuid`
	var row struct {
		ID                string             `json:"id"`
		ApplicationID     string             `json:"application_id"`
		RawText           string             `json:"raw_text"`
		ExtractedKeywords []string           `json:"extracted_keywords"`
		AiSummary         *string            `json:"ai_summary"`
		CreatedAt         pgtype.Timestamptz `json:"created_at"`
		UpdatedAt         pgtype.Timestamptz `json:"updated_at"`
	}
	err := q.db.QueryRow(ctx, sql, id).Scan(&row.ID, &row.ApplicationID, &row.RawText, &row.ExtractedKeywords, &row.AiSummary, &row.CreatedAt, &row.UpdatedAt)
	return jobDescriptionFrom(row.ID, row.ApplicationID, row.RawText, row.ExtractedKeywords, row.AiSummary, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateJobDescription(ctx context.Context, arg UpdateJobDescriptionParams) (JobDescription, error) {
	row, err := q.UpdateJobDescriptionSQL(ctx, UpdateJobDescriptionSQLParams{
		ID:                arg.ID,
		RawText:           arg.RawText,
		ExtractedKeywords: arg.ExtractedKeywords,
		SetKeywords:       arg.SetKeywords,
		AiSummary:         arg.AISummary,
	})
	return jobDescriptionFrom(row.ID, row.ApplicationID, row.RawText, row.ExtractedKeywords, row.AiSummary, row.CreatedAt, row.UpdatedAt), err
}
