package httpapi

import (
	"encoding/csv"
	"net/http"
	"strconv"
	"time"
)

const csvTime = time.RFC3339

func (h Handler) exportApplicationsCSV(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	apps, err := h.applications.List(ctx)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	companies, err := h.companies.List(ctx)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	companyName := make(map[string]string, len(companies))
	for _, c := range companies {
		companyName[c.ID] = c.Name
	}

	writeCSVHeaders(w, "applications.csv")
	cw := csv.NewWriter(w)
	defer cw.Flush()

	_ = cw.Write([]string{
		"id", "company_id", "company_name", "resume_version_id", "title",
		"role_track", "source", "status", "location", "employment_type",
		"job_url", "applied_at", "deadline_at", "notes", "created_at", "updated_at",
	})

	for _, a := range apps {
		_ = cw.Write([]string{
			a.ID,
			a.CompanyID,
			companyName[a.CompanyID],
			derefString(a.ResumeVersionID),
			a.Title,
			a.RoleTrack,
			derefString(a.Source),
			a.Status,
			derefString(a.Location),
			derefString(a.EmploymentType),
			derefString(a.JobURL),
			formatTimePtr(a.AppliedAt),
			formatTimePtr(a.DeadlineAt),
			derefString(a.Notes),
			a.CreatedAt.UTC().Format(csvTime),
			a.UpdatedAt.UTC().Format(csvTime),
		})
	}
}

func (h Handler) exportContactsCSV(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	contacts, err := h.contacts.List(ctx)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	companies, err := h.companies.List(ctx)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	companyName := make(map[string]string, len(companies))
	for _, c := range companies {
		companyName[c.ID] = c.Name
	}

	writeCSVHeaders(w, "contacts.csv")
	cw := csv.NewWriter(w)
	defer cw.Flush()

	_ = cw.Write([]string{
		"id", "company_id", "company_name", "name", "role", "email",
		"linkedin_url", "relationship", "notes", "created_at", "updated_at",
	})

	for _, c := range contacts {
		_ = cw.Write([]string{
			c.ID,
			c.CompanyID,
			companyName[c.CompanyID],
			c.Name,
			derefString(c.Role),
			derefString(c.Email),
			derefString(c.LinkedinURL),
			derefString(c.Relationship),
			derefString(c.Notes),
			c.CreatedAt.UTC().Format(csvTime),
			c.UpdatedAt.UTC().Format(csvTime),
		})
	}
}

func (h Handler) exportRemindersCSV(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	reminders, err := h.reminders.List(ctx)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	writeCSVHeaders(w, "reminders.csv")
	cw := csv.NewWriter(w)
	defer cw.Flush()

	_ = cw.Write([]string{
		"id", "application_id", "contact_id", "title", "description", "due_at",
		"status", "retry_count", "last_error", "delivered_at", "created_at", "updated_at",
	})

	for _, rm := range reminders {
		_ = cw.Write([]string{
			rm.ID,
			rm.ApplicationID,
			derefString(rm.ContactID),
			rm.Title,
			derefString(rm.Description),
			rm.DueAt.UTC().Format(csvTime),
			rm.Status,
			strconv.FormatInt(int64(rm.RetryCount), 10),
			derefString(rm.LastError),
			formatTimePtr(rm.DeliveredAt),
			rm.CreatedAt.UTC().Format(csvTime),
			rm.UpdatedAt.UTC().Format(csvTime),
		})
	}
}

func writeCSVHeaders(w http.ResponseWriter, filename string) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)
	w.Header().Set("Cache-Control", "no-store")
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func formatTimePtr(t *time.Time) string {
	if t == nil {
		return ""
	}
	return t.UTC().Format(csvTime)
}
