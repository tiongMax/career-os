package applications

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	appdomain "careeros/backend/internal/domain/applications"
	"careeros/backend/internal/persistence/postgres"
)

var (
	ErrTitleRequired = errors.New("application title is required")
	ErrTrackRequired = errors.New("application track is required")
)

type Store interface {
	CreateApplication(context.Context, postgres.CreateApplicationParams) (postgres.Application, error)
	ListApplications(context.Context) ([]postgres.Application, error)
	GetApplication(context.Context, string) (postgres.Application, error)
	UpdateApplication(context.Context, postgres.UpdateApplicationParams) (postgres.Application, error)
	UpdateApplicationStatusAndCreateAudit(context.Context, string, string, postgres.CreateAuditLogParams) (postgres.Application, error)
	ListAuditLogsForEntity(context.Context, string, string) ([]postgres.AuditLog, error)
	DeleteApplication(context.Context, string) error
}

type Service struct {
	store Store
}

type CreateParams struct {
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

type UpdateParams struct {
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

type ChangeStatusParams struct {
	ID     string `json:"-"`
	Status string `json:"status"`
}

func New(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, arg CreateParams) (appdomain.Application, error) {
	if strings.TrimSpace(arg.Title) == "" {
		return appdomain.Application{}, ErrTitleRequired
	}
	if strings.TrimSpace(arg.RoleTrack) == "" && len(arg.RoleTracks) == 0 {
		return appdomain.Application{}, ErrTrackRequired
	}
	if arg.Status != nil {
		if _, ok := allowedTransitions[*arg.Status]; !ok {
			return appdomain.Application{}, ErrInvalidStatus
		}
	}
	application, err := s.store.CreateApplication(ctx, createStoreParams(arg))
	return applicationFromStore(application), err
}

func (s *Service) List(ctx context.Context) ([]appdomain.Application, error) {
	applications, err := s.store.ListApplications(ctx)
	if err != nil {
		return nil, err
	}
	return applicationsFromStore(applications), nil
}

func (s *Service) Get(ctx context.Context, id string) (appdomain.Application, error) {
	application, err := s.store.GetApplication(ctx, id)
	return applicationFromStore(application), err
}

func (s *Service) Update(ctx context.Context, arg UpdateParams) (appdomain.Application, error) {
	if arg.Title != nil && strings.TrimSpace(*arg.Title) == "" {
		return appdomain.Application{}, ErrTitleRequired
	}
	if len(arg.RoleTracks) > 0 && !hasAnyTrack(arg.RoleTracks) {
		return appdomain.Application{}, ErrTrackRequired
	}
	if arg.Status != nil {
		if _, ok := allowedTransitions[*arg.Status]; !ok {
			return appdomain.Application{}, ErrInvalidStatus
		}
	}
	application, err := s.store.UpdateApplication(ctx, updateStoreParams(arg))
	return applicationFromStore(application), err
}

func (s *Service) ChangeStatus(ctx context.Context, arg ChangeStatusParams) (appdomain.Application, error) {
	current, err := s.store.GetApplication(ctx, arg.ID)
	if err != nil {
		return appdomain.Application{}, err
	}
	if err := ValidateTransition(current.Status, arg.Status); err != nil {
		return appdomain.Application{}, err
	}
	auditLog, err := statusChangeAuditLog(arg.ID, current.Status, arg.Status)
	if err != nil {
		return appdomain.Application{}, err
	}
	application, err := s.store.UpdateApplicationStatusAndCreateAudit(ctx, arg.ID, arg.Status, auditLog)
	return applicationFromStore(application), err
}

func (s *Service) ListAuditLogs(ctx context.Context, applicationID string) ([]appdomain.AuditLog, error) {
	logs, err := s.store.ListAuditLogsForEntity(ctx, "application", applicationID)
	if err != nil {
		return nil, err
	}
	return auditLogsFromStore(logs), nil
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.store.DeleteApplication(ctx, id)
}

func hasAnyTrack(tracks []string) bool {
	for _, track := range tracks {
		if strings.TrimSpace(track) != "" {
			return true
		}
	}
	return false
}

func createStoreParams(arg CreateParams) postgres.CreateApplicationParams {
	return postgres.CreateApplicationParams{
		CompanyID:       arg.CompanyID,
		ResumeVersionID: arg.ResumeVersionID,
		Title:           arg.Title,
		RoleTrack:       arg.RoleTrack,
		RoleTracks:      arg.RoleTracks,
		Source:          arg.Source,
		Status:          arg.Status,
		Location:        arg.Location,
		EmploymentType:  arg.EmploymentType,
		JobURL:          arg.JobURL,
		PortalAccount:   arg.PortalAccount,
		PortalPassword:  arg.PortalPassword,
		AppliedAt:       arg.AppliedAt,
		DeadlineAt:      arg.DeadlineAt,
		Notes:           arg.Notes,
	}
}

func updateStoreParams(arg UpdateParams) postgres.UpdateApplicationParams {
	return postgres.UpdateApplicationParams{
		ID:              arg.ID,
		CompanyID:       arg.CompanyID,
		ResumeVersionID: arg.ResumeVersionID,
		Title:           arg.Title,
		RoleTrack:       arg.RoleTrack,
		RoleTracks:      arg.RoleTracks,
		Status:          arg.Status,
		Source:          arg.Source,
		Location:        arg.Location,
		EmploymentType:  arg.EmploymentType,
		JobURL:          arg.JobURL,
		PortalAccount:   arg.PortalAccount,
		PortalPassword:  arg.PortalPassword,
		AppliedAt:       arg.AppliedAt,
		DeadlineAt:      arg.DeadlineAt,
		Notes:           arg.Notes,
	}
}

func statusChangeAuditLog(applicationID string, oldStatus string, newStatus string) (postgres.CreateAuditLogParams, error) {
	oldValue, err := json.Marshal(map[string]string{"status": oldStatus})
	if err != nil {
		return postgres.CreateAuditLogParams{}, err
	}
	newValue, err := json.Marshal(map[string]string{"status": newStatus})
	if err != nil {
		return postgres.CreateAuditLogParams{}, err
	}
	return postgres.CreateAuditLogParams{
		EntityType: "application",
		EntityID:   applicationID,
		Action:     "status_changed",
		OldValue:   oldValue,
		NewValue:   newValue,
	}, nil
}

func applicationFromStore(application postgres.Application) appdomain.Application {
	return appdomain.Application{
		ID:              application.ID,
		CompanyID:       application.CompanyID,
		ResumeVersionID: application.ResumeVersionID,
		Title:           application.Title,
		RoleTrack:       application.RoleTrack,
		RoleTracks:      application.RoleTracks,
		Source:          application.Source,
		Status:          application.Status,
		Location:        application.Location,
		EmploymentType:  application.EmploymentType,
		JobURL:          application.JobURL,
		PortalAccount:   application.PortalAccount,
		PortalPassword:  application.PortalPassword,
		AppliedAt:       application.AppliedAt,
		DeadlineAt:      application.DeadlineAt,
		Notes:           application.Notes,
		CreatedAt:       application.CreatedAt,
		UpdatedAt:       application.UpdatedAt,
	}
}

func applicationsFromStore(applications []postgres.Application) []appdomain.Application {
	out := make([]appdomain.Application, 0, len(applications))
	for _, application := range applications {
		out = append(out, applicationFromStore(application))
	}
	return out
}

func auditLogFromStore(log postgres.AuditLog) appdomain.AuditLog {
	return appdomain.AuditLog{
		ID:         log.ID,
		EntityType: log.EntityType,
		EntityID:   log.EntityID,
		Action:     log.Action,
		OldValue:   log.OldValue,
		NewValue:   log.NewValue,
		CreatedAt:  log.CreatedAt,
	}
}

func auditLogsFromStore(logs []postgres.AuditLog) []appdomain.AuditLog {
	out := make([]appdomain.AuditLog, 0, len(logs))
	for _, log := range logs {
		out = append(out, auditLogFromStore(log))
	}
	return out
}
