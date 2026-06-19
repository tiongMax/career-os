package aianalysis

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"careeros/backend/internal/persistence/postgres"
)

const defaultGeminiBaseURL = "https://generativelanguage.googleapis.com/v1beta"
const defaultGeminiMaxOutputTokens = 4096

type GeminiProvider struct {
	apiKey         string
	model          string
	embeddingModel string
	baseURL        string
	client         *http.Client
}

func NewGeminiProvider(apiKey, model, baseURL string) *GeminiProvider {
	return NewGeminiProviderWithEmbedding(apiKey, model, "gemini-embedding-001", baseURL)
}

func NewGeminiProviderWithEmbedding(apiKey, model, embeddingModel, baseURL string) *GeminiProvider {
	return NewGeminiProviderWithEmbeddingAndTimeout(apiKey, model, embeddingModel, baseURL, 90*time.Second)
}

func NewGeminiProviderWithEmbeddingAndTimeout(apiKey, model, embeddingModel, baseURL string, timeout time.Duration) *GeminiProvider {
	if model == "" {
		model = "gemini-3.5-flash"
	}
	if embeddingModel == "" {
		embeddingModel = "gemini-embedding-001"
	}
	if baseURL == "" {
		baseURL = defaultGeminiBaseURL
	}
	if timeout <= 0 {
		timeout = 90 * time.Second
	}
	return &GeminiProvider{
		apiKey:         apiKey,
		model:          strings.TrimPrefix(model, "models/"),
		embeddingModel: strings.TrimPrefix(embeddingModel, "models/"),
		baseURL:        strings.TrimRight(baseURL, "/"),
		client:         &http.Client{Timeout: timeout},
	}
}

func (p *GeminiProvider) Analyze(ctx context.Context, input AnalysisInput) (AnalysisResult, error) {
	if p.apiKey == "" {
		return AnalysisResult{}, errors.New("GEMINI_API_KEY is required")
	}

	prompt, err := buildGeminiPrompt(input)
	if err != nil {
		return AnalysisResult{}, err
	}
	body := geminiRequest{
		SystemInstruction: geminiContent{Parts: []geminiPart{{Text: "You are an AI career analysis engine. Return strict JSON only and do not include markdown."}}},
		Contents:          []geminiContent{{Parts: []geminiPart{{Text: prompt}}}},
		GenerationConfig: geminiGenerationConfig{
			ResponseMIMEType: "application/json",
			MaxOutputTokens:  defaultGeminiMaxOutputTokens,
		},
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return AnalysisResult{}, err
	}

	url := fmt.Sprintf("%s/models/%s:generateContent", p.baseURL, p.model)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(raw))
	if err != nil {
		return AnalysisResult{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", p.apiKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return AnalysisResult{}, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return AnalysisResult{}, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return AnalysisResult{}, fmt.Errorf("gemini generateContent failed: status=%d body=%s", resp.StatusCode, string(respBody))
	}

	var parsed geminiResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return AnalysisResult{}, err
	}
	text := parsed.firstText()
	if strings.TrimSpace(text) == "" {
		return AnalysisResult{}, errors.New("gemini response did not include text")
	}

	result, err := parseAnalysisResult(text)
	if err != nil {
		return AnalysisResult{}, fmt.Errorf("parse gemini JSON result: %w", err)
	}
	normalizeResult(&result)
	return result, nil
}

func parseAnalysisResult(text string) (AnalysisResult, error) {
	cleaned := strings.TrimSpace(text)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	var result AnalysisResult
	if err := json.Unmarshal([]byte(cleaned), &result); err == nil {
		return result, nil
	}

	if object := firstJSONObject(cleaned); object != "" {
		if err := json.Unmarshal([]byte(object), &result); err == nil {
			return result, nil
		}
	}

	if cleaned != "" {
		return AnalysisResult{Summary: truncate(cleaned, 2000)}, nil
	}
	return AnalysisResult{}, errors.New("empty Gemini JSON response")
}

func firstJSONObject(text string) string {
	start := strings.Index(text, "{")
	if start == -1 {
		return ""
	}
	depth := 0
	inString := false
	escaped := false
	for i := start; i < len(text); i++ {
		ch := text[i]
		if escaped {
			escaped = false
			continue
		}
		if ch == '\\' && inString {
			escaped = true
			continue
		}
		if ch == '"' {
			inString = !inString
			continue
		}
		if inString {
			continue
		}
		switch ch {
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return text[start : i+1]
			}
		}
	}
	return ""
}

