package aianalysis

import (
	"time"

	"careeros/backend/internal/db/queries"
)

type AnalysisInput struct {
	Job              queries.AnalysisJob     `json:"job"`
	Application      queries.Application     `json:"application"`
	Company          queries.Company         `json:"company"`
	JobDescription   *queries.JobDescription `json:"job_description,omitempty"`
	Resume           *queries.ResumeVersion  `json:"resume,omitempty"`
	ResumeVersions   []queries.ResumeVersion `json:"resume_versions"`
	EmbeddingMatches []EmbeddingMatch        `json:"embedding_matches,omitempty"`
}

type AnalysisResult struct {
	Summary               string           `json:"summary"`
	RecommendedResumeID   string           `json:"recommended_resume_id,omitempty"`
	RecommendedResumeName string           `json:"recommended_resume_name,omitempty"`
	MatchScore            float64          `json:"match_score"`
	MatchedSkills         []string         `json:"matched_skills"`
	MissingSkills         []string         `json:"missing_skills"`
	ExtractedKeywords     []string         `json:"extracted_keywords,omitempty"`
	CoreRequirements      []string         `json:"core_requirements,omitempty"`
	Responsibilities      []string         `json:"responsibilities,omitempty"`
	Seniority             string           `json:"seniority,omitempty"`
	ResumeFeedback        []string         `json:"resume_feedback"`
	InterviewFocus        []string         `json:"interview_focus"`
	PrepPlan              []string         `json:"prep_plan,omitempty"`
	TalkingPoints         []string         `json:"talking_points,omitempty"`
	SuggestedQuestions    []string         `json:"suggested_questions,omitempty"`
	EmbeddingMatches      []EmbeddingMatch `json:"embedding_matches,omitempty"`
	GeneratedAt           time.Time        `json:"generated_at"`
}

type EmbeddingMatch struct {
	ResumeVersionID   string  `json:"resume_version_id"`
	ResumeVersionName string  `json:"resume_version_name"`
	Similarity        float64 `json:"similarity"`
}
