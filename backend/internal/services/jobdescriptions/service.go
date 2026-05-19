package jobdescriptions

import (
	"context"
	"errors"
	"strings"

	"careeros/backend/internal/db/queries"
)

var ErrRawTextRequired = errors.New("job description raw_text is required")
var ErrNoKeywords = errors.New("job description has no extracted keywords; run extract-keywords first")

// skillDict is the canonical list of skills matched case-insensitively against raw_text / resume content.
var skillDict = []string{
	// Languages
	"Go", "Python", "TypeScript", "JavaScript", "Java", "C++", "C#", "Rust", "Scala", "Ruby", "PHP", "Swift", "Kotlin", "R",
	// Frontend
	"React", "Next.js", "Vue", "Angular", "Svelte", "Tailwind",
	// Backend / frameworks
	"Node.js", "Express", "FastAPI", "Django", "Flask", "Spring", "Rails", "Gin", "Echo",
	// Databases
	"PostgreSQL", "MySQL", "SQLite", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "BigQuery",
	// Cloud / infra
	"AWS", "GCP", "Azure", "Kubernetes", "Docker", "Terraform", "Helm", "Ansible", "CI/CD", "GitHub Actions",
	// Data / ML / AI
	"Machine Learning", "Deep Learning", "NLP", "LLM", "PyTorch", "TensorFlow", "scikit-learn", "Pandas", "NumPy", "Spark",
	// Messaging / streaming
	"Kafka", "RabbitMQ", "Pub/Sub", "SQS", "gRPC", "GraphQL", "REST",
	// Practices
	"Microservices", "DevOps", "Agile", "Scrum", "System Design", "API Design",
}

type Store interface {
	CreateJobDescription(context.Context, queries.CreateJobDescriptionParams) (queries.JobDescription, error)
	GetJobDescriptionByApplication(context.Context, string) (queries.JobDescription, error)
	GetJobDescriptionByID(context.Context, string) (queries.JobDescription, error)
	UpdateJobDescription(context.Context, queries.UpdateJobDescriptionParams) (queries.JobDescription, error)
	ListResumeVersions(context.Context) ([]queries.ResumeVersion, error)
	GetResumeVersion(context.Context, string) (queries.ResumeVersion, error)
}

type Service struct {
	store Store
}

func New(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, arg queries.CreateJobDescriptionParams) (queries.JobDescription, error) {
	if strings.TrimSpace(arg.RawText) == "" {
		return queries.JobDescription{}, ErrRawTextRequired
	}
	if arg.ExtractedKeywords == nil {
		arg.ExtractedKeywords = []string{}
	}
	return s.store.CreateJobDescription(ctx, arg)
}

func (s *Service) GetByApplication(ctx context.Context, applicationID string) (queries.JobDescription, error) {
	return s.store.GetJobDescriptionByApplication(ctx, applicationID)
}

func (s *Service) Update(ctx context.Context, arg queries.UpdateJobDescriptionParams) (queries.JobDescription, error) {
	if arg.RawText != nil && strings.TrimSpace(*arg.RawText) == "" {
		return queries.JobDescription{}, ErrRawTextRequired
	}
	if arg.SetKeywords && arg.ExtractedKeywords == nil {
		arg.ExtractedKeywords = []string{}
	}
	return s.store.UpdateJobDescription(ctx, arg)
}

// ExtractKeywords scans the JD's raw_text for known skills, saves them, and returns the updated JD.
func (s *Service) ExtractKeywords(ctx context.Context, jdID string) (queries.JobDescription, error) {
	jd, err := s.store.GetJobDescriptionByID(ctx, jdID)
	if err != nil {
		return queries.JobDescription{}, err
	}

	lower := strings.ToLower(jd.RawText)
	seen := map[string]bool{}
	var keywords []string
	for _, skill := range skillDict {
		if seen[skill] {
			continue
		}
		if strings.Contains(lower, strings.ToLower(skill)) {
			keywords = append(keywords, skill)
			seen[skill] = true
		}
	}
	if keywords == nil {
		keywords = []string{}
	}

	return s.store.UpdateJobDescription(ctx, queries.UpdateJobDescriptionParams{
		ID:                jd.ID,
		ExtractedKeywords: keywords,
		SetKeywords:       true,
	})
}

// CompareResume compares a resume's content against a JD's extracted keywords.
func (s *Service) CompareResume(ctx context.Context, jdID, resumeVersionID string) (queries.ResumeMatchResult, error) {
	jd, err := s.store.GetJobDescriptionByID(ctx, jdID)
	if err != nil {
		return queries.ResumeMatchResult{}, err
	}
	if len(jd.ExtractedKeywords) == 0 {
		return queries.ResumeMatchResult{}, ErrNoKeywords
	}

	resume, err := s.store.GetResumeVersion(ctx, resumeVersionID)
	if err != nil {
		return queries.ResumeMatchResult{}, err
	}

	return matchKeywords(jd.ExtractedKeywords, resume), nil
}

// RecommendedResume compares all resumes against the application's JD and returns the best match.
func (s *Service) RecommendedResume(ctx context.Context, applicationID string) (queries.RecommendedResumeResult, error) {
	jd, err := s.store.GetJobDescriptionByApplication(ctx, applicationID)
	if err != nil {
		return queries.RecommendedResumeResult{}, err
	}
	if len(jd.ExtractedKeywords) == 0 {
		return queries.RecommendedResumeResult{}, ErrNoKeywords
	}

	resumes, err := s.store.ListResumeVersions(ctx)
	if err != nil {
		return queries.RecommendedResumeResult{}, err
	}
	if len(resumes) == 0 {
		return queries.RecommendedResumeResult{}, errors.New("no resume versions found")
	}

	best := queries.RecommendedResumeResult{Score: -1}
	for _, rv := range resumes {
		result := matchKeywords(jd.ExtractedKeywords, rv)
		if result.Score > best.Score {
			best = queries.RecommendedResumeResult{
				ResumeVersion: rv,
				Matched:       result.Matched,
				Missing:       result.Missing,
				Score:         result.Score,
			}
		}
	}
	return best, nil
}

func matchKeywords(keywords []string, resume queries.ResumeVersion) queries.ResumeMatchResult {
	haystack := strings.ToLower(resumeSearchText(resume))
	var matched, missing []string
	for _, kw := range keywords {
		if strings.Contains(haystack, strings.ToLower(kw)) {
			matched = append(matched, kw)
		} else {
			missing = append(missing, kw)
		}
	}
	if matched == nil {
		matched = []string{}
	}
	if missing == nil {
		missing = []string{}
	}
	score := 0.0
	if len(keywords) > 0 {
		score = float64(len(matched)) / float64(len(keywords))
	}
	return queries.ResumeMatchResult{Matched: matched, Missing: missing, Score: score}
}

func resumeSearchText(rv queries.ResumeVersion) string {
	parts := []string{rv.Name, rv.Track}
	parts = append(parts, rv.Tags...)
	if rv.ContentText != nil {
		parts = append(parts, *rv.ContentText)
	}
	return strings.Join(parts, " ")
}
