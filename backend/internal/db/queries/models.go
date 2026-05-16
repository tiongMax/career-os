package queries

import (
	"encoding/json"
	"time"
)

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
	FilePath    *string   `json:"file_path,omitempty"`
	ContentText *string   `json:"content_text,omitempty"`
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

type AuditLog struct {
	ID         string          `json:"id"`
	EntityType string          `json:"entity_type"`
	EntityID   string          `json:"entity_id"`
	Action     string          `json:"action"`
	OldValue   json.RawMessage `json:"old_value,omitempty"`
	NewValue   json.RawMessage `json:"new_value,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
}
