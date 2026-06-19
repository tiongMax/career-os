package jobdescriptions

import (
	"context"
	"errors"
	"strings"
	"time"

	"careeros/backend/internal/persistence/postgres"
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
	CreateJobDescription(context.Context, postgres.CreateJobDescriptionParams) (postgres.JobDescription, error)
	GetJobDescriptionByApplication(context.Context, string) (postgres.JobDescription, error)
	GetJobDescriptionByID(context.Context, string) (postgres.JobDescription, error)
	UpdateJobDescription(context.Context, postgres.UpdateJobDescriptionParams) (postgres.JobDescription, error)
	ListResumeVersions(context.Context) ([]postgres.ResumeVersion, error)
	GetResumeVersion(context.Context, string) (postgres.ResumeVersion, error)
	GetApplication(context.Context, string) (postgres.Application, error)
	GetCompany(context.Context, string) (postgres.Company, error)
	ListInterviewRoundsByApplication(context.Context, string) ([]postgres.InterviewRound, error)
	ListAuditLogsForEntity(context.Context, string, string) ([]postgres.AuditLog, error)
	ListContactsByCompany(context.Context, string) ([]postgres.Contact, error)
}

type Service struct {
	store Store
}

func New(store Store) *Service {
	return &Service{store: store}
}

func (s *Service) Create(ctx context.Context, arg postgres.CreateJobDescriptionParams) (postgres.JobDescription, error) {
	if strings.TrimSpace(arg.RawText) == "" {
		return postgres.JobDescription{}, ErrRawTextRequired
	}
	if arg.ExtractedKeywords == nil {
		arg.ExtractedKeywords = []string{}
	}
	return s.store.CreateJobDescription(ctx, arg)
}

func (s *Service) GetByApplication(ctx context.Context, applicationID string) (postgres.JobDescription, error) {
	return s.store.GetJobDescriptionByApplication(ctx, applicationID)
}

func (s *Service) Update(ctx context.Context, arg postgres.UpdateJobDescriptionParams) (postgres.JobDescription, error) {
	if arg.RawText != nil && strings.TrimSpace(*arg.RawText) == "" {
		return postgres.JobDescription{}, ErrRawTextRequired
	}
	if arg.SetKeywords && arg.ExtractedKeywords == nil {
		arg.ExtractedKeywords = []string{}
	}
	return s.store.UpdateJobDescription(ctx, arg)
}

