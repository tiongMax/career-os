package http

import (
	"context"
	"errors"
	"net/http"

	"careeros/backend/internal/db/queries"
	appsvc "careeros/backend/internal/services/applications"
	companysvc "careeros/backend/internal/services/companies"
	contactsvc "careeros/backend/internal/services/contacts"
	interviewsvc "careeros/backend/internal/services/interviews"
	jdsvc "careeros/backend/internal/services/jobdescriptions"
	remindersvc "careeros/backend/internal/services/reminders"
	resumesvc "careeros/backend/internal/services/resumes"

	"github.com/jackc/pgx/v5/pgconn"
)

type Handler struct {
	companies       companyService
	resumes         resumeService
	applications    applicationService
	jobDescriptions jobDescriptionService
	contacts        contactService
	interviews      interviewService
	reminders       reminderService
}

type companyService interface {
	Create(context.Context, queries.CreateCompanyParams) (queries.Company, error)
	List(context.Context) ([]queries.Company, error)
	Get(context.Context, string) (queries.Company, error)
	Update(context.Context, queries.UpdateCompanyParams) (queries.Company, error)
	Delete(context.Context, string) error
}

type resumeService interface {
	Create(context.Context, queries.CreateResumeVersionParams) (queries.ResumeVersion, error)
	List(context.Context) ([]queries.ResumeVersion, error)
	Get(context.Context, string) (queries.ResumeVersion, error)
	Update(context.Context, queries.UpdateResumeVersionParams) (queries.ResumeVersion, error)
	Delete(context.Context, string) error
}

type applicationService interface {
	Create(context.Context, queries.CreateApplicationParams) (queries.Application, error)
	List(context.Context) ([]queries.Application, error)
	Get(context.Context, string) (queries.Application, error)
	Update(context.Context, queries.UpdateApplicationParams) (queries.Application, error)
	ChangeStatus(context.Context, appsvc.ChangeStatusParams) (queries.Application, error)
	ListAuditLogs(context.Context, string) ([]queries.AuditLog, error)
	Delete(context.Context, string) error
}

type jobDescriptionService interface {
	Create(context.Context, queries.CreateJobDescriptionParams) (queries.JobDescription, error)
	GetByApplication(context.Context, string) (queries.JobDescription, error)
	Update(context.Context, queries.UpdateJobDescriptionParams) (queries.JobDescription, error)
}

type contactService interface {
	Create(context.Context, queries.CreateContactParams) (queries.Contact, error)
	List(context.Context) ([]queries.Contact, error)
	Get(context.Context, string) (queries.Contact, error)
	Update(context.Context, queries.UpdateContactParams) (queries.Contact, error)
	Delete(context.Context, string) error
}

type interviewService interface {
	Create(context.Context, queries.CreateInterviewRoundParams) (queries.InterviewRound, error)
	ListByApplication(context.Context, string) ([]queries.InterviewRound, error)
	Update(context.Context, queries.UpdateInterviewRoundParams) (queries.InterviewRound, error)
	Delete(context.Context, string) error
}

type reminderService interface {
	Create(context.Context, queries.CreateReminderParams) (queries.Reminder, error)
	List(context.Context) ([]queries.Reminder, error)
	ListDue(context.Context) ([]queries.Reminder, error)
	Get(context.Context, string) (queries.Reminder, error)
	Update(context.Context, queries.UpdateReminderParams) (queries.Reminder, error)
	Cancel(context.Context, string) (queries.Reminder, error)
	Delete(context.Context, string) error
}

func NewHandler(
	companies companyService,
	resumes resumeService,
	applications applicationService,
	jobDescriptions jobDescriptionService,
	contacts contactService,
	interviews interviewService,
	reminders reminderService,
) Handler {
	return Handler{
		companies:       companies,
		resumes:         resumes,
		applications:    applications,
		jobDescriptions: jobDescriptions,
		contacts:        contacts,
		interviews:      interviews,
		reminders:       reminders,
	}
}

