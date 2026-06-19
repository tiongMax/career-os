package httpapi

import (
	"net/http"

	analyticssvc "careeros/backend/internal/services/analytics"
)

// analyticsUpcomingResult is the JSON envelope for the /upcoming endpoint.
type analyticsUpcomingResult = analyticssvc.UpcomingResult

func (h Handler) getAnalyticsSummary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.analytics.Summary(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

func (h Handler) getAnalyticsByStatus(w http.ResponseWriter, r *http.Request) {
	counts, err := h.analytics.ByStatus(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, counts)
}

func (h Handler) getAnalyticsByTrack(w http.ResponseWriter, r *http.Request) {
	counts, err := h.analytics.ByTrack(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, counts)
}

func (h Handler) getAnalyticsByResumeVersion(w http.ResponseWriter, r *http.Request) {
	perfs, err := h.analytics.ByResumeVersion(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, perfs)
}

func (h Handler) getAnalyticsSourcePerformance(w http.ResponseWriter, r *http.Request) {
	perfs, err := h.analytics.SourcePerformance(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, perfs)
}

func (h Handler) getAnalyticsFunnel(w http.ResponseWriter, r *http.Request) {
	steps, err := h.analytics.Funnel(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, steps)
}

func (h Handler) getAnalyticsUpcoming(w http.ResponseWriter, r *http.Request) {
	result, err := h.analytics.Upcoming(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}
