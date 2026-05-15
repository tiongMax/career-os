package http

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"careeros/backend/internal/db/queries"
	appsvc "careeros/backend/internal/services/applications"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
)

const testUUID = "00000000-0000-4000-8000-000000000001"

func TestCollectionRoutesAcceptDocumentedPaths(t *testing.T) {
	handler, fakes := newTestHandler()
	router := chi.NewRouter()
	router.Route("/api/v1", func(r chi.Router) {
		r.Post("/companies", handler.createCompany)
		r.Get("/companies", handler.listCompanies)
		r.Route("/companies", func(r chi.Router) {
			r.Post("/", handler.createCompany)
			r.Get("/", handler.listCompanies)
		})
		r.Post("/resume-versions", handler.createResumeVersion)
		r.Get("/resume-versions", handler.listResumeVersions)
		r.Route("/resume-versions", func(r chi.Router) {
			r.Post("/", handler.createResumeVersion)
			r.Get("/", handler.listResumeVersions)
		})
		r.Post("/applications", handler.createApplication)
		r.Get("/applications", handler.listApplications)
		r.Route("/applications", func(r chi.Router) {
			r.Post("/", handler.createApplication)
			r.Get("/", handler.listApplications)
		})
	})

	tests := []struct {
		name   string
		method string
		path   string
		body   string
		want   int
	}{
		{name: "post companies no slash", method: http.MethodPost, path: "/api/v1/companies", body: `{"name":"Stripe"}`, want: http.StatusCreated},
		{name: "get companies no slash", method: http.MethodGet, path: "/api/v1/companies", want: http.StatusOK},
		{name: "post companies slash", method: http.MethodPost, path: "/api/v1/companies/", body: `{"name":"Stripe"}`, want: http.StatusCreated},
		{name: "post resumes no slash", method: http.MethodPost, path: "/api/v1/resume-versions", body: `{"name":"Backend v1","track":"backend"}`, want: http.StatusCreated},
		{name: "get resumes no slash", method: http.MethodGet, path: "/api/v1/resume-versions", want: http.StatusOK},
		{name: "post applications no slash", method: http.MethodPost, path: "/api/v1/applications", body: `{"company_id":"` + testUUID + `","title":"Backend Engineer","role_track":"backend"}`, want: http.StatusCreated},
		{name: "get applications no slash", method: http.MethodGet, path: "/api/v1/applications", want: http.StatusOK},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, bytes.NewBufferString(tt.body))
			rec := httptest.NewRecorder()

			router.ServeHTTP(rec, req)

			if rec.Code != tt.want {
				t.Fatalf("expected status %d, got %d: %s", tt.want, rec.Code, rec.Body.String())
			}
		})
	}

	if fakes.companies.created == 0 {
		t.Fatal("expected company service to receive create calls")
	}
}

func TestUpdateApplicationStatusUsesPathIDAndReturnsConflict(t *testing.T) {
	handler, fakes := newTestHandler()
	fakes.applications.changeStatusErr = appsvc.ErrInvalidTransition

	req := requestWithPathParam(http.MethodPatch, "/applications/"+testUUID+"/status", `{"status":"onsite"}`, "id", testUUID)
	rec := httptest.NewRecorder()

	handler.updateApplicationStatus(rec, req)

	if rec.Code != http.StatusConflict {
		t.Fatalf("expected status %d, got %d: %s", http.StatusConflict, rec.Code, rec.Body.String())
	}
	if fakes.applications.changedStatus.ID != testUUID {
		t.Fatalf("expected path id %q, got %q", testUUID, fakes.applications.changedStatus.ID)
	}
	if fakes.applications.changedStatus.Status != appsvc.StatusOnsite {
		t.Fatalf("expected requested status %q, got %q", appsvc.StatusOnsite, fakes.applications.changedStatus.Status)
	}
}

func TestUpdateResumeVersionDistinguishesEmptyTagsFromMissingTags(t *testing.T) {
	handler, fakes := newTestHandler()

	req := requestWithPathParam(http.MethodPatch, "/resume-versions/"+testUUID, `{"tags":[]}`, "id", testUUID)
	rec := httptest.NewRecorder()

	handler.updateResumeVersion(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}
	if !fakes.resumes.updated.SetTags {
		t.Fatal("expected SetTags to be true for explicit empty tags array")
	}
	if len(fakes.resumes.updated.Tags) != 0 {
		t.Fatalf("expected empty tags, got %v", fakes.resumes.updated.Tags)
	}
}

