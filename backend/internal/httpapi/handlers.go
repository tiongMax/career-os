package httpapi

import (
	"context"

	"careeros/backend/internal/db/queries"
	appsvc "careeros/backend/internal/services/applications"
	analyticssvc "careeros/backend/internal/services/analytics"
)

type Handler struct {
	companies       companyService
	resumes         resumeService
	applications    applicationService
	jobDescriptions jobDescriptionService
	contacts        contactService
	interviews      interviewService
	reminders       reminderService
	searchSvc       searchService
	analytics       analyticsService
}

type Services struct {
	Companies       companyService
	Resumes         resumeService
	Applications    applicationService
	JobDescriptions jobDescriptionService
	Contacts        contactService
	Interviews      interviewService
	Reminders       reminderService
	Search          searchService
	Analytics       analyticsService
}

type companyService interface {
	Create(context.Context, queries.CreateCompanyParams) (queries.Company, error)
	List(context.Context) ([]queries.Company, error)
	Get(context.Context, string) (queries.Company, error)
	Update(context.Context, queries.UpdateCompanyParams) (queries.Company, error)
	Delete(context.Context, string) error
}

type resumeService interface {
	Create(context.Context, queries.CreateResumeVersionParams) (queries.ResumeVersion, error)
	List(context.Context) ([]queries.ResumeVersion, error)
	Get(context.Context, string) (queries.ResumeVersion, error)
	Update(context.Context, queries.UpdateResumeVersionParams) (queries.ResumeVersion, error)
	Delete(context.Context, string) error
}

type applicationService interface {
	Create(context.Context, queries.CreateApplicationParams) (queries.Application, error)
	List(context.Context) ([]queries.Application, error)
	Get(context.Context, string) (queries.Application, error)
	Update(context.Context, queries.UpdateApplicationParams) (queries.Application, error)
	ChangeStatus(context.Context, appsvc.ChangeStatusParams) (queries.Application, error)
	ListAuditLogs(context.Context, string) ([]queries.AuditLog, error)
	Delete(context.Context, string) error
}

type jobDescriptionService interface {
	Create(context.Context, queries.CreateJobDescriptionParams) (queries.JobDescription, error)
	GetByApplication(context.Context, string) (queries.JobDescription, error)
	Update(context.Context, queries.UpdateJobDescriptionParams) (queries.JobDescription, error)
	ExtractKeywords(context.Context, string) (queries.JobDescription, error)
	CompareResume(context.Context, string, string) (queries.ResumeMatchResult, error)
	RecommendedResume(context.Context, string) (queries.RecommendedResumeResult, error)
}

type contactService interface {
	Create(context.Context, queries.CreateContactParams) (queries.Contact, error)
	List(context.Context) ([]queries.Contact, error)
	Get(context.Context, string) (queries.Contact, error)
	Update(context.Context, queries.UpdateContactParams) (queries.Contact, error)
	Delete(context.Context, string) error
}

type interviewService interface {
	Create(context.Context, queries.CreateInterviewRoundParams) (queries.InterviewRound, error)
	ListByApplication(context.Context, string) ([]queries.InterviewRound, error)
	Update(context.Context, queries.UpdateInterviewRoundParams) (queries.InterviewRound, error)
	Delete(context.Context, string) error
}

type reminderService interface {
	Create(context.Context, queries.CreateReminderParams) (queries.Reminder, error)
	List(context.Context) ([]queries.Reminder, error)
	ListDue(context.Context) ([]queries.Reminder, error)
	ListFailed(context.Context) ([]queries.FailedReminderJob, error)
	Get(context.Context, string) (queries.Reminder, error)
	Update(context.Context, queries.UpdateReminderParams) (queries.Reminder, error)
	Cancel(context.Context, string) (queries.Reminder, error)
	Retry(context.Context, string) (queries.Reminder, error)
	Delete(context.Context, string) error
}

type searchService interface {
	Search(context.Context, string) ([]queries.SearchResult, error)
}

type analyticsService interface {
	Summary(context.Context) (queries.AnalyticsSummary, error)
	ByStatus(context.Context) ([]queries.StatusCount, error)
	ByTrack(context.Context) ([]queries.TrackCount, error)
	ByResumeVersion(context.Context) ([]queries.ResumeVersionPerformance, error)
	SourcePerformance(context.Context) ([]queries.SourcePerformance, error)
	Funnel(context.Context) ([]queries.FunnelStep, error)
	Upcoming(context.Context) (analyticssvc.UpcomingResult, error)
}

func NewHandler(services Services) Handler {
	return Handler{
		companies:       services.Companies,
		resumes:         services.Resumes,
		applications:    services.Applications,
		jobDescriptions: services.JobDescriptions,
		contacts:        services.Contacts,
		interviews:      services.Interviews,
		reminders:       services.Reminders,
		searchSvc:       services.Search,
		analytics:       services.Analytics,
	}
}
