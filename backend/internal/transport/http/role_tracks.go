package httpapi

import (
	"net/http"
	"time"

	trackdomain "careeros/backend/internal/domain/roletracks"
)

type roleTrackResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	CreatedAt time.Time `json:"created_at"`
}

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
	writeJSON(w, http.StatusCreated, roleTrackDTO(track))
}

func (h Handler) listRoleTracks(w http.ResponseWriter, r *http.Request) {
	tracks, err := h.roleTracks.List(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, roleTrackDTOs(tracks))
}

func roleTrackDTO(track trackdomain.RoleTrack) roleTrackResponse {
	return roleTrackResponse{
		ID:        track.ID,
		Name:      track.Name,
		CreatedAt: track.CreatedAt,
	}
}

func roleTrackDTOs(tracks []trackdomain.RoleTrack) []roleTrackResponse {
	out := make([]roleTrackResponse, 0, len(tracks))
	for _, track := range tracks {
		out = append(out, roleTrackDTO(track))
	}
	return out
}
