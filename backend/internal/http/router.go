// Package http wires HTTP routes, middleware, and handlers for the CareerOS API.
package http

import (
	nethttp "net/http"
	"time"

	"careeros/backend/internal/db/queries"
	appsvc "careeros/backend/internal/services/applications"
	companysvc "careeros/backend/internal/services/companies"
	contactsvc "careeros/backend/internal/services/contacts"
	interviewsvc "careeros/backend/internal/services/interviews"
	jdsvc "careeros/backend/internal/services/jobdescriptions"
	remindersvc "careeros/backend/internal/services/reminders"
	resumesvc "careeros/backend/internal/services/resumes"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
)

// NewRouter builds the API router with production-oriented middleware and all
// versioned endpoint registrations.
func NewRouter(log zerolog.Logger, postgres *pgxpool.Pool, redisClient *redis.Client) nethttp.Handler {
	r := chi.NewRouter()
	store := queries.New(postgres)
	handler := NewHandler(
		companysvc.New(store),
		resumesvc.New(store),
		appsvc.New(store),
		jdsvc.New(store),
		contactsvc.New(store),
		interviewsvc.New(store),
		remindersvc.New(store, remindersvc.NewRedisScheduler(redisClient)),
	)

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(requestLogger(log))
	r.Use(middleware.Recoverer)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", HealthHandler{Postgres: postgres, Redis: redisClient}.ServeHTTP)

		r.Post("/companies", handler.createCompany)
		r.Get("/companies", handler.listCompanies)
		r.Route("/companies", func(r chi.Router) {
			r.Post("/", handler.createCompany)
			r.Get("/", handler.listCompanies)
			r.Get("/{id}", handler.getCompany)
			r.Patch("/{id}", handler.updateCompany)
			r.Delete("/{id}", handler.deleteCompany)
		})

		r.Post("/resume-versions", handler.createResumeVersion)
		r.Get("/resume-versions", handler.listResumeVersions)
		r.Route("/resume-versions", func(r chi.Router) {
			r.Post("/", handler.createResumeVersion)
			r.Get("/", handler.listResumeVersions)
			r.Get("/{id}", handler.getResumeVersion)
			r.Patch("/{id}", handler.updateResumeVersion)
			r.Delete("/{id}", handler.deleteResumeVersion)
		})

		r.Post("/applications", handler.createApplication)
		r.Get("/applications", handler.listApplications)
		r.Route("/applications", func(r chi.Router) {
			r.Post("/", handler.createApplication)
			r.Get("/", handler.listApplications)
			r.Get("/{id}", handler.getApplication)
			r.Patch("/{id}", handler.updateApplication)
			r.Delete("/{id}", handler.deleteApplication)
			r.Patch("/{id}/status", handler.updateApplicationStatus)
			r.Get("/{id}/audit-logs", handler.listApplicationAuditLogs)
			r.Post("/{id}/job-description", handler.createJobDescription)
			r.Get("/{id}/job-description", handler.getJobDescriptionByApplication)
			r.Post("/{id}/interviews", handler.createInterview)
			r.Get("/{id}/interviews", handler.listApplicationInterviews)
		})

		r.Route("/job-descriptions", func(r chi.Router) {
			r.Patch("/{id}", handler.updateJobDescription)
		})

		r.Post("/contacts", handler.createContact)
		r.Get("/contacts", handler.listContacts)
		r.Route("/contacts", func(r chi.Router) {
			r.Post("/", handler.createContact)
			r.Get("/", handler.listContacts)
			r.Get("/{id}", handler.getContact)
			r.Patch("/{id}", handler.updateContact)
			r.Delete("/{id}", handler.deleteContact)
		})

		r.Route("/interviews", func(r chi.Router) {
			r.Patch("/{id}", handler.updateInterview)
			r.Delete("/{id}", handler.deleteInterview)
		})

		r.Post("/reminders", handler.createReminder)
		r.Get("/reminders", handler.listReminders)
		r.Route("/reminders", func(r chi.Router) {
			r.Post("/", handler.createReminder)
			r.Get("/", handler.listReminders)
			r.Get("/due", handler.listDueReminders)
			r.Get("/{id}", handler.getReminder)
			r.Patch("/{id}", handler.updateReminder)
			r.Delete("/{id}", handler.deleteReminder)
			r.Post("/{id}/cancel", handler.cancelReminder)
		})
	})

	return r
}

// requestLogger returns middleware that records one structured log event for
// each completed request.
func requestLogger(log zerolog.Logger) func(nethttp.Handler) nethttp.Handler {
	return func(next nethttp.Handler) nethttp.Handler {
		return nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
			start := time.Now()
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			next.ServeHTTP(ww, r)

			log.Info().
				Str("method", r.Method).
				Str("path", r.URL.Path).
				Int("status", ww.Status()).
				Int("bytes", ww.BytesWritten()).
				Dur("duration", time.Since(start)).
				Str("request_id", middleware.GetReqID(r.Context())).
				Msg("request completed")
		})
	}
}
