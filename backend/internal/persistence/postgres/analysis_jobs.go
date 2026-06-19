package postgres

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type CreateAnalysisJobParams struct {
	ApplicationID  string          `json:"application_id"`
	JobType        string          `json:"job_type"`
	InputSnapshot  json.RawMessage `json:"input_snapshot"`
	IdempotencyKey string          `json:"-"`
}

type FailAnalysisJobParams struct {
	ID         string
	Error      string
	MaxRetries int
}

const analysisJobColumns = `
id::text, application_id::text, job_type, status, input_snapshot, result, error_message,
retry_count, idempotency_key, started_at, completed_at, created_at, updated_at
`

const analysisJobReturningColumns = `
aj.id::text, aj.application_id::text, aj.job_type, aj.status, aj.input_snapshot, aj.result, aj.error_message,
aj.retry_count, aj.idempotency_key, aj.started_at, aj.completed_at, aj.created_at, aj.updated_at
`

func (q *Queries) CreateAnalysisJob(ctx context.Context, arg CreateAnalysisJobParams) (AnalysisJob, error) {
	const sql = `
		INSERT INTO analysis_jobs (application_id, job_type, input_snapshot, idempotency_key)
		VALUES ($1::uuid, $2, COALESCE($3, '{}'::jsonb), $4)
		RETURNING ` + analysisJobColumns

	var job AnalysisJob
	err := scanAnalysisJob(q.db.QueryRow(ctx, sql, arg.ApplicationID, arg.JobType, arg.InputSnapshot, arg.IdempotencyKey), &job)
	return job, err
}

func (q *Queries) ListAnalysisJobsByApplication(ctx context.Context, applicationID string) ([]AnalysisJob, error) {
	const sql = `
		SELECT ` + analysisJobColumns + `
		FROM analysis_jobs
		WHERE application_id = $1::uuid
		ORDER BY created_at DESC`

	return q.listAnalysisJobs(ctx, sql, applicationID)
}

func (q *Queries) ListAnalysisJobs(ctx context.Context) ([]AnalysisJob, error) {
	const sql = `
		SELECT ` + analysisJobColumns + `
		FROM analysis_jobs
		ORDER BY created_at DESC
		LIMIT 100`

	return q.listAnalysisJobs(ctx, sql)
}

func (q *Queries) listAnalysisJobs(ctx context.Context, sql string, args ...any) ([]AnalysisJob, error) {
	rows, err := q.db.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	jobs := make([]AnalysisJob, 0)
	for rows.Next() {
		var job AnalysisJob
		if err := scanAnalysisJob(rows, &job); err != nil {
			return nil, err
		}
		jobs = append(jobs, job)
	}
	return jobs, rows.Err()
}

func (q *Queries) GetAnalysisJob(ctx context.Context, id string) (AnalysisJob, error) {
	const sql = `
		SELECT ` + analysisJobColumns + `
		FROM analysis_jobs
		WHERE id = $1::uuid`

	var job AnalysisJob
	err := scanAnalysisJob(q.db.QueryRow(ctx, sql, id), &job)
	return job, err
}

func (q *Queries) ClaimNextQueuedAnalysisJob(ctx context.Context) (AnalysisJob, error) {
	const sql = `
		WITH next_job AS (
			SELECT id
			FROM analysis_jobs
			WHERE status = 'queued'
			ORDER BY created_at
			LIMIT 1
			FOR UPDATE SKIP LOCKED
		)
		UPDATE analysis_jobs aj
		SET status = 'processing',
			started_at = COALESCE(aj.started_at, now()),
			updated_at = now()
		FROM next_job
		WHERE aj.id = next_job.id
		RETURNING ` + analysisJobReturningColumns

	starter, ok := q.db.(transactionStarter)
	if !ok {
		var job AnalysisJob
		err := scanAnalysisJob(q.db.QueryRow(ctx, sql), &job)
		return job, err
	}

	tx, err := starter.Begin(ctx)
	if err != nil {
		return AnalysisJob{}, err
	}
	defer tx.Rollback(ctx)

	var job AnalysisJob
	if err := scanAnalysisJob(tx.QueryRow(ctx, sql), &job); err != nil {
		return AnalysisJob{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return AnalysisJob{}, err
	}
	return job, nil
}

func (q *Queries) CompleteAnalysisJob(ctx context.Context, id string, result json.RawMessage) (AnalysisJob, error) {
	const sql = `
		UPDATE analysis_jobs
		SET status = 'completed',
			result = $2,
			error_message = NULL,
			completed_at = now(),
			updated_at = now()
		WHERE id = $1::uuid AND status = 'processing'
		RETURNING ` + analysisJobColumns

	var job AnalysisJob
	err := scanAnalysisJob(q.db.QueryRow(ctx, sql, id, result), &job)
	return job, err
}

func (q *Queries) FailAnalysisJob(ctx context.Context, arg FailAnalysisJobParams) (AnalysisJob, error) {
	const sql = `
		UPDATE analysis_jobs
		SET status = CASE WHEN retry_count + 1 >= $3 THEN 'failed' ELSE 'queued' END,
			error_message = $2,
			retry_count = retry_count + 1,
			completed_at = CASE WHEN retry_count + 1 >= $3 THEN now() ELSE completed_at END,
			updated_at = now()
		WHERE id = $1::uuid AND status = 'processing'
		RETURNING ` + analysisJobColumns

	var job AnalysisJob
	err := scanAnalysisJob(q.db.QueryRow(ctx, sql, arg.ID, arg.Error, arg.MaxRetries), &job)
	return job, err
}

type analysisJobScanner interface {
	Scan(dest ...any) error
}

func scanAnalysisJob(scanner analysisJobScanner, job *AnalysisJob) error {
	var createdAt, updatedAt pgtype.Timestamptz
	if err := scanner.Scan(
		&job.ID,
		&job.ApplicationID,
		&job.JobType,
		&job.Status,
		&job.InputSnapshot,
		&job.Result,
		&job.ErrorMessage,
		&job.RetryCount,
		&job.IdempotencyKey,
		&job.StartedAt,
		&job.CompletedAt,
		&createdAt,
		&updatedAt,
	); err != nil {
		if err == pgx.ErrNoRows {
			return pgx.ErrNoRows
		}
		return err
	}
	if job.InputSnapshot == nil {
		job.InputSnapshot = json.RawMessage(`{}`)
	}
	job.CreatedAt = timeFrom(createdAt)
	job.UpdatedAt = timeFrom(updatedAt)
	return nil
}
