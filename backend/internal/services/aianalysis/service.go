package aianalysis

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"careeros/backend/internal/db/queries"

	"github.com/jackc/pgx/v5"
)

const (
	JobTypeResumeMatch = "resume_match"
	JobTypeJDExtract   = "jd_extract"
	JobTypePrepBrief   = "prep_brief"

	StatusQueued     = "queued"
	StatusProcessing = "processing"
	StatusCompleted  = "completed"
	StatusFailed     = "failed"
)

var (
	ErrUnsupportedJobType = errors.New("unsupported analysis job type")
	ErrNoQueuedJobs       = pgx.ErrNoRows
)

type Store interface {
	CreateAnalysisJob(context.Context, queries.CreateAnalysisJobParams) (queries.AnalysisJob, error)
	ListAnalysisJobs(context.Context) ([]queries.AnalysisJob, error)
	ListAnalysisJobsByApplication(context.Context, string) ([]queries.AnalysisJob, error)
	GetAnalysisJob(context.Context, string) (queries.AnalysisJob, error)
	ClaimNextQueuedAnalysisJob(context.Context) (queries.AnalysisJob, error)
	CompleteAnalysisJob(context.Context, string, json.RawMessage) (queries.AnalysisJob, error)
	FailAnalysisJob(context.Context, queries.FailAnalysisJobParams) (queries.AnalysisJob, error)
	GetApplication(context.Context, string) (queries.Application, error)
	GetCompany(context.Context, string) (queries.Company, error)
	GetJobDescriptionByApplication(context.Context, string) (queries.JobDescription, error)
	GetResumeVersion(context.Context, string) (queries.ResumeVersion, error)
	ListResumeVersions(context.Context) ([]queries.ResumeVersion, error)
	UpdateJobDescription(context.Context, queries.UpdateJobDescriptionParams) (queries.JobDescription, error)
}

type Provider interface {
	Analyze(context.Context, AnalysisInput) (AnalysisResult, error)
}

type Embedder interface {
	Embed(context.Context, string, string) ([]float64, error)
}

type Service struct {
	store      Store
	provider   Provider
	maxRetries int
}

func New(store Store) *Service {
	return &Service{store: store, maxRetries: 3}
}

func NewProcessor(store Store, provider Provider, maxRetries int) *Service {
	if maxRetries <= 0 {
		maxRetries = 3
	}
	return &Service{store: store, provider: provider, maxRetries: maxRetries}
}

func (s *Service) Create(ctx context.Context, applicationID string, jobType string) (queries.AnalysisJob, error) {
	jobType = strings.TrimSpace(jobType)
	if !validJobType(jobType) {
		return queries.AnalysisJob{}, ErrUnsupportedJobType
	}
	key, err := newIdempotencyKey()
	if err != nil {
		return queries.AnalysisJob{}, err
	}
	snapshot, err := json.Marshal(map[string]string{
		"application_id": applicationID,
		"job_type":       jobType,
	})
	if err != nil {
		return queries.AnalysisJob{}, err
	}
	return s.store.CreateAnalysisJob(ctx, queries.CreateAnalysisJobParams{
		ApplicationID:  applicationID,
		JobType:        jobType,
		InputSnapshot:  snapshot,
		IdempotencyKey: key,
	})
}

func (s *Service) List(ctx context.Context) ([]queries.AnalysisJob, error) {
	return s.store.ListAnalysisJobs(ctx)
}

func (s *Service) ListByApplication(ctx context.Context, applicationID string) ([]queries.AnalysisJob, error) {
	return s.store.ListAnalysisJobsByApplication(ctx, applicationID)
}

func (s *Service) Get(ctx context.Context, id string) (queries.AnalysisJob, error) {
	return s.store.GetAnalysisJob(ctx, id)
}

func (s *Service) ProcessNext(ctx context.Context) (queries.AnalysisJob, bool, error) {
	if s.provider == nil {
		return queries.AnalysisJob{}, false, errors.New("analysis provider is not configured")
	}
	job, err := s.store.ClaimNextQueuedAnalysisJob(ctx)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return queries.AnalysisJob{}, false, nil
		}
		return queries.AnalysisJob{}, false, err
	}

	input, err := s.buildInput(ctx, job)
	if err != nil {
		failed, failErr := s.fail(ctx, job.ID, err)
		return failed, true, errors.Join(err, failErr)
	}
	if job.JobType == JobTypeResumeMatch {
		if embedder, ok := s.provider.(Embedder); ok {
			matches, err := rankResumesByEmbeddings(ctx, input, embedder)
			if err != nil {
				failed, failErr := s.fail(ctx, job.ID, err)
				return failed, true, errors.Join(err, failErr)
			}
			input.EmbeddingMatches = usefulEmbeddingMatches(matches)
		}
	}

	result, err := s.provider.Analyze(ctx, input)
	if err != nil {
		failed, failErr := s.fail(ctx, job.ID, err)
		return failed, true, errors.Join(err, failErr)
	}
	if len(input.EmbeddingMatches) > 0 {
		result.EmbeddingMatches = input.EmbeddingMatches
		if result.RecommendedResumeID == "" {
			result.RecommendedResumeID = input.EmbeddingMatches[0].ResumeVersionID
			result.RecommendedResumeName = input.EmbeddingMatches[0].ResumeVersionName
		}
		if result.MatchScore == 0 {
			result.MatchScore = input.EmbeddingMatches[0].Similarity
		}
	}
	if job.JobType == JobTypeJDExtract && input.JobDescription != nil {
		if err := s.persistJDExtraction(ctx, *input.JobDescription, result); err != nil {
			failed, failErr := s.fail(ctx, job.ID, err)
			return failed, true, errors.Join(err, failErr)
		}
	}
	normalizeResult(&result)
	result.GeneratedAt = time.Now()

	raw, err := json.Marshal(result)
	if err != nil {
		failed, failErr := s.fail(ctx, job.ID, err)
		return failed, true, errors.Join(err, failErr)
	}
	completed, err := s.store.CompleteAnalysisJob(ctx, job.ID, raw)
	return completed, true, err
}

