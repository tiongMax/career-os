package analytics

import (
	"context"

	"careeros/backend/internal/persistence/postgres"
)

// Store is the subset of *postgres.Queries used by this service.
type Store interface {
	GetAnalyticsSummary(ctx context.Context) (postgres.AnalyticsSummary, error)
	GetApplicationCountByStatus(ctx context.Context) ([]postgres.StatusCount, error)
	GetApplicationCountByTrack(ctx context.Context) ([]postgres.TrackCount, error)
	GetResumeVersionPerformance(ctx context.Context) ([]postgres.ResumeVersionPerformance, error)
	GetSourcePerformance(ctx context.Context) ([]postgres.SourcePerformance, error)
	GetApplicationFunnel(ctx context.Context) ([]postgres.FunnelStep, error)
	GetUpcomingInterviews(ctx context.Context) ([]postgres.UpcomingInterview, error)
	GetUpcomingPendingReminders(ctx context.Context) ([]postgres.UpcomingReminder, error)
}

// UpcomingResult holds both upcoming interviews and reminders.
type UpcomingResult struct {
	Interviews []postgres.UpcomingInterview `json:"interviews"`
	Reminders  []postgres.UpcomingReminder  `json:"reminders"`
}

// Service provides analytics aggregations over the application data.
type Service struct {
	store Store
}

// New creates a Service backed by the given store.
func New(store Store) *Service {
	return &Service{store: store}
}

// Summary returns the overall analytics summary.
func (s *Service) Summary(ctx context.Context) (postgres.AnalyticsSummary, error) {
	return s.store.GetAnalyticsSummary(ctx)
}

// ByStatus returns application counts grouped by status.
func (s *Service) ByStatus(ctx context.Context) ([]postgres.StatusCount, error) {
	return s.store.GetApplicationCountByStatus(ctx)
}

// ByTrack returns application counts grouped by role track.
func (s *Service) ByTrack(ctx context.Context) ([]postgres.TrackCount, error) {
	return s.store.GetApplicationCountByTrack(ctx)
}

// ByResumeVersion returns per-resume-version application and interview metrics.
func (s *Service) ByResumeVersion(ctx context.Context) ([]postgres.ResumeVersionPerformance, error) {
	return s.store.GetResumeVersionPerformance(ctx)
}

// SourcePerformance returns application and response metrics grouped by source.
func (s *Service) SourcePerformance(ctx context.Context) ([]postgres.SourcePerformance, error) {
	return s.store.GetSourcePerformance(ctx)
}

// Funnel returns the application funnel counts for each status stage.
func (s *Service) Funnel(ctx context.Context) ([]postgres.FunnelStep, error) {
	return s.store.GetApplicationFunnel(ctx)
}

// Upcoming returns the next upcoming interviews and pending reminders.
func (s *Service) Upcoming(ctx context.Context) (UpcomingResult, error) {
	interviews, err := s.store.GetUpcomingInterviews(ctx)
	if err != nil {
		return UpcomingResult{}, err
	}
	reminders, err := s.store.GetUpcomingPendingReminders(ctx)
	if err != nil {
		return UpcomingResult{}, err
	}
	return UpcomingResult{Interviews: interviews, Reminders: reminders}, nil
}