func TestUpdateJobDescriptionDistinguishesEmptyKeywordsFromMissingKeywords(t *testing.T) {
	handler, fakes := newTestHandler()

	req := requestWithPathParam(http.MethodPatch, "/job-descriptions/"+testUUID, `{"extracted_keywords":[]}`, "id", testUUID)
	rec := httptest.NewRecorder()

	handler.updateJobDescription(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d: %s", http.StatusOK, rec.Code, rec.Body.String())
	}
	if !fakes.jobDescriptions.updated.SetKeywords {
		t.Fatal("expected SetKeywords to be true for explicit empty keywords array")
	}
	if len(fakes.jobDescriptions.updated.ExtractedKeywords) != 0 {
		t.Fatalf("expected empty keywords, got %v", fakes.jobDescriptions.updated.ExtractedKeywords)
	}
}

func TestHandlersRejectInvalidJSONAndInvalidUUID(t *testing.T) {
	handler, _ := newTestHandler()

	t.Run("unknown field rejected", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/companies", bytes.NewBufferString(`{"name":"Stripe","surprise":true}`))
		rec := httptest.NewRecorder()

		handler.createCompany(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
		}
	})

	t.Run("bad path uuid rejected", func(t *testing.T) {
		req := requestWithPathParam(http.MethodGet, "/companies/not-a-uuid", "", "id", "not-a-uuid")
		rec := httptest.NewRecorder()

		handler.getCompany(rec, req)

		if rec.Code != http.StatusBadRequest {
			t.Fatalf("expected status %d, got %d", http.StatusBadRequest, rec.Code)
		}
	})
}

func TestNotFoundMapsTo404(t *testing.T) {
	handler, fakes := newTestHandler()
	fakes.companies.getErr = pgx.ErrNoRows

	req := requestWithPathParam(http.MethodGet, "/companies/"+testUUID, "", "id", testUUID)
	rec := httptest.NewRecorder()

	handler.getCompany(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("expected status %d, got %d", http.StatusNotFound, rec.Code)
	}
}

func requestWithPathParam(method string, target string, body string, key string, value string) *http.Request {
	req := httptest.NewRequest(method, target, bytes.NewBufferString(body))
	routeCtx := chi.NewRouteContext()
	routeCtx.URLParams.Add(key, value)
	return req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, routeCtx))
}

type testFakes struct {
	companies       *fakeCompanyService
	resumes         *fakeResumeService
	applications    *fakeApplicationService
	jobDescriptions *fakeJobDescriptionService
}

func newTestHandler() (Handler, testFakes) {
	fakes := testFakes{
		companies:       &fakeCompanyService{},
		resumes:         &fakeResumeService{},
		applications:    &fakeApplicationService{},
		jobDescriptions: &fakeJobDescriptionService{},
	}
	return NewHandler(fakes.companies, fakes.resumes, fakes.applications, fakes.jobDescriptions), fakes
}

type fakeCompanyService struct {
	created int
	getErr  error
}

func (f *fakeCompanyService) Create(context.Context, queries.CreateCompanyParams) (queries.Company, error) {
	f.created++
	return queries.Company{ID: testUUID, Name: "Stripe"}, nil
}

func (f *fakeCompanyService) List(context.Context) ([]queries.Company, error) {
	return []queries.Company{{ID: testUUID, Name: "Stripe"}}, nil
}

func (f *fakeCompanyService) Get(context.Context, string) (queries.Company, error) {
	if f.getErr != nil {
		return queries.Company{}, f.getErr
	}
	return queries.Company{ID: testUUID, Name: "Stripe"}, nil
}

func (f *fakeCompanyService) Update(context.Context, queries.UpdateCompanyParams) (queries.Company, error) {
	return queries.Company{ID: testUUID, Name: "Stripe"}, nil
}

func (f *fakeCompanyService) Delete(context.Context, string) error {
	return nil
}

type fakeResumeService struct {
	updated queries.UpdateResumeVersionParams
}

