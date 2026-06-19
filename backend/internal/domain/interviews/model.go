package interviews

import "time"

type InterviewRound struct {
	ID            string
	ApplicationID string
	RoundType     string
	ScheduledAt   *time.Time
	Interviewer   *string
	Notes         *string
	Outcome       *string
	CreatedAt     time.Time
	UpdatedAt     time.Time
}