func (s *Service) persistJDExtraction(ctx context.Context, jd queries.JobDescription, result AnalysisResult) error {
	keywords := result.ExtractedKeywords
	if len(keywords) == 0 {
		keywords = result.MatchedSkills
	}
	if len(keywords) == 0 && result.Summary == "" {
		return nil
	}
	arg := queries.UpdateJobDescriptionParams{
		ID:          jd.ID,
		AISummary:   stringPtr(result.Summary),
		SetKeywords: len(keywords) > 0,
	}
	if len(keywords) > 0 {
		arg.ExtractedKeywords = keywords
	}
	_, err := s.store.UpdateJobDescription(ctx, arg)
	return err
}

func stringPtr(value string) *string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return &value
}

func rankResumesByEmbeddings(ctx context.Context, input AnalysisInput, embedder Embedder) ([]EmbeddingMatch, error) {
	if input.JobDescription == nil {
		return []EmbeddingMatch{}, nil
	}
	queryEmbedding, err := embedder.Embed(ctx, input.JobDescription.RawText, "RETRIEVAL_QUERY")
	if err != nil {
		return nil, fmt.Errorf("embed job description: %w", err)
	}

	matches := make([]EmbeddingMatch, 0, len(input.ResumeVersions))
	for _, resume := range input.ResumeVersions {
		text := resumeEmbeddingText(resume)
		if strings.TrimSpace(text) == "" {
			continue
		}
		resumeEmbedding, err := embedder.Embed(ctx, text, "RETRIEVAL_DOCUMENT")
		if err != nil {
			return nil, fmt.Errorf("embed resume %s: %w", resume.ID, err)
		}
		matches = append(matches, EmbeddingMatch{
			ResumeVersionID:   resume.ID,
			ResumeVersionName: resume.Name,
			Similarity:        cosineSimilarity(queryEmbedding, resumeEmbedding),
		})
	}
	sort.SliceStable(matches, func(i, j int) bool {
		return matches[i].Similarity > matches[j].Similarity
	})
	return matches, nil
}

func usefulEmbeddingMatches(matches []EmbeddingMatch) []EmbeddingMatch {
	out := make([]EmbeddingMatch, 0, len(matches))
	for _, match := range matches {
		if strings.TrimSpace(match.ResumeVersionName) == "" {
			continue
		}
		if match.Similarity <= 0 {
			continue
		}
		out = append(out, match)
	}
	return out
}

func resumeEmbeddingText(resume queries.ResumeVersion) string {
	parts := []string{resume.Name, resume.Track}
	if resume.ContentText != nil {
		parts = append(parts, *resume.ContentText)
	}
	parts = append(parts, resume.Tags...)
	return strings.Join(parts, "\n")
}

func cosineSimilarity(a, b []float64) float64 {
	if len(a) == 0 || len(a) != len(b) {
		return 0
	}
	var dot, normA, normB float64
	for i := range a {
		dot += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	if normA == 0 || normB == 0 {
		return 0
	}
	return dot / (math.Sqrt(normA) * math.Sqrt(normB))
}

func (s *Service) fail(ctx context.Context, id string, cause error) (queries.AnalysisJob, error) {
	return s.store.FailAnalysisJob(ctx, queries.FailAnalysisJobParams{
		ID:         id,
		Error:      cause.Error(),
		MaxRetries: s.maxRetries,
	})
}

func (s *Service) buildInput(ctx context.Context, job queries.AnalysisJob) (AnalysisInput, error) {
	app, err := s.store.GetApplication(ctx, job.ApplicationID)
	if err != nil {
		return AnalysisInput{}, err
	}
	company, err := s.store.GetCompany(ctx, app.CompanyID)
	if err != nil {
		return AnalysisInput{}, err
	}

	var jd *queries.JobDescription
	if found, err := s.store.GetJobDescriptionByApplication(ctx, app.ID); err == nil {
		jd = &found
	} else if !errors.Is(err, pgx.ErrNoRows) {
		return AnalysisInput{}, err
	}

	var resume *queries.ResumeVersion
	if app.ResumeVersionID != nil {
		found, err := s.store.GetResumeVersion(ctx, *app.ResumeVersionID)
		if err != nil {
			return AnalysisInput{}, err
		}
		resume = &found
	}

	resumes, err := s.store.ListResumeVersions(ctx)
	if err != nil {
		return AnalysisInput{}, err
	}

	return AnalysisInput{
		Job:            job,
		Application:    app,
		Company:        company,
		JobDescription: jd,
		Resume:         resume,
		ResumeVersions: resumes,
	}, nil
}

func validJobType(jobType string) bool {
	switch jobType {
	case JobTypeResumeMatch, JobTypeJDExtract, JobTypePrepBrief:
		return true
	default:
		return false
	}
}

func newIdempotencyKey() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", fmt.Errorf("generate analysis idempotency key: %w", err)
	}
	return hex.EncodeToString(b[:]), nil
}
