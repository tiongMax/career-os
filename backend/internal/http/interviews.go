package http

import (
	"net/http"

	"careeros/backend/internal/db/queries"
)

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