func (p *GeminiProvider) Embed(ctx context.Context, text, taskType string) ([]float64, error) {
	if p.apiKey == "" {
		return nil, errors.New("GEMINI_API_KEY is required")
	}
	body := geminiEmbedRequest{
		Model:    "models/" + p.embeddingModel,
		Content:  geminiContent{Parts: []geminiPart{{Text: text}}},
		TaskType: taskType,
	}
	raw, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/models/%s:embedContent", p.baseURL, p.embeddingModel)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", p.apiKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("gemini embedContent failed: status=%d body=%s", resp.StatusCode, string(respBody))
	}

	var parsed geminiEmbedResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, err
	}
	if len(parsed.Embedding.Values) == 0 {
		return nil, errors.New("gemini embedding response did not include values")
	}
	return parsed.Embedding.Values, nil
}

func buildGeminiPrompt(input AnalysisInput) (string, error) {
	raw, err := json.Marshal(struct {
		JobType          string                   `json:"job_type"`
		Instructions     string                   `json:"instructions"`
		Application      any                      `json:"application"`
		Company          any                      `json:"company"`
		JobDescription   *truncatedJobDescription `json:"job_description,omitempty"`
		Resume           any                      `json:"resume,omitempty"`
		ResumeVersions   []promptResumeVersion    `json:"resume_versions,omitempty"`
		EmbeddingMatches []EmbeddingMatch         `json:"embedding_matches,omitempty"`
		Schema           map[string]string        `json:"required_json_schema"`
	}{
		JobType:      input.Job.JobType,
		Instructions: instructionsForJob(input.Job.JobType),
		Application:  input.Application,
		Company:      input.Company,
		JobDescription: func() *truncatedJobDescription {
			if input.JobDescription == nil {
				return nil
			}
			return &truncatedJobDescription{
				RawText:           truncate(input.JobDescription.RawText, 6000),
				ExtractedKeywords: input.JobDescription.ExtractedKeywords,
				AISummary:         input.JobDescription.AISummary,
			}
		}(),
		Resume:           promptResume(input),
		ResumeVersions:   promptResumeVersions(input),
		EmbeddingMatches: promptEmbeddingMatches(input),
		Schema:           resultSchemaForJob(input.Job.JobType),
	})
	if err != nil {
		return "", err
	}

	return "Analyze this CareerOS application context for the requested job_type. Return one JSON object matching required_json_schema. Use only evidence present in the input.\n\n" + string(raw), nil
}

func instructionsForJob(jobType string) string {
	switch jobType {
	case JobTypeResumeMatch:
		return "Rank resume fit against the job description. Prefer embedding_matches for recommendation, then explain matched skills, missing skills, resume edits, and interview focus."
	case JobTypeJDExtract:
		return "Extract structured job description intelligence. Focus on skills, core requirements, responsibilities, seniority, and a concise summary. Do not recommend resumes."
	case JobTypePrepBrief:
		return "Create an interview preparation brief using the application, company, job description, and attached resume. Focus on prep plan, talking points, suggested questions, and skill gaps."
	default:
		return "Analyze the application context and return concise structured JSON."
	}
}

func resultSchemaForJob(jobType string) map[string]string {
	common := map[string]string{
		"summary": "short explanation of the analysis",
	}
	switch jobType {
	case JobTypeResumeMatch:
		common["recommended_resume_id"] = "best resume version id"
		common["recommended_resume_name"] = "best resume version name"
		common["match_score"] = "number from 0 to 1"
		common["matched_skills"] = "array of JD skills present in the recommended resume"
		common["missing_skills"] = "array of important JD skills missing from the recommended resume"
		common["resume_feedback"] = "array of concrete resume improvement suggestions"
		common["interview_focus"] = "array of interview prep focus areas"
		common["embedding_matches"] = "array of embedding-ranked resume matches if provided"
	case JobTypeJDExtract:
		common["extracted_keywords"] = "array of normalized technical/domain keywords from the JD"
		common["core_requirements"] = "array of must-have requirements"
		common["responsibilities"] = "array of role responsibilities"
		common["seniority"] = "inferred seniority level such as intern, junior, mid, senior, staff, or unspecified"
	case JobTypePrepBrief:
		common["matched_skills"] = "array of strengths to emphasize"
		common["missing_skills"] = "array of gaps to review"
		common["prep_plan"] = "array of concrete preparation steps"
		common["talking_points"] = "array of concise interview talking points"
		common["suggested_questions"] = "array of questions to ask the interviewer"
		common["interview_focus"] = "array of topics to study"
	}
	return common
}

type truncatedJobDescription struct {
	RawText           string   `json:"raw_text"`
	ExtractedKeywords []string `json:"extracted_keywords"`
	AISummary         *string  `json:"ai_summary,omitempty"`
}

type promptResumeVersion struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Track       string   `json:"track"`
	ContentText string   `json:"content_text,omitempty"`
	Tags        []string `json:"tags"`
}

