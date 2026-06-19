package resumes

import (
	"context"
	"errors"
	"testing"

	"careeros/backend/internal/persistence/postgres"
)

func TestCreateResumeVersionValidation(t *testing.T) {
	service := New(&fakeStore{})

	_, err := service.Create(context.Background(), postgres.CreateResumeVersionParams{Name: "", Track: "backend"})
	if !errors.Is(err, ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}

	_, err = service.Create(context.Background(), postgres.CreateResumeVersionParams{Name: "Backend v1", Track: "mobile"})
	if !errors.Is(err, ErrInvalidTrack) {
		t.Fatalf("expected ErrInvalidTrack, got %v", err)
	}
}

func TestCreateResumeVersionDefaultsNilTagsToEmptySlice(t *testing.T) {
	store := &fakeStore{}
	service := New(store)

	_, err := service.Create(context.Background(), postgres.CreateResumeVersionParams{Name: "Backend v1", Track: "backend"})
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

	_, err := service.Update(context.Background(), postgres.UpdateResumeVersionParams{Name: &name})
	if !errors.Is(err, ErrNameRequired) {
		t.Fatalf("expected ErrNameRequired, got %v", err)
	}

	_, err = service.Update(context.Background(), postgres.UpdateResumeVersionParams{Track: &track})
	if !errors.Is(err, ErrInvalidTrack) {
		t.Fatalf("expected ErrInvalidTrack, got %v", err)
	}
}

type fakeStore struct {
	created postgres.CreateResumeVersionParams
	updated postgres.UpdateResumeVersionParams
}

func (f *fakeStore) CreateResumeVersion(_ context.Context, arg postgres.CreateResumeVersionParams) (postgres.ResumeVersion, error) {
	f.created = arg
	return postgres.ResumeVersion{Name: arg.Name, Track: arg.Track, Tags: arg.Tags}, nil
}

func (f *fakeStore) ListResumeVersions(context.Context) ([]postgres.ResumeVersion, error) {
	return nil, nil
}

func (f *fakeStore) GetResumeVersion(context.Context, string) (postgres.ResumeVersion, error) {
	return postgres.ResumeVersion{}, nil
}

func (f *fakeStore) UpdateResumeVersion(_ context.Context, arg postgres.UpdateResumeVersionParams) (postgres.ResumeVersion, error) {
	f.updated = arg
	return postgres.ResumeVersion{Tags: arg.Tags}, nil
}

func (f *fakeStore) DeleteResumeVersion(context.Context, string) error {
	return nil
}

func (f *fakeStore) StorePDF(context.Context, string, []byte) error { return nil }
func (f *fakeStore) GetPDF(context.Context, string) ([]byte, error) { return nil, nil }
