package httpapi

import (
	"encoding/json"
	"net/http"
	"time"

	"careeros/backend/internal/db/queries"
	reminderdomain "careeros/backend/internal/domain/reminders"
)

type reminderResponse struct {
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

type failedReminderJobResponse struct {
	ID           string          `json:"id"`
	ReminderID   *string         `json:"reminder_id,omitempty"`
	ErrorMessage string          `json:"error_message"`
	RetryCount   int32           `json:"retry_count"`
	Payload      json.RawMessage `json:"payload"`
	FailedAt     time.Time       `json:"failed_at"`
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
	writeJSON(w, http.StatusCreated, reminderDTO(reminder))
}

func (h Handler) listReminders(w http.ResponseWriter, r *http.Request) {
	reminders, err := h.reminders.List(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, reminderDTOs(reminders))
}

func (h Handler) listDueReminders(w http.ResponseWriter, r *http.Request) {
	reminders, err := h.reminders.ListDue(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, reminderDTOs(reminders))
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
	writeJSON(w, http.StatusOK, reminderDTO(reminder))
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
	writeJSON(w, http.StatusOK, reminderDTO(reminder))
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
	writeJSON(w, http.StatusOK, reminderDTO(reminder))
}

func (h Handler) listFailedReminders(w http.ResponseWriter, r *http.Request) {
	jobs, err := h.reminders.ListFailed(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, failedReminderJobDTOs(jobs))
}

func (h Handler) retryReminder(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid reminder id")
		return
	}
	reminder, err := h.reminders.Retry(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, reminderDTO(reminder))
}

func reminderDTO(reminder reminderdomain.Reminder) reminderResponse {
	return reminderResponse{
		ID:             reminder.ID,
		ApplicationID:  reminder.ApplicationID,
		ContactID:      reminder.ContactID,
		Title:          reminder.Title,
		Description:    reminder.Description,
		DueAt:          reminder.DueAt,
		Status:         reminder.Status,
		IdempotencyKey: reminder.IdempotencyKey,
		RetryCount:     reminder.RetryCount,
		LastError:      reminder.LastError,
		DeliveredAt:    reminder.DeliveredAt,
		CreatedAt:      reminder.CreatedAt,
		UpdatedAt:      reminder.UpdatedAt,
	}
}

func reminderDTOs(reminders []reminderdomain.Reminder) []reminderResponse {
	out := make([]reminderResponse, 0, len(reminders))
	for _, reminder := range reminders {
		out = append(out, reminderDTO(reminder))
	}
	return out
}

func failedReminderJobDTO(job reminderdomain.FailedJob) failedReminderJobResponse {
	return failedReminderJobResponse{
		ID:           job.ID,
		ReminderID:   job.ReminderID,
		ErrorMessage: job.ErrorMessage,
		RetryCount:   job.RetryCount,
		Payload:      job.Payload,
		FailedAt:     job.FailedAt,
	}
}

func failedReminderJobDTOs(jobs []reminderdomain.FailedJob) []failedReminderJobResponse {
	out := make([]failedReminderJobResponse, 0, len(jobs))
	for _, job := range jobs {
		out = append(out, failedReminderJobDTO(job))
	}
	return out
}
