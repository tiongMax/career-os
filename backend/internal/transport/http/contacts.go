package httpapi

import (
	"net/http"
	"time"

	contactdomain "careeros/backend/internal/domain/contacts"
	"careeros/backend/internal/persistence/postgres"
)

type contactResponse struct {
	ID           string    `json:"id"`
	CompanyID    string    `json:"company_id"`
	Name         string    `json:"name"`
	Role         *string   `json:"role,omitempty"`
	Email        *string   `json:"email,omitempty"`
	LinkedinURL  *string   `json:"linkedin_url,omitempty"`
	Relationship *string   `json:"relationship,omitempty"`
	Notes        *string   `json:"notes,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

func (h Handler) createContact(w http.ResponseWriter, r *http.Request) {
	var req postgres.CreateContactParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	contact, err := h.contacts.Create(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, contactDTO(contact))
}

func (h Handler) listContacts(w http.ResponseWriter, r *http.Request) {
	contacts, err := h.contacts.List(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, contactDTOs(contacts))
}

func (h Handler) getContact(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid contact id")
		return
	}
	contact, err := h.contacts.Get(r.Context(), id)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, contactDTO(contact))
}

func (h Handler) updateContact(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid contact id")
		return
	}
	var req postgres.UpdateContactParams
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	req.ID = id
	contact, err := h.contacts.Update(r.Context(), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, contactDTO(contact))
}

func (h Handler) deleteContact(w http.ResponseWriter, r *http.Request) {
	id, ok := pathUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid contact id")
		return
	}
	if err := h.contacts.Delete(r.Context(), id); err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeNoContent(w)
}

func contactDTO(contact contactdomain.Contact) contactResponse {
	return contactResponse{
		ID:           contact.ID,
		CompanyID:    contact.CompanyID,
		Name:         contact.Name,
		Role:         contact.Role,
		Email:        contact.Email,
		LinkedinURL:  contact.LinkedinURL,
		Relationship: contact.Relationship,
		Notes:        contact.Notes,
		CreatedAt:    contact.CreatedAt,
		UpdatedAt:    contact.UpdatedAt,
	}
}

func contactDTOs(contacts []contactdomain.Contact) []contactResponse {
	out := make([]contactResponse, 0, len(contacts))
	for _, contact := range contacts {
		out = append(out, contactDTO(contact))
	}
	return out
}
