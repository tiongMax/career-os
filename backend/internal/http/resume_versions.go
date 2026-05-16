package http

import (
	"net/http"

	"careeros/backend/internal/db/queries"
)

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
