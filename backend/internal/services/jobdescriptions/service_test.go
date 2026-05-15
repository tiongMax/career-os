package jobdescriptions

import (
	"context"
	"errors"
	"testing"

	"careeros/backend/internal/db/queries"
)

func TestCreateRejectsBlankRawText(t *testing.T) {
	service := New(&fakeStore{})

	_, err := service.Create(context.Background(), queries.CreateJobDescriptionParams{RawText: " "})

	if !errors.Is(err, ErrRawTextRequired) {
		t.Fatalf("expected ErrRawTextRequired, got %v", err)
	}
}

func TestCreateDefaultsNilKeywordsToEmptySlice(t *testing.T) {
	store := &fakeStore{}
	service := New(store)

	_, err := service.Create(context.Background(), queries.CreateJobDescriptionParams{RawText: "Go backend role"})
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

	_, err := service.Update(context.Background(), queries.UpdateJobDescriptionParams{RawText: &blank})
	if !errors.Is(err, ErrRawTextRequired) {
		t.Fatalf("expected ErrRawTextRequired, got %v", err)
	}

	_, err = service.Update(context.Background(), queries.UpdateJobDescriptionParams{SetKeywords: true})
	if err != nil {
		t.Fatalf("Update returned error: %v", err)
	}
	if store.updated.ExtractedKeywords == nil {
		t.Fatal("expected explicit nil keywords to be normalized to an empty slice")
	}
}

type fakeStore struct {
	created queries.CreateJobDescriptionParams
	updated queries.UpdateJobDescriptionParams
}

func (f *fakeStore) CreateJobDescription(_ context.Context, arg queries.CreateJobDescriptionParams) (queries.JobDescription, error) {
	f.created = arg
	return queries.JobDescription{RawText: arg.RawText, ExtractedKeywords: arg.ExtractedKeywords}, nil
}

func (f *fakeStore) GetJobDescriptionByApplication(context.Context, string) (queries.JobDescription, error) {
	return queries.JobDescription{}, nil
}

func (f *fakeStore) UpdateJobDescription(_ context.Context, arg queries.UpdateJobDescriptionParams) (queries.JobDescription, error) {
	f.updated = arg
	return queries.JobDescription{ExtractedKeywords: arg.ExtractedKeywords}, nil
}
