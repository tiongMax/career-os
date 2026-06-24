package applications

import (
	"encoding/json"
	"time"
)

const (
	StatusSaved            = "saved"
	StatusApplied          = "applied"
	StatusOnlineAssessment = "online_assessment"
	StatusRecruiterScreen  = "recruiter_screen"
	StatusTechnicalScreen  = "technical_screen"
	StatusTechnicalScreen2 = "technical_screen_2"
	StatusTechnicalScreen3 = "technical_screen_3"
	StatusTechnicalScreen4 = "technical_screen_4"
	StatusOnsite           = "onsite"
	StatusOffer            = "offer"
	StatusRejected         = "rejected"
	StatusWithdrawn        = "withdrawn"
)

type Application struct {
	ID              string
	CompanyID       string
	ResumeVersionID *string
	Title           string
	RoleTrack       string
	RoleTracks      []string
	Source          *string
	Status          string
	Location        *string
	EmploymentType  *string
	JobURL          *string
	PortalAccount   *string
	PortalPassword  *string
	AppliedAt       *time.Time
	DeadlineAt      *time.Time
	Notes           *string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type Draft struct {
	CompanyID       string
	ResumeVersionID *string
	Title           string
	RoleTrack       string
	RoleTracks      []string
	Source          *string
	Status          *string
	Location        *string
	EmploymentType  *string
	JobURL          *string
	PortalAccount   *string
	PortalPassword  *string
	AppliedAt       *time.Time
	DeadlineAt      *time.Time
	Notes           *string
}

type Patch struct {
	ID              string
	CompanyID       *string
	ResumeVersionID *string
	Title           *string
	RoleTrack       *string
	RoleTracks      []string
	Status          *string
	Source          *string
	Location        *string
	EmploymentType  *string
	JobURL          *string
	PortalAccount   *string
	PortalPassword  *string
	AppliedAt       *time.Time
	DeadlineAt      *time.Time
	Notes           *string
}

type StatusChange struct {
	ID     string
	Status string
}

type AuditLog struct {
	ID         string
	EntityType string
	EntityID   string
	Action     string
	OldValue   json.RawMessage
	NewValue   json.RawMessage
	CreatedAt  time.Time
}
