package aianalysis

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"careeros/backend/internal/persistence/postgres"

	"github.com/jackc/pgx/v5"
)

func TestCreateRejectsUnsupportedJobType(t *testing.T) {
	svc := New(&fakeStore{})
	if _, err := svc.Create(context.Background(), "app-1", "unknown"); !errors.Is(err, ErrUnsupportedJobType) {
		t.Fatalf("expected ErrUnsupportedJobType, got %v", err)
	}
}

func TestProcessNextCompletesJob(t *testing.T) {
	store := newFakeStore()
	provider := fakeProvider{result: AnalysisResult{
		Summary:        "Strong backend fit",
		MatchScore:     0.82,
		MatchedSkills:  []string{"Go", "PostgreSQL"},
		MissingSkills:  []string{"Kubernetes"},
		ResumeFeedback: []string{"Add worker reliability bullet."},
		InterviewFocus: []string{"PostgreSQL indexing"},
	}}
	svc := NewProcessor(store, provider, 3)

	job, processed, err := svc.ProcessNext(context.Background())
	if err != nil {
		t.Fatalf("ProcessNext returned error: %v", err)
	}
	if !processed {
		t.Fatal("expected queued job to be processed")
	}
	if job.Status != StatusCompleted {
		t.Fatalf("expected completed job, got %q", job.Status)
	}

	var result AnalysisResult
	if err := json.Unmarshal(job.Result, &result); err != nil {
		t.Fatalf("result should be valid JSON: %v", err)
	}
	if result.MatchScore != 0.82 {
		t.Fatalf("expected match score 0.82, got %v", result.MatchScore)
	}
}

func TestProcessNextRanksResumeMatchJobsWithEmbeddings(t *testing.T) {
	store := newFakeStore()
	content := "Built Go APIs with PostgreSQL and Redis workers."
	store.resumes = []postgres.ResumeVersion{
		{ID: "resume-backend", Name: "Backend Resume", Track: "backend", ContentText: &content},
		{ID: "resume-design", Name: "Design Resume", Track: "general", Tags: []string{"figma"}},
	}
	provider := fakeEmbeddingProvider{
		fakeProvider: fakeProvider{result: AnalysisResult{Summary: "ranked"}},
		embeddings: map[string][]float64{
			"Go PostgreSQL Redis Kubernetes":      {1, 0},
			"Backend Resume\nbackend\n" + content: {1, 0},
			"Design Resume\ngeneral\nfigma":       {0, 1},
		},
	}
	svc := NewProcessor(store, provider, 3)

	job, processed, err := svc.ProcessNext(context.Background())
	if err != nil {
		t.Fatalf("ProcessNext returned error: %v", err)
	}
	if !processed {
		t.Fatal("expected queued job to be processed")
	}

	var result AnalysisResult
	if err := json.Unmarshal(job.Result, &result); err != nil {
		t.Fatalf("result should be valid JSON: %v", err)
	}
	if result.RecommendedResumeID != "resume-backend" {
		t.Fatalf("expected backend resume recommendation, got %q", result.RecommendedResumeID)
	}
	if len(result.EmbeddingMatches) != 1 {
		t.Fatalf("expected 1 useful embedding match, got %d", len(result.EmbeddingMatches))
	}
	if result.EmbeddingMatches[0].ResumeVersionID != "resume-backend" {
		t.Fatalf("expected backend embedding match, got %+v", result.EmbeddingMatches)
	}
}

func TestUsefulEmbeddingMatchesDropsZeroAndBlankMatches(t *testing.T) {
	matches := usefulEmbeddingMatches([]EmbeddingMatch{
		{ResumeVersionID: "zero", ResumeVersionName: "Zero", Similarity: 0},
		{ResumeVersionID: "blank", Similarity: 0.9},
		{ResumeVersionID: "good", ResumeVersionName: "Backend", Similarity: 0.8},
	})

	if len(matches) != 1 {
		t.Fatalf("expected one useful match, got %#v", matches)
	}
	if matches[0].ResumeVersionID != "good" {
		t.Fatalf("expected good match, got %#v", matches[0])
	}
}

