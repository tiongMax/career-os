package httpapi

import (
	"net/http"

	"careeros/backend/internal/db/queries"

	"github.com/go-chi/chi/v5"
)

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

func (h Handler) extractKeywords(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "invalid job description id")
		return
	}
	jd, err := h.jobDescriptions.ExtractKeywords(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, jd)
}

func (h Handler) compareResume(w http.ResponseWriter, r *http.Request) {
	jdID := chi.URLParam(r, "id")
	resumeVersionID := chi.URLParam(r, "resumeVersionId")
	if jdID == "" || resumeVersionID == "" {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	result, err := h.jobDescriptions.CompareResume(r.Context(), jdID, resumeVersionID)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (h Handler) recommendedResume(w http.ResponseWriter, r *http.Request) {
	applicationID, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	result, err := h.jobDescriptions.RecommendedResume(r.Context(), applicationID)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}
