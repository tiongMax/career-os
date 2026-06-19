package jobdescriptions

import (
	"context"
	"errors"
	"testing"

	"careeros/backend/internal/persistence/postgres"
)

func TestCreateRejectsBlankRawText(t *testing.T) {
	service := New(&fakeStore{})

	_, err := service.Create(context.Background(), postgres.CreateJobDescriptionParams{RawText: " "})

	if !errors.Is(err, ErrRawTextRequired) {
		t.Fatalf("expected ErrRawTextRequired, got %v", err)
	}
}

func TestCreateDefaultsNilKeywordsToEmptySlice(t *testing.T) {
	store := &fakeStore{}
	service := New(store)

	_, err := service.Create(context.Background(), postgres.CreateJobDescriptionParams{RawText: "Go backend role"})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if store.created.ExtractedKeywords == nil {
		t.Fatal("expected nil keywords to be normalized to an empty slice")
	}
}

func TestUpdateRejectsBlankRawTextAndDefaultsExplicitNilKeywords(t *testing.T) {
	store := &fakeStore{}
	service := New(store)
	blank := ""

	_, err := service.Update(context.Background(), postgres.UpdateJobDescriptionParams{RawText: &blank})
	if !errors.Is(err, ErrRawTextRequired) {
		t.Fatalf("expected ErrRawTextRequired, got %v", err)
	}

	_, err = service.Update(context.Background(), postgres.UpdateJobDescriptionParams{SetKeywords: true})
	if err != nil {
		t.Fatalf("Update returned error: %v", err)
	}
	if store.updated.ExtractedKeywords == nil {
		t.Fatal("expected explicit nil keywords to be normalized to an empty slice")
	}
}

func TestMatchKeywordsUsesResumeContentTextAsStrongEvidence(t *testing.T) {
	content := "Built Redis-backed reminder workers with PostgreSQL audit logs."
	result := matchKeywords([]string{"Redis", "PostgreSQL", "Kubernetes"}, postgres.ResumeVersion{
		Name:        "Backend Resume",
		Track:       "backend",
		ContentText: &content,
		Tags:        []string{"go"},
	})

	if result.Score != 2.0/3.0 {
		t.Fatalf("expected weighted score 2/3, got %v", result.Score)
	}
	if result.ComparedKeywords != 3 {
		t.Fatalf("expected 3 compared keywords, got %d", result.ComparedKeywords)
	}
	if len(result.Evidence) != 2 {
		t.Fatalf("expected 2 evidence entries, got %d", len(result.Evidence))
	}
	for _, ev := range result.Evidence {
		if ev.Source != "content_text" || ev.Weight != 1.0 {
			t.Fatalf("expected content_text evidence with weight 1.0, got %+v", ev)
		}
	}
}

func TestMatchKeywordsWeightsTagsBelowContentText(t *testing.T) {
	result := matchKeywords([]string{"Kafka"}, postgres.ResumeVersion{
		Name:  "Backend Resume",
		Track: "backend",
		Tags:  []string{"kafka"},
	})

	if result.Score != 0.85 {
		t.Fatalf("expected tag-only score 0.85, got %v", result.Score)
	}
	if len(result.Evidence) != 1 || result.Evidence[0].Source != "tags" {
		t.Fatalf("expected tag evidence, got %+v", result.Evidence)
	}
}

type fakeStore struct {
	created postgres.CreateJobDescriptionParams
	updated postgres.UpdateJobDescriptionParams
}

func (f *fakeStore) CreateJobDescription(_ context.Context, arg postgres.CreateJobDescriptionParams) (postgres.JobDescription, error) {
	f.created = arg
	return postgres.JobDescription{RawText: arg.RawText, ExtractedKeywords: arg.ExtractedKeywords}, nil
}

func (f *fakeStore) GetJobDescriptionByApplication(context.Context, string) (postgres.JobDescription, error) {
	return postgres.JobDescription{}, nil
}

func (f *fakeStore) UpdateJobDescription(_ context.Context, arg postgres.UpdateJobDescriptionParams) (postgres.JobDescription, error) {
	f.updated = arg
	return postgres.JobDescription{ExtractedKeywords: arg.ExtractedKeywords}, nil
}

func (f *fakeStore) GetJobDescriptionByID(context.Context, string) (postgres.JobDescription, error) {
	return postgres.JobDescription{}, nil
}
func (f *fakeStore) GetApplication(context.Context, string) (postgres.Application, error) {
	return postgres.Application{}, nil
}
func (f *fakeStore) GetCompany(context.Context, string) (postgres.Company, error) {
	return postgres.Company{}, nil
}
func (f *fakeStore) ListResumeVersions(context.Context) ([]postgres.ResumeVersion, error) {
	return nil, nil
}
func (f *fakeStore) GetResumeVersion(context.Context, string) (postgres.ResumeVersion, error) {
	return postgres.ResumeVersion{}, nil
}
func (f *fakeStore) ListInterviewRoundsByApplication(context.Context, string) ([]postgres.InterviewRound, error) {
	return nil, nil
}
func (f *fakeStore) ListAuditLogsForEntity(context.Context, string, string) ([]postgres.AuditLog, error) {
	return nil, nil
}
func (f *fakeStore) ListContactsByCompany(context.Context, string) ([]postgres.Contact, error) {
	return nil, nil
}