func (h Handler) createCompany(w http.ResponseWriter, r *http.Request) {
	var req queries.CreateCompanyParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	company, err := h.companies.Create(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, company)
}

func (h Handler) listCompanies(w http.ResponseWriter, r *http.Request) {
	companies, err := h.companies.List(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, companies)
}

func (h Handler) getCompany(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid company id")
		return
	}
	company, err := h.companies.Get(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, company)
}

func (h Handler) updateCompany(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid company id")
		return
	}
	var req queries.UpdateCompanyParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	req.ID = id
	company, err := h.companies.Update(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, company)
}

func (h Handler) deleteCompany(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid company id")
		return
	}
	if err := h.companies.Delete(r.Context(), id); err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeNoContent(w)
}

func (h Handler) createResumeVersion(w http.ResponseWriter, r *http.Request) {
	var req queries.CreateResumeVersionParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	resume, err := h.resumes.Create(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, resume)
}

func (h Handler) listResumeVersions(w http.ResponseWriter, r *http.Request) {
	resumes, err := h.resumes.List(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resumes)
}

func (h Handler) getResumeVersion(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid resume version id")
		return
	}
	resume, err := h.resumes.Get(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resume)
}

type updateResumeVersionRequest struct {
	Name        *string   `json:"name"`
	Track       *string   `json:"track"`
	FilePath    *string   `json:"file_path"`
	ContentText *string   `json:"content_text"`
	Tags        *[]string `json:"tags"`
}

func (h Handler) updateResumeVersion(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid resume version id")
		return
	}
	var req updateResumeVersionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	arg := queries.UpdateResumeVersionParams{
		ID:          id,
		Name:        req.Name,
		Track:       req.Track,
		FilePath:    req.FilePath,
		ContentText: req.ContentText,
		SetTags:     req.Tags != nil,
	}
	if req.Tags != nil {
		arg.Tags = *req.Tags
	}
	resume, err := h.resumes.Update(r.Context(), arg)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, resume)
}

func (h Handler) deleteResumeVersion(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid resume version id")
		return
	}
	if err := h.resumes.Delete(r.Context(), id); err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeNoContent(w)
}

func (h Handler) createApplication(w http.ResponseWriter, r *http.Request) {
	var req queries.CreateApplicationParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	application, err := h.applications.Create(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, application)
}

func (h Handler) listApplications(w http.ResponseWriter, r *http.Request) {
	applications, err := h.applications.List(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, applications)
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
	writeJSON(w, http.StatusOK, application)
}

func (h Handler) updateApplication(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	var req queries.UpdateApplicationParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	req.ID = id
	application, err := h.applications.Update(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, application)
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
	writeJSON(w, http.StatusOK, application)
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
	writeJSON(w, http.StatusOK, logs)
}

func (h Handler) createJobDescription(w http.ResponseWriter, r *http.Request) {
	applicationID, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	var req queries.CreateJobDescriptionParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	req.ApplicationID = applicationID
	jobDescription, err := h.jobDescriptions.Create(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, jobDescription)
}

func (h Handler) getJobDescriptionByApplication(w http.ResponseWriter, r *http.Request) {
	applicationID, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	jobDescription, err := h.jobDescriptions.GetByApplication(r.Context(), applicationID)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, jobDescription)
}

type updateJobDescriptionRequest struct {
	RawText           *string   `json:"raw_text"`
	ExtractedKeywords *[]string `json:"extracted_keywords"`
	AISummary         *string   `json:"ai_summary"`
}

func (h Handler) updateJobDescription(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid job description id")
		return
	}
	var req updateJobDescriptionRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	arg := queries.UpdateJobDescriptionParams{
		ID:          id,
		RawText:     req.RawText,
		AISummary:   req.AISummary,
		SetKeywords: req.ExtractedKeywords != nil,
	}
	if req.ExtractedKeywords != nil {
		arg.ExtractedKeywords = *req.ExtractedKeywords
	}
	jobDescription, err := h.jobDescriptions.Update(r.Context(), arg)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, jobDescription)
}

