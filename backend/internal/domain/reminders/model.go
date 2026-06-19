package reminders

import (
	"encoding/json"
	"time"
)

type Reminder struct {
	ID             string
	ApplicationID  string
	ContactID      *string
	Title          string
	Description    *string
	DueAt          time.Time
	Status         string
	IdempotencyKey string
	RetryCount     int32
	LastError      *string
	DeliveredAt    *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type FailedJob struct {
	ID           string
	ReminderID   *string
	ErrorMessage string
	RetryCount   int32
	Payload      json.RawMessage
	FailedAt     time.Time
}
