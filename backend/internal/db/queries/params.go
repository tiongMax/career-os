package queries

import (
	"context"
	"time"

	"careeros/backend/internal/db/sqlc"

	"github.com/jackc/pgx/v5"
)

type CreateCompanySQLParams = sqlc.CreateCompanySQLParams
type UpdateCompanySQLParams = sqlc.UpdateCompanySQLParams
type CreateApplicationSQLParams = sqlc.CreateApplicationSQLParams
type UpdateApplicationSQLParams = sqlc.UpdateApplicationSQLParams
type UpdateApplicationStatusSQLParams = sqlc.UpdateApplicationStatusSQLParams
type CreateAuditLogSQLParams = sqlc.CreateAuditLogSQLParams
type ListAuditLogsForEntitySQLParams = sqlc.ListAuditLogsForEntitySQLParams
type CreateContactSQLParams = sqlc.CreateContactSQLParams
type UpdateContactSQLParams = sqlc.UpdateContactSQLParams
type CreateInterviewRoundSQLParams = sqlc.CreateInterviewRoundSQLParams
type UpdateInterviewRoundSQLParams = sqlc.UpdateInterviewRoundSQLParams
type CreateJobDescriptionSQLParams = sqlc.CreateJobDescriptionSQLParams
type UpdateJobDescriptionSQLParams = sqlc.UpdateJobDescriptionSQLParams
type CreateReminderSQLParams = sqlc.CreateReminderSQLParams
type UpdateReminderSQLParams = sqlc.UpdateReminderSQLParams
type UpdateReminderStatusSQLParams = sqlc.UpdateReminderStatusSQLParams
type MarkReminderRetrySQLParams = sqlc.MarkReminderRetrySQLParams
type CreateReminderDeliverySQLParams = sqlc.CreateReminderDeliverySQLParams
type CreateFailedReminderJobSQLParams = sqlc.CreateFailedReminderJobSQLParams
type CreateResumeVersionSQLParams = sqlc.CreateResumeVersionSQLParams
type UpdateResumeVersionSQLParams = sqlc.UpdateResumeVersionSQLParams

type CreateCompanyParams = CreateCompanySQLParams
type UpdateCompanyParams = UpdateCompanySQLParams
type CreateAuditLogParams = CreateAuditLogSQLParams

type CreateResumeVersionParams struct {
	Name        string   `json:"name"`
	Track       string   `json:"track"`
	ContentText *string  `json:"content_text"`
	Tags        []string `json:"tags"`
}

type UpdateResumeVersionParams struct {
	ID          string   `json:"-"`
	Name        *string  `json:"name"`
	Track       *string  `json:"track"`
	ContentText *string  `json:"content_text"`
	SetTags     bool     `json:"-"`
	Tags        []string `json:"tags"`
}

type CreateApplicationParams struct {
	CompanyID       string     `json:"company_id"`
	ResumeVersionID *string    `json:"resume_version_id"`
	Title           string     `json:"title"`
	RoleTrack       string     `json:"role_track"`
	RoleTracks      []string   `json:"role_tracks"`
	Source          *string    `json:"source"`
	Status          *string    `json:"status"`
	Location        *string    `json:"location"`
	EmploymentType  *string    `json:"employment_type"`
	JobURL          *string    `json:"job_url"`
	PortalAccount   *string    `json:"portal_account"`
	PortalPassword  *string    `json:"portal_password"`
	AppliedAt       *time.Time `json:"applied_at"`
	DeadlineAt      *time.Time `json:"deadline_at"`
	Notes           *string    `json:"notes"`
}

type UpdateApplicationParams struct {
	ID              string     `json:"-"`
	CompanyID       *string    `json:"company_id"`
	ResumeVersionID *string    `json:"resume_version_id"`
	Title           *string    `json:"title"`
	RoleTrack       *string    `json:"role_track"`
	RoleTracks      []string   `json:"role_tracks"`
	Status          *string    `json:"status"`
	Source          *string    `json:"source"`
	Location        *string    `json:"location"`
	EmploymentType  *string    `json:"employment_type"`
	JobURL          *string    `json:"job_url"`
	PortalAccount   *string    `json:"portal_account"`
	PortalPassword  *string    `json:"portal_password"`
	AppliedAt       *time.Time `json:"applied_at"`
	DeadlineAt      *time.Time `json:"deadline_at"`
	Notes           *string    `json:"notes"`
}

type CreateContactParams struct {
	CompanyID    string  `json:"company_id"`
	Name         string  `json:"name"`
	Role         *string `json:"role"`
	Email        *string `json:"email"`
	LinkedinURL  *string `json:"linkedin_url"`
	Relationship *string `json:"relationship"`
	Notes        *string `json:"notes"`
}

type UpdateContactParams struct {
	ID           string  `json:"-"`
	CompanyID    *string `json:"company_id"`
	Name         *string `json:"name"`
	Role         *string `json:"role"`
	Email        *string `json:"email"`
	LinkedinURL  *string `json:"linkedin_url"`
	Relationship *string `json:"relationship"`
	Notes        *string `json:"notes"`
}

type CreateInterviewRoundParams = CreateInterviewRoundSQLParams
type UpdateInterviewRoundParams = UpdateInterviewRoundSQLParams

type CreateJobDescriptionParams struct {
	ApplicationID     string   `json:"-"`
	RawText           string   `json:"raw_text"`
	ExtractedKeywords []string `json:"extracted_keywords"`
	AISummary         *string  `json:"ai_summary"`
}

type UpdateJobDescriptionParams struct {
	ID                string   `json:"-"`
	RawText           *string  `json:"raw_text"`
	ExtractedKeywords []string `json:"extracted_keywords"`
	SetKeywords       bool     `json:"-"`
	AISummary         *string  `json:"ai_summary"`
}

type CreateReminderParams struct {
	ApplicationID  string    `json:"application_id"`
	ContactID      *string   `json:"contact_id"`
	Title          string    `json:"title"`
	Description    *string   `json:"description"`
	DueAt          time.Time `json:"due_at"`
	IdempotencyKey string    `json:"-"`
}

type UpdateReminderParams = UpdateReminderSQLParams

type MarkReminderRetryParams struct {
	ID         string
	Status     string
	RetryCount int32
	LastError  string
}

type CreateFailedReminderJobParams = CreateFailedReminderJobSQLParams

type transactionStarter interface {
	Begin(context.Context) (pgx.Tx, error)
}
