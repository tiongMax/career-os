package httpapi

import "net/http"

type createAnalysisJobRequest struct {
	JobType string `json:"job_type"`
}

func (h Handler) createAnalysisJob(w http.ResponseWriter, r *http.Request) {
	applicationID, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	var req createAnalysisJobRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	job, err := h.analysisJobs.Create(r.Context(), applicationID, req.JobType)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, job)
}

func (h Handler) listApplicationAnalysisJobs(w http.ResponseWriter, r *http.Request) {
	applicationID, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}
	jobs, err := h.analysisJobs.ListByApplication(r.Context(), applicationID)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, jobs)
}

func (h Handler) listAnalysisJobs(w http.ResponseWriter, r *http.Request) {
	jobs, err := h.analysisJobs.List(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, jobs)
}

func (h Handler) getAnalysisJob(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid analysis job id")
		return
	}
	job, err := h.analysisJobs.Get(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, job)
}
