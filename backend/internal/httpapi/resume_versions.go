package httpapi

import (
	"errors"
	"io"
	"net/http"

	"careeros/backend/internal/db/queries"

	"github.com/jackc/pgx/v5"
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
	Name  *string   `json:"name"`
	Track *string   `json:"track"`
	Tags  *[]string `json:"tags"`
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
		ID:      id,
		Name:    req.Name,
		Track:   req.Track,
		SetTags: req.Tags != nil,
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

func (h Handler) uploadResumePDF(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid resume version id")
		return
	}
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, "failed to parse form")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing file field")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to read file")
		return
	}
	if err := h.resumes.StorePDF(r.Context(), id, data); err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeNoContent(w)
}

func (h Handler) serveResumePDF(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid resume version id")
		return
	}
	data, err := h.resumes.GetPDF(r.Context(), id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusNotFound, "resume not found")
			return
		}
		h.writeServiceError(w, err)
		return
	}
	if data == nil {
		writeError(w, http.StatusNotFound, "no PDF attached")
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}
