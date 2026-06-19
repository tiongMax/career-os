package postgres

import (
	"context"
)

func (q *Queries) CreateInterviewRound(ctx context.Context, arg CreateInterviewRoundParams) (InterviewRound, error) {
	row, err := q.CreateInterviewRoundSQL(ctx, arg)
	return interviewFrom(row.ID, row.ApplicationID, row.RoundType, row.ScheduledAt, row.Interviewer, row.Notes, row.Outcome, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) ListInterviewRoundsByApplication(ctx context.Context, applicationID string) ([]InterviewRound, error) {
	rows, err := q.ListInterviewRoundsByApplicationSQL(ctx, applicationID)
	if err != nil {
		return nil, err
	}
	interviews := make([]InterviewRound, 0, len(rows))
	for _, row := range rows {
		interviews = append(interviews, interviewFrom(row.ID, row.ApplicationID, row.RoundType, row.ScheduledAt, row.Interviewer, row.Notes, row.Outcome, row.CreatedAt, row.UpdatedAt))
	}
	return interviews, nil
}

func (q *Queries) UpdateInterviewRound(ctx context.Context, arg UpdateInterviewRoundParams) (InterviewRound, error) {
	row, err := q.UpdateInterviewRoundSQL(ctx, arg)
	return interviewFrom(row.ID, row.ApplicationID, row.RoundType, row.ScheduledAt, row.Interviewer, row.Notes, row.Outcome, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) DeleteInterviewRound(ctx context.Context, id string) error {
	return ensureRows(q.DeleteInterviewRoundRowCount(ctx, id))
}
