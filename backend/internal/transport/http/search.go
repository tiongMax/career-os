package httpapi

import (
	"net/http"
)

func (h Handler) search(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")

	results, err := h.searchSvc.Search(r.Context(), q)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"query":   q,
		"results": results,
	})
}