// ExtractKeywords scans the JD's raw_text for known skills, saves them, and returns the updated JD.
func (s *Service) ExtractKeywords(ctx context.Context, jdID string) (postgres.JobDescription, error) {
	jd, err := s.store.GetJobDescriptionByID(ctx, jdID)
	if err != nil {
		return postgres.JobDescription{}, err
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

	return s.store.UpdateJobDescription(ctx, postgres.UpdateJobDescriptionParams{
		ID:                jd.ID,
		ExtractedKeywords: keywords,
		SetKeywords:       true,
	})
}

// CompareResume compares a resume's content against a JD's extracted keywords.
func (s *Service) CompareResume(ctx context.Context, jdID, resumeVersionID string) (postgres.ResumeMatchResult, error) {
	jd, err := s.store.GetJobDescriptionByID(ctx, jdID)
	if err != nil {
		return postgres.ResumeMatchResult{}, err
	}
	if len(jd.ExtractedKeywords) == 0 {
		return postgres.ResumeMatchResult{}, ErrNoKeywords
	}

	resume, err := s.store.GetResumeVersion(ctx, resumeVersionID)
	if err != nil {
		return postgres.ResumeMatchResult{}, err
	}

	return matchKeywords(jd.ExtractedKeywords, resume), nil
}

// RecommendedResume compares all resumes against the application's JD and returns the best match.
func (s *Service) RecommendedResume(ctx context.Context, applicationID string) (postgres.RecommendedResumeResult, error) {
	jd, err := s.store.GetJobDescriptionByApplication(ctx, applicationID)
	if err != nil {
		return postgres.RecommendedResumeResult{}, err
	}
	if len(jd.ExtractedKeywords) == 0 {
		return postgres.RecommendedResumeResult{}, ErrNoKeywords
	}

	resumes, err := s.store.ListResumeVersions(ctx)
	if err != nil {
		return postgres.RecommendedResumeResult{}, err
	}
	if len(resumes) == 0 {
		return postgres.RecommendedResumeResult{}, errors.New("no resume versions found")
	}

	best := postgres.RecommendedResumeResult{Score: -1}
	for _, rv := range resumes {
		result := matchKeywords(jd.ExtractedKeywords, rv)
		if result.Score > best.Score {
			best = postgres.RecommendedResumeResult{
				ResumeVersion: rv,
				Matched:       result.Matched,
				Missing:       result.Missing,
				Score:         result.Score,
			}
		}
	}
	return best, nil
}

func matchKeywords(keywords []string, resume postgres.ResumeVersion) postgres.ResumeMatchResult {
	var matched, missing []string
	var evidence []postgres.SkillEvidence
	scoreTotal := 0.0
	for _, kw := range keywords {
		source, weight := bestKeywordEvidence(kw, resume)
		if weight > 0 {
			matched = append(matched, kw)
			evidence = append(evidence, postgres.SkillEvidence{Keyword: kw, Source: source, Weight: weight})
			scoreTotal += weight
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
	if evidence == nil {
		evidence = []postgres.SkillEvidence{}
	}
	score := 0.0
	if len(keywords) > 0 {
		score = scoreTotal / float64(len(keywords))
	}
	return postgres.ResumeMatchResult{Matched: matched, Missing: missing, Score: score, ComparedKeywords: len(keywords), Evidence: evidence}
}

func bestKeywordEvidence(keyword string, resume postgres.ResumeVersion) (string, float64) {
	if resume.ContentText != nil && containsSkill(*resume.ContentText, keyword) {
		return "content_text", 1.0
	}
	for _, tag := range resume.Tags {
		if containsSkill(tag, keyword) {
			return "tags", 0.85
		}
	}
	if containsSkill(resume.Name, keyword) {
		return "name", 0.6
	}
	if containsSkill(resume.Track, keyword) {
		return "track", 0.4
	}
	return "", 0
}

func containsSkill(text, keyword string) bool {
	return strings.Contains(strings.ToLower(text), strings.ToLower(keyword))
}

func resumeSearchText(rv postgres.ResumeVersion) string {
	parts := []string{rv.Name, rv.Track}
	if rv.ContentText != nil {
		parts = append(parts, *rv.ContentText)
	}
	parts = append(parts, rv.Tags...)
	return strings.Join(parts, " ")
}

// PrepContext aggregates all data relevant to interview preparation for an application.
func (s *Service) PrepContext(ctx context.Context, applicationID string) (postgres.PrepContext, error) {
	app, err := s.store.GetApplication(ctx, applicationID)
	if err != nil {
		return postgres.PrepContext{}, err
	}
	company, err := s.store.GetCompany(ctx, app.CompanyID)
	if err != nil {
		return postgres.PrepContext{}, err
	}

	var jd *postgres.JobDescription
	if jdResult, err := s.store.GetJobDescriptionByApplication(ctx, applicationID); err == nil {
		jd = &jdResult
	}

	var resume *postgres.ResumeVersion
	if app.ResumeVersionID != nil {
		if rv, err := s.store.GetResumeVersion(ctx, *app.ResumeVersionID); err == nil {
			resume = &rv
		}
	}

	interviews, _ := s.store.ListInterviewRoundsByApplication(ctx, applicationID)
	if interviews == nil {
		interviews = []postgres.InterviewRound{}
	}
	contacts, _ := s.store.ListContactsByCompany(ctx, app.CompanyID)
	if contacts == nil {
		contacts = []postgres.Contact{}
	}
	auditLogs, _ := s.store.ListAuditLogsForEntity(ctx, "application", applicationID)
	if auditLogs == nil {
		auditLogs = []postgres.AuditLog{}
	}

	return postgres.PrepContext{
		Application:    app,
		Company:        company,
		JobDescription: jd,
		Resume:         resume,
		Interviews:     interviews,
		Contacts:       contacts,
		AuditLogs:      auditLogs,
	}, nil
}

// GeneratePrepBrief builds a template-based interview prep brief from the application's prep context.
func (s *Service) GeneratePrepBrief(ctx context.Context, applicationID string) (postgres.PrepBrief, error) {
	pc, err := s.PrepContext(ctx, applicationID)
	if err != nil {
		return postgres.PrepBrief{}, err
	}
	return buildPrepBrief(pc), nil
}

func buildPrepBrief(pc postgres.PrepContext) postgres.PrepBrief {
	roleSummary := pc.Application.Title + " at " + pc.Company.Name
	if pc.Application.EmploymentType != nil {
		roleSummary += " (" + *pc.Application.EmploymentType + ")"
	}
	if pc.Application.Location != nil {
		roleSummary += " · " + *pc.Application.Location
	}

	var keyGaps []string
	if pc.JobDescription != nil && pc.Resume != nil && len(pc.JobDescription.ExtractedKeywords) > 0 {
		keyGaps = matchKeywords(pc.JobDescription.ExtractedKeywords, *pc.Resume).Missing
	}
	if keyGaps == nil {
		keyGaps = []string{}
	}

	seen := map[string]bool{}
	var focusAreas []string
	for _, iv := range pc.Interviews {
		area := interviewFocusArea(iv.RoundType)
		if !seen[area] {
			focusAreas = append(focusAreas, area)
			seen[area] = true
		}
	}
	if len(focusAreas) == 0 {
		focusAreas = []string{"Technical skills", "Behavioral questions", "Company culture fit"}
	}

	var talkingPoints []string
	if pc.Resume != nil {
		for _, tag := range pc.Resume.Tags {
			talkingPoints = append(talkingPoints, "Highlight experience with "+tag)
		}
	}
	if pc.JobDescription != nil && pc.Resume != nil && len(pc.JobDescription.ExtractedKeywords) > 0 {
		for _, kw := range matchKeywords(pc.JobDescription.ExtractedKeywords, *pc.Resume).Matched {
			talkingPoints = append(talkingPoints, "Demonstrate "+kw+" proficiency")
		}
	}
	if len(talkingPoints) == 0 {
		talkingPoints = []string{"Research the company and role", "Prepare STAR-method stories", "Review your resume highlights"}
	}

	return postgres.PrepBrief{
		RoleSummary:   roleSummary,
		KeyGaps:       keyGaps,
		FocusAreas:    focusAreas,
		TalkingPoints: talkingPoints,
		GeneratedAt:   time.Now(),
	}
}

func interviewFocusArea(roundType string) string {
	switch roundType {
	case "technical":
		return "Technical coding and problem solving"
	case "behavioral":
		return "Behavioral questions (STAR method)"
	case "system_design":
		return "System design and architecture"
	case "hr":
		return "HR screening and culture fit"
	case "take_home":
		return "Take-home assignment review"
	default:
		words := strings.ReplaceAll(roundType, "_", " ")
		if len(words) > 0 {
			return strings.ToUpper(words[:1]) + words[1:]
		}
		return words
	}
}
