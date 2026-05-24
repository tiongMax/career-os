package resumes

import (
	"context"
	"errors"
	"testing"

	"careeros/backend/internal/db/queries"
)

func TestCreateResumeVersionValidation(t *testing.T) {
	service := New(&fakeStore{})

	_, err := service.Create(context.Background(), queries.CreateResumeVersionParams{Name: "", Track: "backend"})
	if !errors.Is(err, ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}

	_, err = service.Create(context.Background(), queries.CreateResumeVersionParams{Name: "Backend v1", Track: "mobile"})
	if !errors.Is(err, ErrInvalidTrack) {
		t.Fatalf("expected ErrInvalidTrack, got %v", err)
	}
}

func TestCreateResumeVersionDefaultsNilTagsToEmptySlice(t *testing.T) {
	store := &fakeStore{}
	service := New(store)

	_, err := service.Create(context.Background(), queries.CreateResumeVersionParams{Name: "Backend v1", Track: "backend"})
	if err != nil {
		t.Fatalf("Create returned error: %v", err)
	}
	if store.created.Tags == nil {
		t.Fatal("expected nil tags to be normalized to an empty slice")
	}
}

func TestUpdateResumeVersionValidation(t *testing.T) {
	service := New(&fakeStore{})
	name := " "
	track := "frontend"

	_, err := service.Update(context.Background(), queries.UpdateResumeVersionParams{Name: &name})
	if !errors.Is(err, ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}

	_, err = service.Update(context.Background(), queries.UpdateResumeVersionParams{Track: &track})
	if !errors.Is(err, ErrInvalidTrack) {
		t.Fatalf("expected ErrInvalidTrack, got %v", err)
	}
}

type fakeStore struct {
	created queries.CreateResumeVersionParams
	updated queries.UpdateResumeVersionParams
}

func (f *fakeStore) CreateResumeVersion(_ context.Context, arg queries.CreateResumeVersionParams) (queries.ResumeVersion, error) {
	f.created = arg
	return queries.ResumeVersion{Name: arg.Name, Track: arg.Track, Tags: arg.Tags}, nil
}

func (f *fakeStore) ListResumeVersions(context.Context) ([]queries.ResumeVersion, error) {
	return nil, nil
}

func (f *fakeStore) GetResumeVersion(context.Context, string) (queries.ResumeVersion, error) {
	return queries.ResumeVersion{}, nil
}

func (f *fakeStore) UpdateResumeVersion(_ context.Context, arg queries.UpdateResumeVersionParams) (queries.ResumeVersion, error) {
	f.updated = arg
	return queries.ResumeVersion{Tags: arg.Tags}, nil
}

func (f *fakeStore) DeleteResumeVersion(context.Context, string) error {
	return nil
}

func (f *fakeStore) StorePDF(context.Context, string, []byte) error { return nil }
func (f *fakeStore) GetPDF(context.Context, string) ([]byte, error) { return nil, nil }
