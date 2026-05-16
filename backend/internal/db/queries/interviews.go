package queries

import (
	"context"
	"database/sql"
	"time"
)

type CreateInterviewRoundParams struct {
	ApplicationID string     `json:"-"`
	RoundType     string     `json:"round_type"`
	ScheduledAt   *time.Time `json:"scheduled_at"`
	Interviewer   *string    `json:"interviewer"`
	Notes         *string    `json:"notes"`
	Outcome       *string    `json:"outcome"`
}

type UpdateInterviewRoundParams struct {
	ID          string     `json:"-"`
	RoundType   *string    `json:"round_type"`
	ScheduledAt *time.Time `json:"scheduled_at"`
	Interviewer *string    `json:"interviewer"`
	Notes       *string    `json:"notes"`
	Outcome     *string    `json:"outcome"`
}

func (q *Queries) CreateInterviewRound(ctx context.Context, arg CreateInterviewRoundParams) (InterviewRound, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO interview_rounds (application_id, round_type, scheduled_at, interviewer, notes, outcome)
		VALUES ($1::uuid, $2, $3, $4, $5, $6)
		RETURNING id::text, application_id::text, round_type, scheduled_at, interviewer, notes, outcome, created_at, updated_at
	`, arg.ApplicationID, arg.RoundType, arg.ScheduledAt, arg.Interviewer, arg.Notes, arg.Outcome)
	return scanInterviewRound(row)
}

func (q *Queries) ListInterviewRoundsByApplication(ctx context.Context, applicationID string) ([]InterviewRound, error) {
	rows, err := q.db.Query(ctx, `
		SELECT id::text, application_id::text, round_type, scheduled_at, interviewer, notes, outcome, created_at, updated_at
		FROM interview_rounds
		WHERE application_id = $1::uuid
		ORDER BY scheduled_at NULLS LAST, created_at DESC
	`, applicationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var interviews []InterviewRound
	for rows.Next() {
		interview, err := scanInterviewRound(rows)
		if err != nil {
			return nil, err
		}
		interviews = append(interviews, interview)
	}
	return interviews, rows.Err()
}

func (q *Queries) UpdateInterviewRound(ctx context.Context, arg UpdateInterviewRoundParams) (InterviewRound, error) {
	row := q.db.QueryRow(ctx, `
		UPDATE interview_rounds
		SET
			round_type = COALESCE($2, round_type),
			scheduled_at = COALESCE($3, scheduled_at),
			interviewer = COALESCE($4, interviewer),
			notes = COALESCE($5, notes),
			outcome = COALESCE($6, outcome),
			updated_at = now()
		WHERE id = $1::uuid
		RETURNING id::text, application_id::text, round_type, scheduled_at, interviewer, notes, outcome, created_at, updated_at
	`, arg.ID, arg.RoundType, arg.ScheduledAt, arg.Interviewer, arg.Notes, arg.Outcome)
	return scanInterviewRound(row)
}

func (q *Queries) DeleteInterviewRound(ctx context.Context, id string) error {
	tag, err := q.db.Exec(ctx, `DELETE FROM interview_rounds WHERE id = $1::uuid`, id)
	if err != nil {
		return err
	}
	return ensureAffected(tag)
}

type interviewRoundScanner interface {
	Scan(dest ...any) error
}

func scanInterviewRound(row interviewRoundScanner) (InterviewRound, error) {
	var interview InterviewRound
	var scheduledAt sql.NullTime
	var interviewer, notes, outcome sql.NullString
	err := row.Scan(
		&interview.ID,
		&interview.ApplicationID,
		&interview.RoundType,
		&scheduledAt,
		&interviewer,
		&notes,
		&outcome,
		&interview.CreatedAt,
		&interview.UpdatedAt,
	)
	interview.ScheduledAt = nullTimePtr(scheduledAt)
	interview.Interviewer = nullStringPtr(interviewer)
	interview.Notes = nullStringPtr(notes)
	interview.Outcome = nullStringPtr(outcome)
	return interview, err
}
