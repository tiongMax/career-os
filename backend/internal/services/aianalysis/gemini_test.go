package aianalysis

import "testing"

func TestParseAnalysisResultHandlesFencedJSON(t *testing.T) {
	result, err := parseAnalysisResult("```json\n{\"summary\":\"ok\",\"matched_skills\":[\"Go\"]}\n```")
	if err != nil {
		t.Fatalf("parseAnalysisResult returned error: %v", err)
	}
	if result.Summary != "ok" || len(result.MatchedSkills) != 1 {
		t.Fatalf("unexpected parsed result: %+v", result)
	}
}

func TestParseAnalysisResultFallsBackToSummaryForPartialJSON(t *testing.T) {
	result, err := parseAnalysisResult(`{"summary":"partial","matched_skills":[`)
	if err != nil {
		t.Fatalf("parseAnalysisResult returned error: %v", err)
	}
	if result.Summary == "" {
		t.Fatal("expected fallback summary for malformed JSON")
	}
}
