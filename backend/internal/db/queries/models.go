package queries

import (
	"encoding/json"
	"time"
)

type RoleTrack struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

type Company struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Website   *string   `json:"website,omitempty"`
	Industry  *string   `json:"industry,omitempty"`
	Location  *string   `json:"location,omitempty"`
	Notes     *string   `json:"notes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ResumeVersion struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Track       string    `json:"track"`
	ContentText *string   `json:"content_text,omitempty"`
	HasPDF      bool      `json:"has_pdf"`
	Tags        []string  `json:"tags"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type Application struct {
	ID              string     `json:"id"`
	CompanyID       string     `json:"company_id"`
	ResumeVersionID *string    `json:"resume_version_id,omitempty"`
	Title           string     `json:"title"`
	RoleTrack       string     `json:"role_track"`
	Source          *string    `json:"source,omitempty"`
	Status          string     `json:"status"`
	Location        *string    `json:"location,omitempty"`
	EmploymentType  *string    `json:"employment_type,omitempty"`
	JobURL          *string    `json:"job_url,omitempty"`
	AppliedAt       *time.Time `json:"applied_at,omitempty"`
	DeadlineAt      *time.Time `json:"deadline_at,omitempty"`
	Notes           *string    `json:"notes,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type JobDescription struct {
	ID                string    `json:"id"`
	ApplicationID     string    `json:"application_id"`
	RawText           string    `json:"raw_text"`
	ExtractedKeywords []string  `json:"extracted_keywords"`
	AISummary         *string   `json:"ai_summary,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type Contact struct {
	ID           string    `json:"id"`
	CompanyID    string    `json:"company_id"`
	Name         string    `json:"name"`
	Role         *string   `json:"role,omitempty"`
	Email        *string   `json:"email,omitempty"`
	LinkedinURL  *string   `json:"linkedin_url,omitempty"`
	Relationship *string   `json:"relationship,omitempty"`
	Notes        *string   `json:"notes,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type InterviewRound struct {
	ID            string     `json:"id"`
	ApplicationID string     `json:"application_id"`
	RoundType     string     `json:"round_type"`
	ScheduledAt   *time.Time `json:"scheduled_at,omitempty"`
	Interviewer   *string    `json:"interviewer,omitempty"`
	Notes         *string    `json:"notes,omitempty"`
	Outcome       *string    `json:"outcome,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

type Reminder struct {
	ID             string     `json:"id"`
	ApplicationID  string     `json:"application_id"`
	ContactID      *string    `json:"contact_id,omitempty"`
	Title          string     `json:"title"`
	Description    *string    `json:"description,omitempty"`
	DueAt          time.Time  `json:"due_at"`
	Status         string     `json:"status"`
	IdempotencyKey string     `json:"idempotency_key"`
	RetryCount     int32      `json:"retry_count"`
	LastError      *string    `json:"last_error,omitempty"`
	DeliveredAt    *time.Time `json:"delivered_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

type ReminderDelivery struct {
	ID             string    `json:"id"`
	ReminderID     string    `json:"reminder_id"`
	IdempotencyKey string    `json:"idempotency_key"`
	DeliveredAt    time.Time `json:"delivered_at"`
	CreatedAt      time.Time `json:"created_at"`
}

type FailedReminderJob struct {
	ID           string          `json:"id"`
	ReminderID   *string         `json:"reminder_id,omitempty"`
	ErrorMessage string          `json:"error_message"`
	RetryCount   int32           `json:"retry_count"`
	Payload      json.RawMessage `json:"payload"`
	FailedAt     time.Time       `json:"failed_at"`
}

type AnalysisJob struct {
	ID             string          `json:"id"`
	ApplicationID  string          `json:"application_id"`
	JobType        string          `json:"job_type"`
	Status         string          `json:"status"`
	InputSnapshot  json.RawMessage `json:"input_snapshot"`
	Result         json.RawMessage `json:"result,omitempty"`
	ErrorMessage   *string         `json:"error_message,omitempty"`
	RetryCount     int32           `json:"retry_count"`
	IdempotencyKey string          `json:"idempotency_key"`
	StartedAt      *time.Time      `json:"started_at,omitempty"`
	CompletedAt    *time.Time      `json:"completed_at,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type AuditLog struct {
	ID         string          `json:"id"`
	EntityType string          `json:"entity_type"`
	EntityID   string          `json:"entity_id"`
	Action     string          `json:"action"`
	OldValue   json.RawMessage `json:"old_value,omitempty"`
	NewValue   json.RawMessage `json:"new_value,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
}

type SearchResult struct {
	Type    string  `json:"type"`
	ID      string  `json:"id"`
	Title   string  `json:"title"`
	Company *string `json:"company,omitempty"`
	Rank    float64 `json:"rank"`
}

type AnalyticsSummary struct {
	Total            int64   `json:"total"`
	Active           int64   `json:"active"`
	Responded        int64   `json:"responded"`
	Offers           int64   `json:"offers"`
	ResponseRate     float64 `json:"response_rate"`
	OfferRate        float64 `json:"offer_rate"`
	PendingReminders int64   `json:"pending_reminders"`
}

type StatusCount struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

type TrackCount struct {
	Track string `json:"track"`
	Count int64  `json:"count"`
}

type ResumeVersionPerformance struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Track        string  `json:"track"`
	Applications int64   `json:"applications"`
	Responses    int64   `json:"responses"`
	Interviews   int64   `json:"interviews"`
	Offers       int64   `json:"offers"`
	ResponseRate float64 `json:"response_rate"`
	OfferRate    float64 `json:"offer_rate"`
}

type SourcePerformance struct {
	Source       string  `json:"source"`
	Applications int64   `json:"applications"`
	Responses    int64   `json:"responses"`
	Offers       int64   `json:"offers"`
	ResponseRate float64 `json:"response_rate"`
}

type FunnelStep struct {
	Stage string `json:"stage"`
	Count int64  `json:"count"`
}

type UpcomingInterview struct {
	ID               string     `json:"id"`
	RoundType        string     `json:"round_type"`
	ScheduledAt      *time.Time `json:"scheduled_at,omitempty"`
	ApplicationTitle string     `json:"application_title"`
	CompanyName      string     `json:"company_name"`
}

type UpcomingReminder struct {
	ID               string    `json:"id"`
	Title            string    `json:"title"`
	DueAt            time.Time `json:"due_at"`
	ApplicationTitle string    `json:"application_title"`
}

type ResumeMatchResult struct {
	Matched          []string        `json:"matched"`
	Missing          []string        `json:"missing"`
	Score            float64         `json:"score"`
	ComparedKeywords int             `json:"compared_keywords"`
	Evidence         []SkillEvidence `json:"evidence"`
}

type SkillEvidence struct {
	Keyword string  `json:"keyword"`
	Source  string  `json:"source"`
	Weight  float64 `json:"weight"`
}

type RecommendedResumeResult struct {
	ResumeVersion ResumeVersion `json:"resume_version"`
	Matched       []string      `json:"matched"`
	Missing       []string      `json:"missing"`
	Score         float64       `json:"score"`
}

type PrepContext struct {
	Application    Application      `json:"application"`
	Company        Company          `json:"company"`
	JobDescription *JobDescription  `json:"job_description,omitempty"`
	Resume         *ResumeVersion   `json:"resume,omitempty"`
	Interviews     []InterviewRound `json:"interviews"`
	Contacts       []Contact        `json:"contacts"`
	AuditLogs      []AuditLog       `json:"audit_logs"`
}

type PrepBrief struct {
	RoleSummary   string    `json:"role_summary"`
	KeyGaps       []string  `json:"key_gaps"`
	FocusAreas    []string  `json:"focus_areas"`
	TalkingPoints []string  `json:"talking_points"`
	GeneratedAt   time.Time `json:"generated_at"`
}
