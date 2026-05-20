package httpapi

import (
	"net/http"
)

func (h Handler) createRoleTrack(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name string `json:"name"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	track, err := h.roleTracks.Create(r.Context(), req.Name)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, track)
}

func (h Handler) listRoleTracks(w http.ResponseWriter, r *http.Request) {
	tracks, err := h.roleTracks.List(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, tracks)
}
