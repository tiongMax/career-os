package httpapi

import (
	"net/http"
	"time"

	"careeros/backend/internal/db/queries"
	interviewdomain "careeros/backend/internal/domain/interviews"
)

type interviewRoundResponse struct {
	ID            string     `json:"id"`
	ApplicationID string     `json:"application_id"`
	RoundType     string     `json:"round_type"`
	ScheduledAt   *time.Time `json:"scheduled_at,omitempty"`
	Interviewer   *string    `json:"interviewer,omitempty"`
	Notes         *string    `json:"notes,omitempty"`
	Outcome       *string    `json:"outcome,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
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
	writeJSON(w, http.StatusCreated, interviewRoundDTO(interview))
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
	writeJSON(w, http.StatusOK, interviewRoundDTOs(interviews))
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
	writeJSON(w, http.StatusOK, interviewRoundDTO(interview))
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

func interviewRoundDTO(interview interviewdomain.InterviewRound) interviewRoundResponse {
	return interviewRoundResponse{
		ID:            interview.ID,
		ApplicationID: interview.ApplicationID,
		RoundType:     interview.RoundType,
		ScheduledAt:   interview.ScheduledAt,
		Interviewer:   interview.Interviewer,
		Notes:         interview.Notes,
		Outcome:       interview.Outcome,
		CreatedAt:     interview.CreatedAt,
		UpdatedAt:     interview.UpdatedAt,
	}
}

func interviewRoundDTOs(interviews []interviewdomain.InterviewRound) []interviewRoundResponse {
	out := make([]interviewRoundResponse, 0, len(interviews))
	for _, interview := range interviews {
		out = append(out, interviewRoundDTO(interview))
	}
	return out
}
