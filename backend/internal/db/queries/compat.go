package queries

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

type CreateCompanyParams = CreateCompanySQLParams
type UpdateCompanyParams = UpdateCompanySQLParams
type CreateResumeVersionParams = CreateResumeVersionSQLParams
type UpdateResumeVersionParams = UpdateResumeVersionSQLParams
type CreateAuditLogParams = CreateAuditLogSQLParams

type CreateApplicationParams struct {
	CompanyID       string     `json:"company_id"`
	ResumeVersionID *string    `json:"resume_version_id"`
	Title           string     `json:"title"`
	RoleTrack       string     `json:"role_track"`
	Source          *string    `json:"source"`
	Status          *string    `json:"status"`
	Location        *string    `json:"location"`
	EmploymentType  *string    `json:"employment_type"`
	JobURL          *string    `json:"job_url"`
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
	Source          *string    `json:"source"`
	Location        *string    `json:"location"`
	EmploymentType  *string    `json:"employment_type"`
	JobURL          *string    `json:"job_url"`
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

func IsNotFound(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func (q *Queries) CreateCompany(ctx context.Context, arg CreateCompanyParams) (Company, error) {
	row, err := q.CreateCompanySQL(ctx, arg)
	return companyFrom(row.ID, row.Name, row.Website, row.Industry, row.Location, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) ListCompanies(ctx context.Context) ([]Company, error) {
	rows, err := q.ListCompaniesSQL(ctx)
	if err != nil {
		return nil, err
	}
	companies := make([]Company, 0, len(rows))
	for _, row := range rows {
		companies = append(companies, companyFrom(row.ID, row.Name, row.Website, row.Industry, row.Location, row.Notes, row.CreatedAt, row.UpdatedAt))
	}
	return companies, nil
}

func (q *Queries) GetCompany(ctx context.Context, id string) (Company, error) {
	row, err := q.GetCompanySQL(ctx, id)
	return companyFrom(row.ID, row.Name, row.Website, row.Industry, row.Location, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateCompany(ctx context.Context, arg UpdateCompanyParams) (Company, error) {
	row, err := q.UpdateCompanySQL(ctx, arg)
	return companyFrom(row.ID, row.Name, row.Website, row.Industry, row.Location, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) DeleteCompany(ctx context.Context, id string) error {
	return ensureRows(q.DeleteCompanyRowCount(ctx, id))
}

func (q *Queries) CreateApplication(ctx context.Context, arg CreateApplicationParams) (Application, error) {
	row, err := q.CreateApplicationSQL(ctx, CreateApplicationSQLParams{
		CompanyID:       arg.CompanyID,
		ResumeVersionID: arg.ResumeVersionID,
		Title:           arg.Title,
		RoleTrack:       arg.RoleTrack,
		Source:          arg.Source,
		Status:          arg.Status,
		Location:        arg.Location,
		EmploymentType:  arg.EmploymentType,
		JobUrl:          arg.JobURL,
		AppliedAt:       arg.AppliedAt,
		DeadlineAt:      arg.DeadlineAt,
		Notes:           arg.Notes,
	})
	return applicationFrom(row.ID, row.CompanyID, row.ResumeVersionID, row.Title, row.RoleTrack, row.Source, row.Status, row.Location, row.EmploymentType, row.JobUrl, row.AppliedAt, row.DeadlineAt, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) ListApplications(ctx context.Context) ([]Application, error) {
	rows, err := q.ListApplicationsSQL(ctx)
	if err != nil {
		return nil, err
	}
	applications := make([]Application, 0, len(rows))
	for _, row := range rows {
		applications = append(applications, applicationFrom(row.ID, row.CompanyID, row.ResumeVersionID, row.Title, row.RoleTrack, row.Source, row.Status, row.Location, row.EmploymentType, row.JobUrl, row.AppliedAt, row.DeadlineAt, row.Notes, row.CreatedAt, row.UpdatedAt))
	}
	return applications, nil
}

func (q *Queries) GetApplication(ctx context.Context, id string) (Application, error) {
	row, err := q.GetApplicationSQL(ctx, id)
	return applicationFrom(row.ID, row.CompanyID, row.ResumeVersionID, row.Title, row.RoleTrack, row.Source, row.Status, row.Location, row.EmploymentType, row.JobUrl, row.AppliedAt, row.DeadlineAt, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateApplication(ctx context.Context, arg UpdateApplicationParams) (Application, error) {
	row, err := q.UpdateApplicationSQL(ctx, UpdateApplicationSQLParams{
		CompanyID:       arg.CompanyID,
		ResumeVersionID: arg.ResumeVersionID,
		Title:           arg.Title,
		RoleTrack:       arg.RoleTrack,
		Source:          arg.Source,
		Location:        arg.Location,
		EmploymentType:  arg.EmploymentType,
		JobUrl:          arg.JobURL,
		AppliedAt:       arg.AppliedAt,
		DeadlineAt:      arg.DeadlineAt,
		Notes:           arg.Notes,
		ID:              arg.ID,
	})
	return applicationFrom(row.ID, row.CompanyID, row.ResumeVersionID, row.Title, row.RoleTrack, row.Source, row.Status, row.Location, row.EmploymentType, row.JobUrl, row.AppliedAt, row.DeadlineAt, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateApplicationStatusWithAudit(ctx context.Context, id string, oldStatus string, newStatus string) (Application, error) {
	starter, ok := q.db.(transactionStarter)
	if !ok {
		return Application{}, errors.New("queries db does not support transactions")
	}
	tx, err := starter.Begin(ctx)
	if err != nil {
		return Application{}, err
	}
	defer tx.Rollback(ctx)

	txq := q.WithTx(tx)
	updatedRow, err := txq.UpdateApplicationStatusSQL(ctx, UpdateApplicationStatusSQLParams{ID: id, Status: newStatus})
	if err != nil {
		return Application{}, err
	}
	oldValue, err := json.Marshal(map[string]string{"status": oldStatus})
	if err != nil {
		return Application{}, err
	}
	newValue, err := json.Marshal(map[string]string{"status": newStatus})
	if err != nil {
		return Application{}, err
	}
	if _, err := txq.CreateAuditLog(ctx, CreateAuditLogParams{
		EntityType: "application",
		EntityID:   id,
		Action:     "status_changed",
		OldValue:   oldValue,
		NewValue:   newValue,
	}); err != nil {
		return Application{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Application{}, err
	}
	return applicationFrom(updatedRow.ID, updatedRow.CompanyID, updatedRow.ResumeVersionID, updatedRow.Title, updatedRow.RoleTrack, updatedRow.Source, updatedRow.Status, updatedRow.Location, updatedRow.EmploymentType, updatedRow.JobUrl, updatedRow.AppliedAt, updatedRow.DeadlineAt, updatedRow.Notes, updatedRow.CreatedAt, updatedRow.UpdatedAt), nil
}

func (q *Queries) DeleteApplication(ctx context.Context, id string) error {
	return ensureRows(q.DeleteApplicationRowCount(ctx, id))
}

func (q *Queries) CreateAuditLog(ctx context.Context, arg CreateAuditLogParams) (AuditLog, error) {
	row, err := q.CreateAuditLogSQL(ctx, arg)
	return auditLogFrom(row.ID, row.EntityType, row.EntityID, row.Action, row.OldValue, row.NewValue, row.CreatedAt), err
}

func (q *Queries) ListAuditLogsForEntity(ctx context.Context, entityType string, entityID string) ([]AuditLog, error) {
	rows, err := q.ListAuditLogsForEntitySQL(ctx, ListAuditLogsForEntitySQLParams{EntityType: entityType, EntityID: entityID})
	if err != nil {
		return nil, err
	}
	logs := make([]AuditLog, 0, len(rows))
	for _, row := range rows {
		logs = append(logs, auditLogFrom(row.ID, row.EntityType, row.EntityID, row.Action, row.OldValue, row.NewValue, row.CreatedAt))
	}
	return logs, nil
}

func (q *Queries) CreateResumeVersion(ctx context.Context, arg CreateResumeVersionParams) (ResumeVersion, error) {
	row, err := q.CreateResumeVersionSQL(ctx, arg)
	return resumeVersionFrom(row.ID, row.Name, row.Track, row.FilePath, row.ContentText, row.Tags, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) ListResumeVersions(ctx context.Context) ([]ResumeVersion, error) {
	rows, err := q.ListResumeVersionsSQL(ctx)
	if err != nil {
		return nil, err
	}
	resumes := make([]ResumeVersion, 0, len(rows))
	for _, row := range rows {
		resumes = append(resumes, resumeVersionFrom(row.ID, row.Name, row.Track, row.FilePath, row.ContentText, row.Tags, row.CreatedAt, row.UpdatedAt))
	}
	return resumes, nil
}

func (q *Queries) GetResumeVersion(ctx context.Context, id string) (ResumeVersion, error) {
	row, err := q.GetResumeVersionSQL(ctx, id)
	return resumeVersionFrom(row.ID, row.Name, row.Track, row.FilePath, row.ContentText, row.Tags, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateResumeVersion(ctx context.Context, arg UpdateResumeVersionParams) (ResumeVersion, error) {
	row, err := q.UpdateResumeVersionSQL(ctx, arg)
	return resumeVersionFrom(row.ID, row.Name, row.Track, row.FilePath, row.ContentText, row.Tags, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) DeleteResumeVersion(ctx context.Context, id string) error {
	return ensureRows(q.DeleteResumeVersionRowCount(ctx, id))
}

func (q *Queries) CreateContact(ctx context.Context, arg CreateContactParams) (Contact, error) {
	row, err := q.CreateContactSQL(ctx, CreateContactSQLParams{CompanyID: arg.CompanyID, Name: arg.Name, Role: arg.Role, Email: arg.Email, LinkedinUrl: arg.LinkedinURL, Relationship: arg.Relationship, Notes: arg.Notes})
	return contactFrom(row.ID, row.CompanyID, row.Name, row.Role, row.Email, row.LinkedinUrl, row.Relationship, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) ListContacts(ctx context.Context) ([]Contact, error) {
	rows, err := q.ListContactsSQL(ctx)
	if err != nil {
		return nil, err
	}
	contacts := make([]Contact, 0, len(rows))
	for _, row := range rows {
		contacts = append(contacts, contactFrom(row.ID, row.CompanyID, row.Name, row.Role, row.Email, row.LinkedinUrl, row.Relationship, row.Notes, row.CreatedAt, row.UpdatedAt))
	}
	return contacts, nil
}

func (q *Queries) GetContact(ctx context.Context, id string) (Contact, error) {
	row, err := q.GetContactSQL(ctx, id)
	return contactFrom(row.ID, row.CompanyID, row.Name, row.Role, row.Email, row.LinkedinUrl, row.Relationship, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateContact(ctx context.Context, arg UpdateContactParams) (Contact, error) {
	row, err := q.UpdateContactSQL(ctx, UpdateContactSQLParams{CompanyID: arg.CompanyID, Name: arg.Name, Role: arg.Role, Email: arg.Email, LinkedinUrl: arg.LinkedinURL, Relationship: arg.Relationship, Notes: arg.Notes, ID: arg.ID})
	return contactFrom(row.ID, row.CompanyID, row.Name, row.Role, row.Email, row.LinkedinUrl, row.Relationship, row.Notes, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) DeleteContact(ctx context.Context, id string) error {
	return ensureRows(q.DeleteContactRowCount(ctx, id))
}

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

func (q *Queries) CreateJobDescription(ctx context.Context, arg CreateJobDescriptionParams) (JobDescription, error) {
	row, err := q.CreateJobDescriptionSQL(ctx, CreateJobDescriptionSQLParams{
		ApplicationID:     arg.ApplicationID,
		RawText:           arg.RawText,
		ExtractedKeywords: arg.ExtractedKeywords,
		AiSummary:         arg.AISummary,
	})
	return jobDescriptionFrom(row.ID, row.ApplicationID, row.RawText, row.ExtractedKeywords, row.AiSummary, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) GetJobDescriptionByApplication(ctx context.Context, applicationID string) (JobDescription, error) {
	row, err := q.GetJobDescriptionByApplicationSQL(ctx, applicationID)
	return jobDescriptionFrom(row.ID, row.ApplicationID, row.RawText, row.ExtractedKeywords, row.AiSummary, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateJobDescription(ctx context.Context, arg UpdateJobDescriptionParams) (JobDescription, error) {
	row, err := q.UpdateJobDescriptionSQL(ctx, UpdateJobDescriptionSQLParams{
		ID:                arg.ID,
		RawText:           arg.RawText,
		ExtractedKeywords: arg.ExtractedKeywords,
		SetKeywords:       arg.SetKeywords,
		AiSummary:         arg.AISummary,
	})
	return jobDescriptionFrom(row.ID, row.ApplicationID, row.RawText, row.ExtractedKeywords, row.AiSummary, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) CreateReminder(ctx context.Context, arg CreateReminderParams) (Reminder, error) {
	row, err := q.CreateReminderSQL(ctx, CreateReminderSQLParams{ApplicationID: arg.ApplicationID, ContactID: arg.ContactID, Title: arg.Title, Description: arg.Description, DueAt: pgtype.Timestamptz{Time: arg.DueAt, Valid: true}, IdempotencyKey: arg.IdempotencyKey})
	return reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) ListReminders(ctx context.Context) ([]Reminder, error) {
	rows, err := q.ListRemindersSQL(ctx)
	if err != nil {
		return nil, err
	}
	reminders := make([]Reminder, 0, len(rows))
	for _, row := range rows {
		reminders = append(reminders, reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt))
	}
	return reminders, nil
}

func (q *Queries) ListDueReminders(ctx context.Context, now time.Time) ([]Reminder, error) {
	rows, err := q.ListDueRemindersSQL(ctx, pgtype.Timestamptz{Time: now, Valid: true})
	if err != nil {
		return nil, err
	}
	reminders := make([]Reminder, 0, len(rows))
	for _, row := range rows {
		reminders = append(reminders, reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt))
	}
	return reminders, nil
}

func (q *Queries) GetReminder(ctx context.Context, id string) (Reminder, error) {
	row, err := q.GetReminderSQL(ctx, id)
	return reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateReminder(ctx context.Context, arg UpdateReminderParams) (Reminder, error) {
	row, err := q.UpdateReminderSQL(ctx, arg)
	return reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) UpdateReminderStatus(ctx context.Context, id string, status string) (Reminder, error) {
	row, err := q.UpdateReminderStatusSQL(ctx, UpdateReminderStatusSQLParams{ID: id, Status: status})
	return reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) MarkReminderSent(ctx context.Context, id string) (Reminder, error) {
	row, err := q.MarkReminderSentSQL(ctx, id)
	return reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) MarkReminderRetry(ctx context.Context, arg MarkReminderRetryParams) (Reminder, error) {
	row, err := q.MarkReminderRetrySQL(ctx, MarkReminderRetrySQLParams{ID: arg.ID, Status: arg.Status, RetryCount: arg.RetryCount, LastError: &arg.LastError})
	return reminderFrom(row.ID, row.ApplicationID, row.ContactID, row.Title, row.Description, row.DueAt, row.Status, row.IdempotencyKey, row.RetryCount, row.LastError, row.DeliveredAt, row.CreatedAt, row.UpdatedAt), err
}

func (q *Queries) DeleteReminder(ctx context.Context, id string) error {
	return ensureRows(q.DeleteReminderRowCount(ctx, id))
}

func (q *Queries) CreateReminderDelivery(ctx context.Context, reminder Reminder) (ReminderDelivery, error) {
	row, err := q.CreateReminderDeliverySQL(ctx, CreateReminderDeliverySQLParams{ReminderID: reminder.ID, IdempotencyKey: reminder.IdempotencyKey})
	return ReminderDelivery{ID: row.ID, ReminderID: row.ReminderID, IdempotencyKey: row.IdempotencyKey, DeliveredAt: timeFrom(row.DeliveredAt), CreatedAt: timeFrom(row.CreatedAt)}, err
}

func (q *Queries) Search(ctx context.Context, query string) ([]SearchResult, error) {
	const sql = `
		SELECT 'application' AS type,
		       a.id::text    AS id,
		       a.title       AS title,
		       c.name        AS company,
		       ts_rank(a.search_vector, plainto_tsquery('english', $1)) AS rank
		FROM applications a
		JOIN companies c ON c.id = a.company_id
		WHERE a.search_vector @@ plainto_tsquery('english', $1)
		UNION ALL
		SELECT 'job_description' AS type,
		       a.id::text        AS id,
		       a.title           AS title,
		       c.name            AS company,
		       ts_rank(jd.search_vector, plainto_tsquery('english', $1)) AS rank
		FROM job_descriptions jd
		JOIN applications a ON a.id = jd.application_id
		JOIN companies c ON c.id = a.company_id
		WHERE jd.search_vector @@ plainto_tsquery('english', $1)
		ORDER BY rank DESC
		LIMIT 30`

	rows, err := q.db.Query(ctx, sql, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]SearchResult, 0)
	for rows.Next() {
		var typ, id, title, company string
		var rank float64
		if err := rows.Scan(&typ, &id, &title, &company, &rank); err != nil {
			return nil, err
		}
		r := SearchResult{Type: typ, ID: id, Title: title, Rank: rank}
		if company != "" {
			r.Company = &company
		}
		results = append(results, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

func (q *Queries) CreateFailedReminderJob(ctx context.Context, arg CreateFailedReminderJobParams) (FailedReminderJob, error) {
	row, err := q.CreateFailedReminderJobSQL(ctx, arg)
	return FailedReminderJob{ID: row.ID, ReminderID: ptrFromString(row.ReminderID), ErrorMessage: row.ErrorMessage, RetryCount: row.RetryCount, Payload: row.Payload, FailedAt: timeFrom(row.FailedAt)}, err
}

func ensureRows(rows int64, err error) error {
	if err != nil {
		return err
	}
	if rows == 0 {
		return pgx.ErrNoRows
	}
	return nil
}

func timeFrom(value pgtype.Timestamptz) time.Time {
	if !value.Valid {
		return time.Time{}
	}
	return value.Time
}

func ptrFromString(value any) *string {
	text, ok := value.(string)
	if !ok || text == "" {
		return nil
	}
	return &text
}

func companyFrom(id, name string, website, industry, location, notes *string, createdAt, updatedAt pgtype.Timestamptz) Company {
	return Company{ID: id, Name: name, Website: website, Industry: industry, Location: location, Notes: notes, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

func applicationFrom(id, companyID string, resumeVersionID any, title, roleTrack string, source *string, status string, location, employmentType, jobURL *string, appliedAt, deadlineAt *time.Time, notes *string, createdAt, updatedAt pgtype.Timestamptz) Application {
	return Application{ID: id, CompanyID: companyID, ResumeVersionID: ptrFromString(resumeVersionID), Title: title, RoleTrack: roleTrack, Source: source, Status: status, Location: location, EmploymentType: employmentType, JobURL: jobURL, AppliedAt: appliedAt, DeadlineAt: deadlineAt, Notes: notes, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

func auditLogFrom(id, entityType, entityID, action string, oldValue, newValue []byte, createdAt pgtype.Timestamptz) AuditLog {
	return AuditLog{ID: id, EntityType: entityType, EntityID: entityID, Action: action, OldValue: oldValue, NewValue: newValue, CreatedAt: timeFrom(createdAt)}
}

func resumeVersionFrom(id, name, track string, filePath, contentText *string, tags []string, createdAt, updatedAt pgtype.Timestamptz) ResumeVersion {
	if tags == nil {
		tags = []string{}
	}
	return ResumeVersion{ID: id, Name: name, Track: track, FilePath: filePath, ContentText: contentText, Tags: tags, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

func contactFrom(id, companyID, name string, role, email, linkedinURL, relationship, notes *string, createdAt, updatedAt pgtype.Timestamptz) Contact {
	return Contact{ID: id, CompanyID: companyID, Name: name, Role: role, Email: email, LinkedinURL: linkedinURL, Relationship: relationship, Notes: notes, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

func interviewFrom(id, applicationID, roundType string, scheduledAt *time.Time, interviewer, notes, outcome *string, createdAt, updatedAt pgtype.Timestamptz) InterviewRound {
	return InterviewRound{ID: id, ApplicationID: applicationID, RoundType: roundType, ScheduledAt: scheduledAt, Interviewer: interviewer, Notes: notes, Outcome: outcome, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

func jobDescriptionFrom(id, applicationID, rawText string, extractedKeywords []string, aiSummary *string, createdAt, updatedAt pgtype.Timestamptz) JobDescription {
	if extractedKeywords == nil {
		extractedKeywords = []string{}
	}
	return JobDescription{ID: id, ApplicationID: applicationID, RawText: rawText, ExtractedKeywords: extractedKeywords, AISummary: aiSummary, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}

func reminderFrom(id, applicationID string, contactID any, title string, description *string, dueAt pgtype.Timestamptz, status, idempotencyKey string, retryCount int32, lastError *string, deliveredAt *time.Time, createdAt, updatedAt pgtype.Timestamptz) Reminder {
	return Reminder{ID: id, ApplicationID: applicationID, ContactID: ptrFromString(contactID), Title: title, Description: description, DueAt: timeFrom(dueAt), Status: status, IdempotencyKey: idempotencyKey, RetryCount: retryCount, LastError: lastError, DeliveredAt: deliveredAt, CreatedAt: timeFrom(createdAt), UpdatedAt: timeFrom(updatedAt)}
}