func (f *fakeResumeService) Create(context.Context, queries.CreateResumeVersionParams) (queries.ResumeVersion, error) {
	return queries.ResumeVersion{ID: testUUID, Name: "Backend v1", Track: "backend"}, nil
}

func (f *fakeResumeService) List(context.Context) ([]queries.ResumeVersion, error) {
	return []queries.ResumeVersion{{ID: testUUID, Name: "Backend v1", Track: "backend"}}, nil
}

func (f *fakeResumeService) Get(context.Context, string) (queries.ResumeVersion, error) {
	return queries.ResumeVersion{ID: testUUID, Name: "Backend v1", Track: "backend"}, nil
}

func (f *fakeResumeService) Update(_ context.Context, arg queries.UpdateResumeVersionParams) (queries.ResumeVersion, error) {
	f.updated = arg
	return queries.ResumeVersion{ID: arg.ID, Name: "Backend v1", Track: "backend", Tags: arg.Tags}, nil
}

func (f *fakeResumeService) Delete(context.Context, string) error {
	return nil
}

type fakeApplicationService struct {
	changedStatus   appsvc.ChangeStatusParams
	changeStatusErr error
}

func (f *fakeApplicationService) Create(context.Context, queries.CreateApplicationParams) (queries.Application, error) {
	return queries.Application{ID: testUUID, CompanyID: testUUID, Title: "Backend Engineer", RoleTrack: "backend", Status: appsvc.StatusSaved}, nil
}

func (f *fakeApplicationService) List(context.Context) ([]queries.Application, error) {
	return []queries.Application{{ID: testUUID, CompanyID: testUUID, Title: "Backend Engineer", RoleTrack: "backend", Status: appsvc.StatusSaved}}, nil
}

func (f *fakeApplicationService) Get(context.Context, string) (queries.Application, error) {
	return queries.Application{ID: testUUID, CompanyID: testUUID, Title: "Backend Engineer", RoleTrack: "backend", Status: appsvc.StatusSaved}, nil
}

func (f *fakeApplicationService) Update(context.Context, queries.UpdateApplicationParams) (queries.Application, error) {
	return queries.Application{ID: testUUID, CompanyID: testUUID, Title: "Backend Engineer", RoleTrack: "backend", Status: appsvc.StatusSaved}, nil
}

func (f *fakeApplicationService) ChangeStatus(_ context.Context, arg appsvc.ChangeStatusParams) (queries.Application, error) {
	f.changedStatus = arg
	if f.changeStatusErr != nil {
		return queries.Application{}, f.changeStatusErr
	}
	return queries.Application{ID: arg.ID, CompanyID: testUUID, Title: "Backend Engineer", RoleTrack: "backend", Status: arg.Status}, nil
}

func (f *fakeApplicationService) ListAuditLogs(context.Context, string) ([]queries.AuditLog, error) {
	oldValue, _ := json.Marshal(map[string]string{"status": appsvc.StatusSaved})
	newValue, _ := json.Marshal(map[string]string{"status": appsvc.StatusApplied})
	return []queries.AuditLog{{ID: testUUID, EntityType: "application", EntityID: testUUID, Action: "status_changed", OldValue: oldValue, NewValue: newValue}}, nil
}

func (f *fakeApplicationService) Delete(context.Context, string) error {
	return nil
}

type fakeJobDescriptionService struct {
	updated queries.UpdateJobDescriptionParams
}

func (f *fakeJobDescriptionService) Create(context.Context, queries.CreateJobDescriptionParams) (queries.JobDescription, error) {
	return queries.JobDescription{ID: testUUID, ApplicationID: testUUID, RawText: "Go backend role"}, nil
}

func (f *fakeJobDescriptionService) GetByApplication(context.Context, string) (queries.JobDescription, error) {
	return queries.JobDescription{ID: testUUID, ApplicationID: testUUID, RawText: "Go backend role"}, nil
}

func (f *fakeJobDescriptionService) Update(_ context.Context, arg queries.UpdateJobDescriptionParams) (queries.JobDescription, error) {
	f.updated = arg
	return queries.JobDescription{ID: arg.ID, ApplicationID: testUUID, RawText: "Go backend role", ExtractedKeywords: arg.ExtractedKeywords}, nil
}