func TestProcessNextRequeuesThenFailsAfterRetries(t *testing.T) {
	store := newFakeStore()
	svc := NewProcessor(store, fakeProvider{err: errors.New("gemini timeout")}, 2)

	job, processed, err := svc.ProcessNext(context.Background())
	if err == nil {
		t.Fatal("expected first provider error")
	}
	if !processed || job.Status != StatusQueued || job.RetryCount != 1 {
		t.Fatalf("expected first failure to requeue with retry_count=1, got status=%q retries=%d", job.Status, job.RetryCount)
	}

	job, processed, err = svc.ProcessNext(context.Background())
	if err == nil {
		t.Fatal("expected second provider error")
	}
	if !processed || job.Status != StatusFailed || job.RetryCount != 2 {
		t.Fatalf("expected second failure to mark failed with retry_count=2, got status=%q retries=%d", job.Status, job.RetryCount)
	}
}

func TestProcessNextPersistsJDExtraction(t *testing.T) {
	store := newFakeStore()
	store.job.JobType = JobTypeJDExtract
	provider := fakeProvider{result: AnalysisResult{
		Summary:           "Backend role focused on distributed systems.",
		ExtractedKeywords: []string{"Go", "PostgreSQL", "Redis"},
		CoreRequirements:  []string{"Build APIs", "Operate databases"},
	}}
	svc := NewProcessor(store, provider, 3)

	job, processed, err := svc.ProcessNext(context.Background())
	if err != nil {
		t.Fatalf("ProcessNext returned error: %v", err)
	}
	if !processed || job.Status != StatusCompleted {
		t.Fatalf("expected completed jd_extract job, got processed=%v status=%q", processed, job.Status)
	}
	if !store.updatedJD.SetKeywords {
		t.Fatal("expected JD extracted keywords to be persisted")
	}
	if got := store.updatedJD.ExtractedKeywords; len(got) != 3 || got[0] != "Go" {
		t.Fatalf("unexpected persisted keywords: %#v", got)
	}
	if store.updatedJD.AISummary == nil || *store.updatedJD.AISummary == "" {
		t.Fatal("expected AI summary to be persisted")
	}
}

type fakeProvider struct {
	result AnalysisResult
	err    error
}

func (p fakeProvider) Analyze(context.Context, AnalysisInput) (AnalysisResult, error) {
	return p.result, p.err
}

type fakeEmbeddingProvider struct {
	fakeProvider
	embeddings map[string][]float64
}

func (p fakeEmbeddingProvider) Embed(_ context.Context, text string, _ string) ([]float64, error) {
	embedding, ok := p.embeddings[text]
	if !ok {
		return nil, errors.New("missing fake embedding for " + text)
	}
	return embedding, nil
}

type fakeStore struct {
	job       postgres.AnalysisJob
	app       postgres.Application
	company   postgres.Company
	jd        postgres.JobDescription
	resume    postgres.ResumeVersion
	resumes   []postgres.ResumeVersion
	updatedJD postgres.UpdateJobDescriptionParams
}

func newFakeStore() *fakeStore {
	now := time.Now()
	resumeID := "00000000-0000-4000-8000-000000000003"
	return &fakeStore{
		job: postgres.AnalysisJob{
			ID:             "00000000-0000-4000-8000-000000000001",
			ApplicationID:  "00000000-0000-4000-8000-000000000002",
			JobType:        JobTypeResumeMatch,
			Status:         StatusQueued,
			InputSnapshot:  json.RawMessage(`{}`),
			IdempotencyKey: "key",
			CreatedAt:      now,
			UpdatedAt:      now,
		},
		app: postgres.Application{
			ID:              "00000000-0000-4000-8000-000000000002",
			CompanyID:       "00000000-0000-4000-8000-000000000004",
			ResumeVersionID: &resumeID,
			Title:           "Backend Engineer",
			RoleTrack:       "backend",
			Status:          "applied",
		},
		company: postgres.Company{
			ID:   "00000000-0000-4000-8000-000000000004",
			Name: "Example Corp",
		},
		jd: postgres.JobDescription{
			ID:                "00000000-0000-4000-8000-000000000005",
			ApplicationID:     "00000000-0000-4000-8000-000000000002",
			RawText:           "Go PostgreSQL Redis Kubernetes",
			ExtractedKeywords: []string{"Go", "PostgreSQL", "Redis", "Kubernetes"},
		},
		resume: postgres.ResumeVersion{
			ID:    resumeID,
			Name:  "Backend Resume",
			Track: "backend",
			Tags:  []string{"Go", "PostgreSQL"},
		},
		resumes: []postgres.ResumeVersion{
			{ID: resumeID, Name: "Backend Resume", Track: "backend", Tags: []string{"Go", "PostgreSQL"}},
		},
	}
}

