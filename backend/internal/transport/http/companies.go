package httpapi

import (
	"net/http"
	"time"

	companydomain "careeros/backend/internal/domain/companies"
	"careeros/backend/internal/persistence/postgres"
)

type companyResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Website   *string   `json:"website,omitempty"`
	Industry  *string   `json:"industry,omitempty"`
	Location  *string   `json:"location,omitempty"`
	Notes     *string   `json:"notes,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (h Handler) createCompany(w http.ResponseWriter, r *http.Request) {
	var req postgres.CreateCompanyParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	company, err := h.companies.Create(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, companyDTO(company))
}

func (h Handler) listCompanies(w http.ResponseWriter, r *http.Request) {
	companies, err := h.companies.List(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, companyDTOs(companies))
}

func (h Handler) getCompany(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid company id")
		return
	}
	company, err := h.companies.Get(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, companyDTO(company))
}

func (h Handler) updateCompany(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid company id")
		return
	}
	var req postgres.UpdateCompanyParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	req.ID = id
	company, err := h.companies.Update(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, companyDTO(company))
}

func (h Handler) deleteCompany(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid company id")
		return
	}
	if err := h.companies.Delete(r.Context(), id); err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeNoContent(w)
}

func companyDTO(company companydomain.Company) companyResponse {
	return companyResponse{
		ID:        company.ID,
		Name:      company.Name,
		Website:   company.Website,
		Industry:  company.Industry,
		Location:  company.Location,
		Notes:     company.Notes,
		CreatedAt: company.CreatedAt,
		UpdatedAt: company.UpdatedAt,
	}
}

func companyDTOs(companies []companydomain.Company) []companyResponse {
	out := make([]companyResponse, 0, len(companies))
	for _, company := range companies {
		out = append(out, companyDTO(company))
	}
	return out
}