func (h Handler) createContact(w http.ResponseWriter, r *http.Request) {
	var req queries.CreateContactParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	contact, err := h.contacts.Create(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, contact)
}

func (h Handler) listContacts(w http.ResponseWriter, r *http.Request) {
	contacts, err := h.contacts.List(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, contacts)
}

func (h Handler) getContact(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid contact id")
		return
	}
	contact, err := h.contacts.Get(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, contact)
}

func (h Handler) updateContact(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid contact id")
		return
	}
	var req queries.UpdateContactParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	req.ID = id
	contact, err := h.contacts.Update(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, contact)
}

func (h Handler) deleteContact(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid contact id")
		return
	}
	if err := h.contacts.Delete(r.Context(), id); err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeNoContent(w)
}

func (h Handler) createInterview(w http.ResponseWriter, r *http.Request) {
	applicationID, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	var req queries.CreateInterviewRoundParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	req.ApplicationID = applicationID
	interview, err := h.interviews.Create(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, interview)
}

func (h Handler) listApplicationInterviews(w http.ResponseWriter, r *http.Request) {
	applicationID, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	interviews, err := h.interviews.ListByApplication(r.Context(), applicationID)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, interviews)
}

func (h Handler) updateInterview(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid interview id")
		return
	}
	var req queries.UpdateInterviewRoundParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	req.ID = id
	interview, err := h.interviews.Update(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, interview)
}

func (h Handler) deleteInterview(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid interview id")
		return
	}
	if err := h.interviews.Delete(r.Context(), id); err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeNoContent(w)
}

func (h Handler) createReminder(w http.ResponseWriter, r *http.Request) {
	var req queries.CreateReminderParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	reminder, err := h.reminders.Create(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, reminder)
}

func (h Handler) listReminders(w http.ResponseWriter, r *http.Request) {
	reminders, err := h.reminders.List(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, reminders)
}

func (h Handler) listDueReminders(w http.ResponseWriter, r *http.Request) {
	reminders, err := h.reminders.ListDue(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, reminders)
}

func (h Handler) getReminder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid reminder id")
		return
	}
	reminder, err := h.reminders.Get(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, reminder)
}

func (h Handler) updateReminder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid reminder id")
		return
	}
	var req queries.UpdateReminderParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	req.ID = id
	reminder, err := h.reminders.Update(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, reminder)
}

func (h Handler) deleteReminder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid reminder id")
		return
	}
	if err := h.reminders.Delete(r.Context(), id); err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeNoContent(w)
}

func (h Handler) cancelReminder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid reminder id")
		return
	}
	reminder, err := h.reminders.Cancel(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, reminder)
}

func (h Handler) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case isNotFound(err):
		writeError(w, http.StatusNotFound, "not found")
	case errors.Is(err, appsvc.ErrInvalidTransition):
		writeError(w, http.StatusConflict, err.Error())
	case errors.Is(err, appsvc.ErrInvalidStatus),
		errors.Is(err, appsvc.ErrInvalidTrack),
		errors.Is(err, appsvc.ErrTitleRequired),
		errors.Is(err, companysvc.ErrNameRequired),
		errors.Is(err, contactsvc.ErrNameRequired),
		errors.Is(err, interviewsvc.ErrInvalidRoundType),
		errors.Is(err, resumesvc.ErrInvalidTrack),
		errors.Is(err, resumesvc.ErrNameRequired),
		errors.Is(err, jdsvc.ErrRawTextRequired),
		errors.Is(err, remindersvc.ErrTitleRequired),
		errors.Is(err, remindersvc.ErrDueAtRequired):
		writeError(w, http.StatusBadRequest, err.Error())
	case pgErrorCode(err, "23503"):
		writeError(w, http.StatusConflict, "request conflicts with existing related data")
	case pgErrorCode(err, "23514"), pgErrorCode(err, "22P02"):
		writeError(w, http.StatusBadRequest, "request violates data constraints")
	default:
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

func pgErrorCode(err error, code string) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == code
}
