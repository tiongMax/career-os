// Package http wires HTTP routes, middleware, and handlers for the CareerOS API.
package httpapi

import (
	nethttp "net/http"
	"time"

	"careeros/backend/internal/db/queries"
	aianalysissvc "careeros/backend/internal/services/aianalysis"
	analyticssvc "careeros/backend/internal/services/analytics"
	appsvc "careeros/backend/internal/services/applications"
	companysvc "careeros/backend/internal/services/companies"
	contactsvc "careeros/backend/internal/services/contacts"
	interviewsvc "careeros/backend/internal/services/interviews"
	jdsvc "careeros/backend/internal/services/jobdescriptions"
	remindersvc "careeros/backend/internal/services/reminders"
	resumesvc "careeros/backend/internal/services/resumes"
	roletracksvc "careeros/backend/internal/services/roletracks"
	searchsvc "careeros/backend/internal/services/search"

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
	handler := NewHandler(Services{
		Companies:       companysvc.New(store),
		Resumes:         resumesvc.New(store),
		Applications:    appsvc.New(store),
		JobDescriptions: jdsvc.New(store),
		Contacts:        contactsvc.New(store),
		Interviews:      interviewsvc.New(store),
		Reminders:       remindersvc.New(store, remindersvc.NewRedisScheduler(redisClient)),
		Search:          searchsvc.New(store),
		Analytics:       analyticssvc.New(store),
		RoleTracks:      roletracksvc.New(store),
		AnalysisJobs:    aianalysissvc.New(store),
	})

	r.Use(corsMiddleware)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(requestLogger(log))
	r.Use(middleware.Recoverer)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/health", HealthHandler{Postgres: postgres, Redis: redisClient}.ServeHTTP)

		r.Get("/openapi.yaml", serveOpenAPISpec)
		r.Get("/docs", serveSwaggerUI)

		collection(r, "/companies", handler.createCompany, handler.listCompanies, func(r chi.Router) {
			r.Get("/{id}", handler.getCompany)
			r.Patch("/{id}", handler.updateCompany)
			r.Delete("/{id}", handler.deleteCompany)
		})

		collection(r, "/resume-versions", handler.createResumeVersion, handler.listResumeVersions, func(r chi.Router) {
			r.Get("/{id}", handler.getResumeVersion)
			r.Patch("/{id}", handler.updateResumeVersion)
			r.Delete("/{id}", handler.deleteResumeVersion)
			r.Post("/{id}/pdf", handler.uploadResumePDF)
			r.Get("/{id}/pdf", handler.serveResumePDF)
		})

		collection(r, "/applications", handler.createApplication, handler.listApplications, func(r chi.Router) {
			r.Get("/{id}", handler.getApplication)
			r.Patch("/{id}", handler.updateApplication)
			r.Delete("/{id}", handler.deleteApplication)
			r.Patch("/{id}/status", handler.updateApplicationStatus)
			r.Get("/{id}/audit-logs", handler.listApplicationAuditLogs)
			r.Post("/{id}/job-description", handler.createJobDescription)
			r.Get("/{id}/job-description", handler.getJobDescriptionByApplication)
			r.Post("/{id}/interviews", handler.createInterview)
			r.Get("/{id}/interviews", handler.listApplicationInterviews)
			r.Get("/{id}/recommended-resume", handler.recommendedResume)
			r.Get("/{id}/prep-context", handler.prepContext)
			r.Post("/{id}/generate-prep-brief", handler.generatePrepBrief)
			r.Post("/{id}/ai-analysis-jobs", handler.createAnalysisJob)
			r.Get("/{id}/ai-analysis-jobs", handler.listApplicationAnalysisJobs)
		})

		r.Route("/ai-analysis-jobs", func(r chi.Router) {
			r.Get("/", handler.listAnalysisJobs)
			r.Get("/{id}", handler.getAnalysisJob)
		})

		r.Route("/job-descriptions", func(r chi.Router) {
			r.Patch("/{id}", handler.updateJobDescription)
			r.Post("/{id}/extract-keywords", handler.extractKeywords)
			r.Post("/{id}/compare-resume/{resumeVersionId}", handler.compareResume)
		})

		collection(r, "/contacts", handler.createContact, handler.listContacts, func(r chi.Router) {
			r.Get("/{id}", handler.getContact)
			r.Patch("/{id}", handler.updateContact)
			r.Delete("/{id}", handler.deleteContact)
		})

		r.Route("/interviews", func(r chi.Router) {
			r.Patch("/{id}", handler.updateInterview)
			r.Delete("/{id}", handler.deleteInterview)
		})

		collection(r, "/reminders", handler.createReminder, handler.listReminders, func(r chi.Router) {
			r.Get("/due", handler.listDueReminders)
			r.Get("/failed", handler.listFailedReminders)
			r.Get("/{id}", handler.getReminder)
			r.Patch("/{id}", handler.updateReminder)
			r.Delete("/{id}", handler.deleteReminder)
			r.Post("/{id}/cancel", handler.cancelReminder)
			r.Post("/{id}/retry", handler.retryReminder)
		})

		collection(r, "/tracks", handler.createRoleTrack, handler.listRoleTracks, func(r chi.Router) {})

		r.Get("/search", handler.search)

		r.Route("/exports", func(r chi.Router) {
			r.Get("/applications.csv", handler.exportApplicationsCSV)
			r.Get("/contacts.csv", handler.exportContactsCSV)
			r.Get("/reminders.csv", handler.exportRemindersCSV)
		})

		r.Route("/analytics", func(r chi.Router) {
			r.Get("/summary", handler.getAnalyticsSummary)
			r.Get("/by-status", handler.getAnalyticsByStatus)
			r.Get("/by-role-track", handler.getAnalyticsByTrack)
			r.Get("/by-resume-version", handler.getAnalyticsByResumeVersion)
			r.Get("/source-performance", handler.getAnalyticsSourcePerformance)
			r.Get("/funnel", handler.getAnalyticsFunnel)
			r.Get("/upcoming", handler.getAnalyticsUpcoming)
		})
	})

	return r
}

func collection(
	r chi.Router,
	pattern string,
	create nethttp.HandlerFunc,
	list nethttp.HandlerFunc,
	nested func(chi.Router),
) {
	r.Post(pattern, create)
	r.Get(pattern, list)
	r.Route(pattern, func(r chi.Router) {
		r.Post("/", create)
		r.Get("/", list)
		nested(r)
	})
}

func corsMiddleware(next nethttp.Handler) nethttp.Handler {
	return nethttp.HandlerFunc(func(w nethttp.ResponseWriter, r *nethttp.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == nethttp.MethodOptions {
			w.WriteHeader(nethttp.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
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
