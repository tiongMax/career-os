package httpapi

import (
	"encoding/json"
	"net/http"
	"time"

	appdomain "careeros/backend/internal/domain/applications"
	appsvc "careeros/backend/internal/services/applications"
)

type createApplicationRequest struct {
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

type updateApplicationRequest struct {
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

type applicationResponse struct {
	ID              string     `json:"id"`
	CompanyID       string     `json:"company_id"`
	ResumeVersionID *string    `json:"resume_version_id,omitempty"`
	Title           string     `json:"title"`
	RoleTrack       string     `json:"role_track"`
	RoleTracks      []string   `json:"role_tracks"`
	Source          *string    `json:"source,omitempty"`
	Status          string     `json:"status"`
	Location        *string    `json:"location,omitempty"`
	EmploymentType  *string    `json:"employment_type,omitempty"`
	JobURL          *string    `json:"job_url,omitempty"`
	PortalAccount   *string    `json:"portal_account,omitempty"`
	PortalPassword  *string    `json:"portal_password,omitempty"`
	AppliedAt       *time.Time `json:"applied_at,omitempty"`
	DeadlineAt      *time.Time `json:"deadline_at,omitempty"`
	Notes           *string    `json:"notes,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type auditLogResponse struct {
	ID         string          `json:"id"`
	EntityType string          `json:"entity_type"`
	EntityID   string          `json:"entity_id"`
	Action     string          `json:"action"`
	OldValue   json.RawMessage `json:"old_value,omitempty"`
	NewValue   json.RawMessage `json:"new_value,omitempty"`
	CreatedAt  time.Time       `json:"created_at"`
}

func (h Handler) createApplication(w http.ResponseWriter, r *http.Request) {
	var req createApplicationRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body: "+err.Error())
		return
	}
	application, err := h.applications.Create(r.Context(), createApplicationCommand(req))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, applicationDTO(application))
}

func (h Handler) listApplications(w http.ResponseWriter, r *http.Request) {
	applications, err := h.applications.List(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, applicationDTOs(applications))
}

func (h Handler) getApplication(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	application, err := h.applications.Get(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, applicationDTO(application))
}

func (h Handler) updateApplication(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	var req updateApplicationRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body: "+err.Error())
		return
	}
	application, err := h.applications.Update(r.Context(), updateApplicationCommand(id, req))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, applicationDTO(application))
}

func (h Handler) deleteApplication(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	if err := h.applications.Delete(r.Context(), id); err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeNoContent(w)
}

func (h Handler) updateApplicationStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	var req appsvc.ChangeStatusParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	req.ID = id
	application, err := h.applications.ChangeStatus(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, applicationDTO(application))
}

func (h Handler) listApplicationAuditLogs(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	logs, err := h.applications.ListAuditLogs(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, auditLogDTOs(logs))
}

func createApplicationCommand(req createApplicationRequest) appsvc.CreateParams {
	return appsvc.CreateParams{
		CompanyID:       req.CompanyID,
		ResumeVersionID: req.ResumeVersionID,
		Title:           req.Title,
		RoleTrack:       req.RoleTrack,
		RoleTracks:      req.RoleTracks,
		Source:          req.Source,
		Status:          req.Status,
		Location:        req.Location,
		EmploymentType:  req.EmploymentType,
		JobURL:          req.JobURL,
		PortalAccount:   req.PortalAccount,
		PortalPassword:  req.PortalPassword,
		AppliedAt:       req.AppliedAt,
		DeadlineAt:      req.DeadlineAt,
		Notes:           req.Notes,
	}
}

func updateApplicationCommand(id string, req updateApplicationRequest) appsvc.UpdateParams {
	return appsvc.UpdateParams{
		ID:              id,
		CompanyID:       req.CompanyID,
		ResumeVersionID: req.ResumeVersionID,
		Title:           req.Title,
		RoleTrack:       req.RoleTrack,
		RoleTracks:      req.RoleTracks,
		Status:          req.Status,
		Source:          req.Source,
		Location:        req.Location,
		EmploymentType:  req.EmploymentType,
		JobURL:          req.JobURL,
		PortalAccount:   req.PortalAccount,
		PortalPassword:  req.PortalPassword,
		AppliedAt:       req.AppliedAt,
		DeadlineAt:      req.DeadlineAt,
		Notes:           req.Notes,
	}
}

func applicationDTO(application appdomain.Application) applicationResponse {
	return applicationResponse{
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

func applicationDTOs(applications []appdomain.Application) []applicationResponse {
	out := make([]applicationResponse, 0, len(applications))
	for _, application := range applications {
		out = append(out, applicationDTO(application))
	}
	return out
}

func auditLogDTO(log appdomain.AuditLog) auditLogResponse {
	return auditLogResponse{
		ID:         log.ID,
		EntityType: log.EntityType,
		EntityID:   log.EntityID,
		Action:     log.Action,
		OldValue:   log.OldValue,
		NewValue:   log.NewValue,
		CreatedAt:  log.CreatedAt,
	}
}

func auditLogDTOs(logs []appdomain.AuditLog) []auditLogResponse {
	out := make([]auditLogResponse, 0, len(logs))
	for _, log := range logs {
		out = append(out, auditLogDTO(log))
	}
	return out
}
