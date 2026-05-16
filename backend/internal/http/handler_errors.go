package http

import (
	"errors"
	"net/http"

	appsvc "careeros/backend/internal/services/applications"
	companysvc "careeros/backend/internal/services/companies"
	contactsvc "careeros/backend/internal/services/contacts"
	interviewsvc "careeros/backend/internal/services/interviews"
	jdsvc "careeros/backend/internal/services/jobdescriptions"
	remindersvc "careeros/backend/internal/services/reminders"
	resumesvc "careeros/backend/internal/services/resumes"

	"github.com/jackc/pgx/v5/pgconn"
)

func (h Handler) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case isNotFound(err):
		writeError(w, http.StatusNotFound, "not found")
	case errors.Is(err, appsvc.ErrInvalidTransition):
		writeError(w, http.StatusConflict, err.Error())
	case errors.Is(err, appsvc.ErrInvalidStatus),
		errors.Is(err, appsvc.ErrInvalidTrack),
		errors.Is(err, appsvc.ErrTitleRequired),
		errors.Is(err, companysvc.ErrNameRequired),
		errors.Is(err, contactsvc.ErrNameRequired),
		errors.Is(err, interviewsvc.ErrInvalidRoundType),
		errors.Is(err, resumesvc.ErrInvalidTrack),
		errors.Is(err, resumesvc.ErrNameRequired),
		errors.Is(err, jdsvc.ErrRawTextRequired),
		errors.Is(err, remindersvc.ErrTitleRequired),
		errors.Is(err, remindersvc.ErrDueAtRequired):
		writeError(w, http.StatusBadRequest, err.Error())
	case pgErrorCode(err, "23503"):
		writeError(w, http.StatusConflict, "request conflicts with existing related data")
	case pgErrorCode(err, "23514"), pgErrorCode(err, "22P02"):
		writeError(w, http.StatusBadRequest, "request violates data constraints")
	default:
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

func pgErrorCode(err error, code string) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == code
}
