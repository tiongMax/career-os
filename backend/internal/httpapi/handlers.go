package httpapi

import (
	"context"

	"careeros/backend/internal/db/queries"
	appdomain "careeros/backend/internal/domain/applications"
	companydomain "careeros/backend/internal/domain/companies"
	contactdomain "careeros/backend/internal/domain/contacts"
	interviewdomain "careeros/backend/internal/domain/interviews"
	reminderdomain "careeros/backend/internal/domain/reminders"
	resumedomain "careeros/backend/internal/domain/resumes"
	trackdomain "careeros/backend/internal/domain/roletracks"
	analyticssvc "careeros/backend/internal/services/analytics"
	appsvc "careeros/backend/internal/services/applications"
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
	roleTracks      roleTrackService
	analysisJobs    analysisJobService
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
	RoleTracks      roleTrackService
	AnalysisJobs    analysisJobService
}

type companyService interface {
	Create(context.Context, queries.CreateCompanyParams) (companydomain.Company, error)
	List(context.Context) ([]companydomain.Company, error)
	Get(context.Context, string) (companydomain.Company, error)
	Update(context.Context, queries.UpdateCompanyParams) (companydomain.Company, error)
	Delete(context.Context, string) error
}

type resumeService interface {
	Create(context.Context, queries.CreateResumeVersionParams) (resumedomain.ResumeVersion, error)
	List(context.Context) ([]resumedomain.ResumeVersion, error)
	Get(context.Context, string) (resumedomain.ResumeVersion, error)
	Update(context.Context, queries.UpdateResumeVersionParams) (resumedomain.ResumeVersion, error)
	Delete(context.Context, string) error
	StorePDF(context.Context, string, []byte) error
	GetPDF(context.Context, string) ([]byte, error)
}

type applicationService interface {
	Create(context.Context, appsvc.CreateParams) (appdomain.Application, error)
	List(context.Context) ([]appdomain.Application, error)
	Get(context.Context, string) (appdomain.Application, error)
	Update(context.Context, appsvc.UpdateParams) (appdomain.Application, error)
	ChangeStatus(context.Context, appsvc.ChangeStatusParams) (appdomain.Application, error)
	ListAuditLogs(context.Context, string) ([]appdomain.AuditLog, error)
	Delete(context.Context, string) error
}

type jobDescriptionService interface {
	Create(context.Context, queries.CreateJobDescriptionParams) (queries.JobDescription, error)
	GetByApplication(context.Context, string) (queries.JobDescription, error)
	Update(context.Context, queries.UpdateJobDescriptionParams) (queries.JobDescription, error)
	ExtractKeywords(context.Context, string) (queries.JobDescription, error)
	CompareResume(context.Context, string, string) (queries.ResumeMatchResult, error)
	RecommendedResume(context.Context, string) (queries.RecommendedResumeResult, error)
	PrepContext(context.Context, string) (queries.PrepContext, error)
	GeneratePrepBrief(context.Context, string) (queries.PrepBrief, error)
}

type contactService interface {
	Create(context.Context, queries.CreateContactParams) (contactdomain.Contact, error)
	List(context.Context) ([]contactdomain.Contact, error)
	Get(context.Context, string) (contactdomain.Contact, error)
	Update(context.Context, queries.UpdateContactParams) (contactdomain.Contact, error)
	Delete(context.Context, string) error
}

type interviewService interface {
	Create(context.Context, queries.CreateInterviewRoundParams) (interviewdomain.InterviewRound, error)
	ListByApplication(context.Context, string) ([]interviewdomain.InterviewRound, error)
	Update(context.Context, queries.UpdateInterviewRoundParams) (interviewdomain.InterviewRound, error)
	Delete(context.Context, string) error
}

type reminderService interface {
	Create(context.Context, queries.CreateReminderParams) (reminderdomain.Reminder, error)
	List(context.Context) ([]reminderdomain.Reminder, error)
	ListDue(context.Context) ([]reminderdomain.Reminder, error)
	ListFailed(context.Context) ([]reminderdomain.FailedJob, error)
	Get(context.Context, string) (reminderdomain.Reminder, error)
	Update(context.Context, queries.UpdateReminderParams) (reminderdomain.Reminder, error)
	Cancel(context.Context, string) (reminderdomain.Reminder, error)
	Retry(context.Context, string) (reminderdomain.Reminder, error)
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

type roleTrackService interface {
	Create(context.Context, string) (trackdomain.RoleTrack, error)
	List(context.Context) ([]trackdomain.RoleTrack, error)
}

type analysisJobService interface {
	Create(context.Context, string, string) (queries.AnalysisJob, error)
	List(context.Context) ([]queries.AnalysisJob, error)
	ListByApplication(context.Context, string) ([]queries.AnalysisJob, error)
	Get(context.Context, string) (queries.AnalysisJob, error)
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
		roleTracks:      services.RoleTracks,
		analysisJobs:    services.AnalysisJobs,
	}
}
