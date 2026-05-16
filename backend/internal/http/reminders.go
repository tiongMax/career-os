package http

import (
	"net/http"

	"careeros/backend/internal/db/queries"
)

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
