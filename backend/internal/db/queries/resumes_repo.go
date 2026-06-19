package queries

import (
	"context"
)

func (q *Queries) CreateResumeVersion(ctx context.Context, arg CreateResumeVersionParams) (ResumeVersion, error) {
	row, err := q.CreateResumeVersionSQL(ctx, CreateResumeVersionSQLParams{
		Name:        arg.Name,
		Track:       arg.Track,
		ContentText: arg.ContentText,
		Tags:        arg.Tags,
	})
	return resumeVersionFrom(row.ID, row.Name, row.Track, row.ContentText, row.HasPDF, row.Tags, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) ListResumeVersions(ctx context.Context) ([]ResumeVersion, error) {
	rows, err := q.ListResumeVersionsSQL(ctx)
	if err != nil {
		return nil, err
	}
	resumes := make([]ResumeVersion, 0, len(rows))
	for _, row := range rows {
		resumes = append(resumes, resumeVersionFrom(row.ID, row.Name, row.Track, row.ContentText, row.HasPDF, row.Tags, row.CreatedAt, row.UpdatedAt))
	}
	return resumes, nil
}

func (q *Queries) GetResumeVersion(ctx context.Context, id string) (ResumeVersion, error) {
	row, err := q.GetResumeVersionSQL(ctx, id)
	return resumeVersionFrom(row.ID, row.Name, row.Track, row.ContentText, row.HasPDF, row.Tags, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateResumeVersion(ctx context.Context, arg UpdateResumeVersionParams) (ResumeVersion, error) {
	row, err := q.UpdateResumeVersionSQL(ctx, UpdateResumeVersionSQLParams{
		Name:        arg.Name,
		Track:       arg.Track,
		ContentText: arg.ContentText,
		SetTags:     arg.SetTags,
		Tags:        arg.Tags,
		ID:          arg.ID,
	})
	return resumeVersionFrom(row.ID, row.Name, row.Track, row.ContentText, row.HasPDF, row.Tags, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) DeleteResumeVersion(ctx context.Context, id string) error {
	return ensureRows(q.DeleteResumeVersionRowCount(ctx, id))
}

func (q *Queries) StorePDF(ctx context.Context, id string, data []byte) error {
	_, err := q.db.Exec(ctx, "UPDATE resume_versions SET pdf_data = $1, updated_at = now() WHERE id = $2::uuid", data, id)
	return err
}

func (q *Queries) GetPDF(ctx context.Context, id string) ([]byte, error) {
	var data []byte
	err := q.db.QueryRow(ctx, "SELECT pdf_data FROM resume_versions WHERE id = $1::uuid", id).Scan(&data)
	return data, err
}