func (s *fakeStore) CreateAnalysisJob(_ context.Context, arg postgres.CreateAnalysisJobParams) (postgres.AnalysisJob, error) {
	s.job.ApplicationID = arg.ApplicationID
	s.job.JobType = arg.JobType
	s.job.InputSnapshot = arg.InputSnapshot
	s.job.IdempotencyKey = arg.IdempotencyKey
	return s.job, nil
}

func (s *fakeStore) ListAnalysisJobs(context.Context) ([]postgres.AnalysisJob, error) {
	return []postgres.AnalysisJob{s.job}, nil
}

func (s *fakeStore) ListAnalysisJobsByApplication(context.Context, string) ([]postgres.AnalysisJob, error) {
	return []postgres.AnalysisJob{s.job}, nil
}

func (s *fakeStore) GetAnalysisJob(context.Context, string) (postgres.AnalysisJob, error) {
	return s.job, nil
}

func (s *fakeStore) ClaimNextQueuedAnalysisJob(context.Context) (postgres.AnalysisJob, error) {
	if s.job.Status != StatusQueued {
		return postgres.AnalysisJob{}, pgx.ErrNoRows
	}
	s.job.Status = StatusProcessing
	now := time.Now()
	s.job.StartedAt = &now
	return s.job, nil
}

func (s *fakeStore) CompleteAnalysisJob(_ context.Context, _ string, result json.RawMessage) (postgres.AnalysisJob, error) {
	if s.job.Status != StatusProcessing {
		return postgres.AnalysisJob{}, pgx.ErrNoRows
	}
	s.job.Status = StatusCompleted
	s.job.Result = result
	now := time.Now()
	s.job.CompletedAt = &now
	return s.job, nil
}

func (s *fakeStore) FailAnalysisJob(_ context.Context, arg postgres.FailAnalysisJobParams) (postgres.AnalysisJob, error) {
	if s.job.Status != StatusProcessing {
		return postgres.AnalysisJob{}, pgx.ErrNoRows
	}
	s.job.RetryCount++
	s.job.ErrorMessage = &arg.Error
	if int(s.job.RetryCount) >= arg.MaxRetries {
		s.job.Status = StatusFailed
		now := time.Now()
		s.job.CompletedAt = &now
	} else {
		s.job.Status = StatusQueued
	}
	return s.job, nil
}

func (s *fakeStore) GetApplication(context.Context, string) (postgres.Application, error) {
	return s.app, nil
}

func (s *fakeStore) GetCompany(context.Context, string) (postgres.Company, error) {
	return s.company, nil
}

func (s *fakeStore) GetJobDescriptionByApplication(context.Context, string) (postgres.JobDescription, error) {
	return s.jd, nil
}

func (s *fakeStore) GetResumeVersion(context.Context, string) (postgres.ResumeVersion, error) {
	return s.resume, nil
}

func (s *fakeStore) ListResumeVersions(context.Context) ([]postgres.ResumeVersion, error) {
	return s.resumes, nil
}

func (s *fakeStore) UpdateJobDescription(_ context.Context, arg postgres.UpdateJobDescriptionParams) (postgres.JobDescription, error) {
	s.updatedJD = arg
	s.jd.ExtractedKeywords = arg.ExtractedKeywords
	s.jd.AISummary = arg.AISummary
	return s.jd, nil
}