func promptResume(input AnalysisInput) *promptResumeVersion {
	if input.Resume == nil {
		return nil
	}
	resume := *input.Resume
	contentText := ""
	if resume.ContentText != nil {
		contentText = truncate(*resume.ContentText, 2000)
	}
	return &promptResumeVersion{
		ID:          resume.ID,
		Name:        resume.Name,
		Track:       resume.Track,
		ContentText: contentText,
		Tags:        resume.Tags,
	}
}

func promptResumeVersions(input AnalysisInput) []promptResumeVersion {
	if input.Job.JobType != JobTypeResumeMatch {
		return nil
	}
	byID := make(map[string]postgres.ResumeVersion, len(input.ResumeVersions))
	for _, resume := range input.ResumeVersions {
		byID[resume.ID] = resume
	}

	ordered := make([]postgres.ResumeVersion, 0, len(input.ResumeVersions))
	seen := map[string]bool{}
	for _, match := range input.EmbeddingMatches {
		resume, ok := byID[match.ResumeVersionID]
		if !ok || seen[resume.ID] {
			continue
		}
		ordered = append(ordered, resume)
		seen[resume.ID] = true
		if len(ordered) >= 10 {
			break
		}
	}
	for _, resume := range input.ResumeVersions {
		if seen[resume.ID] {
			continue
		}
		ordered = append(ordered, resume)
		seen[resume.ID] = true
		if len(ordered) >= 10 {
			break
		}
	}

	out := make([]promptResumeVersion, 0, len(ordered))
	for _, resume := range ordered {
		contentText := ""
		if resume.ContentText != nil {
			contentText = truncate(*resume.ContentText, 2000)
		}
		out = append(out, promptResumeVersion{
			ID:          resume.ID,
			Name:        resume.Name,
			Track:       resume.Track,
			ContentText: contentText,
			Tags:        resume.Tags,
		})
	}
	return out
}

func promptEmbeddingMatches(input AnalysisInput) []EmbeddingMatch {
	if input.Job.JobType != JobTypeResumeMatch || len(input.EmbeddingMatches) == 0 {
		return nil
	}
	if len(input.EmbeddingMatches) <= 10 {
		return input.EmbeddingMatches
	}
	return input.EmbeddingMatches[:10]
}

func truncate(value string, max int) string {
	if len(value) <= max {
		return value
	}
	return value[:max]
}

func normalizeResult(result *AnalysisResult) {
	if result.MatchedSkills == nil {
		result.MatchedSkills = []string{}
	}
	if result.MissingSkills == nil {
		result.MissingSkills = []string{}
	}
	if result.ResumeFeedback == nil {
		result.ResumeFeedback = []string{}
	}
	if result.InterviewFocus == nil {
		result.InterviewFocus = []string{}
	}
	if result.ExtractedKeywords == nil {
		result.ExtractedKeywords = []string{}
	}
	if result.CoreRequirements == nil {
		result.CoreRequirements = []string{}
	}
	if result.Responsibilities == nil {
		result.Responsibilities = []string{}
	}
	if result.PrepPlan == nil {
		result.PrepPlan = []string{}
	}
	if result.TalkingPoints == nil {
		result.TalkingPoints = []string{}
	}
	if result.SuggestedQuestions == nil {
		result.SuggestedQuestions = []string{}
	}
	if result.EmbeddingMatches == nil {
		result.EmbeddingMatches = []EmbeddingMatch{}
	}
	if result.MatchScore < 0 {
		result.MatchScore = 0
	}
	if result.MatchScore > 1 {
		result.MatchScore = 1
	}
}

type geminiRequest struct {
	SystemInstruction geminiContent          `json:"system_instruction"`
	Contents          []geminiContent        `json:"contents"`
	GenerationConfig  geminiGenerationConfig `json:"generationConfig"`
}

type geminiGenerationConfig struct {
	ResponseMIMEType string `json:"responseMimeType"`
	MaxOutputTokens  int    `json:"maxOutputTokens"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiResponse struct {
	Candidates []struct {
		Content geminiContent `json:"content"`
	} `json:"candidates"`
}

type geminiEmbedRequest struct {
	Model    string        `json:"model,omitempty"`
	Content  geminiContent `json:"content"`
	TaskType string        `json:"taskType,omitempty"`
}

type geminiEmbedResponse struct {
	Embedding struct {
		Values []float64 `json:"values"`
	} `json:"embedding"`
}

func (r geminiResponse) firstText() string {
	if len(r.Candidates) == 0 || len(r.Candidates[0].Content.Parts) == 0 {
		return ""
	}
	return r.Candidates[0].Content.Parts[0].Text
}
