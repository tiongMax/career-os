package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

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
		collection(r, "/companies", handler.createCompany, handler.listCompanies, func(r chi.Router) {})
		collection(r, "/resume-versions", handler.createResumeVersion, handler.listResumeVersions, func(r chi.Router) {})
		collection(r, "/applications", handler.createApplication, handler.listApplications, func(r chi.Router) {
			r.Post("/{id}/interviews", handler.createInterview)
			r.Get("/{id}/interviews", handler.listApplicationInterviews)
		})
		collection(r, "/contacts", handler.createContact, handler.listContacts, func(r chi.Router) {})
		collection(r, "/reminders", handler.createReminder, handler.listReminders, func(r chi.Router) {})
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
		{name: "post contacts no slash", method: http.MethodPost, path: "/api/v1/contacts", body: `{"company_id":"` + testUUID + `","name":"Ada Lovelace"}`, want: http.StatusCreated},
		{name: "get contacts no slash", method: http.MethodGet, path: "/api/v1/contacts", want: http.StatusOK},
		{name: "post interviews under application", method: http.MethodPost, path: "/api/v1/applications/" + testUUID + "/interviews", body: `{"round_type":"technical"}`, want: http.StatusCreated},
		{name: "get interviews under application", method: http.MethodGet, path: "/api/v1/applications/" + testUUID + "/interviews", want: http.StatusOK},
		{name: "post reminders no slash", method: http.MethodPost, path: "/api/v1/reminders", body: `{"application_id":"` + testUUID + `","title":"Follow up","due_at":"2026-05-16T10:00:00Z"}`, want: http.StatusCreated},
		{name: "get reminders no slash", method: http.MethodGet, path: "/api/v1/reminders", want: http.StatusOK},
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
	contacts        *fakeContactService
	interviews      *fakeInterviewService
	reminders       *fakeReminderService
}

func newTestHandler() (Handler, testFakes) {
	fakes := testFakes{
		companies:       &fakeCompanyService{},
		resumes:         &fakeResumeService{},
		applications:    &fakeApplicationService{},
		jobDescriptions: &fakeJobDescriptionService{},
		contacts:        &fakeContactService{},
		interviews:      &fakeInterviewService{},
		reminders:       &fakeReminderService{},
	}
	return NewHandler(Services{
		Companies:       fakes.companies,
		Resumes:         fakes.resumes,
		Applications:    fakes.applications,
		JobDescriptions: fakes.jobDescriptions,
		Contacts:        fakes.contacts,
		Interviews:      fakes.interviews,
		Reminders:       fakes.reminders,
	}), fakes
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

func (f *fakeResumeService) StorePDF(context.Context, string, []byte) error { return nil }
func (f *fakeResumeService) GetPDF(context.Context, string) ([]byte, error) { return nil, nil }

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

func (f *fakeJobDescriptionService) ExtractKeywords(context.Context, string) (queries.JobDescription, error) {
	return queries.JobDescription{ID: testUUID, ApplicationID: testUUID, RawText: "Go backend role"}, nil
}
func (f *fakeJobDescriptionService) CompareResume(context.Context, string, string) (queries.ResumeMatchResult, error) {
	return queries.ResumeMatchResult{}, nil
}
func (f *fakeJobDescriptionService) RecommendedResume(context.Context, string) (queries.RecommendedResumeResult, error) {
	return queries.RecommendedResumeResult{}, nil
}
func (f *fakeJobDescriptionService) PrepContext(context.Context, string) (queries.PrepContext, error) {
	return queries.PrepContext{}, nil
}
func (f *fakeJobDescriptionService) GeneratePrepBrief(context.Context, string) (queries.PrepBrief, error) {
	return queries.PrepBrief{}, nil
}

type fakeContactService struct {
	updated queries.UpdateContactParams
}

func (f *fakeContactService) Create(_ context.Context, arg queries.CreateContactParams) (queries.Contact, error) {
	return queries.Contact{ID: testUUID, CompanyID: arg.CompanyID, Name: arg.Name}, nil
}

func (f *fakeContactService) List(context.Context) ([]queries.Contact, error) {
	return []queries.Contact{{ID: testUUID, CompanyID: testUUID, Name: "Ada Lovelace"}}, nil
}

func (f *fakeContactService) Get(context.Context, string) (queries.Contact, error) {
	return queries.Contact{ID: testUUID, CompanyID: testUUID, Name: "Ada Lovelace"}, nil
}

func (f *fakeContactService) Update(_ context.Context, arg queries.UpdateContactParams) (queries.Contact, error) {
	f.updated = arg
	name := "Ada Lovelace"
	if arg.Name != nil {
		name = *arg.Name
	}
	return queries.Contact{ID: arg.ID, CompanyID: testUUID, Name: name}, nil
}

func (f *fakeContactService) Delete(context.Context, string) error {
	return nil
}

type fakeInterviewService struct {
	created queries.CreateInterviewRoundParams
	updated queries.UpdateInterviewRoundParams
}

func (f *fakeInterviewService) Create(_ context.Context, arg queries.CreateInterviewRoundParams) (queries.InterviewRound, error) {
	f.created = arg
	return queries.InterviewRound{ID: testUUID, ApplicationID: arg.ApplicationID, RoundType: arg.RoundType}, nil
}

func (f *fakeInterviewService) ListByApplication(_ context.Context, applicationID string) ([]queries.InterviewRound, error) {
	return []queries.InterviewRound{{ID: testUUID, ApplicationID: applicationID, RoundType: "technical"}}, nil
}

func (f *fakeInterviewService) Update(_ context.Context, arg queries.UpdateInterviewRoundParams) (queries.InterviewRound, error) {
	f.updated = arg
	roundType := "technical"
	if arg.RoundType != nil {
		roundType = *arg.RoundType
	}
	return queries.InterviewRound{ID: arg.ID, ApplicationID: testUUID, RoundType: roundType}, nil
}

func (f *fakeInterviewService) Delete(context.Context, string) error {
	return nil
}

type fakeReminderService struct {
	updated queries.UpdateReminderParams
}

func (f *fakeReminderService) Create(_ context.Context, arg queries.CreateReminderParams) (queries.Reminder, error) {
	return queries.Reminder{ID: testUUID, ApplicationID: arg.ApplicationID, Title: arg.Title, DueAt: arg.DueAt, Status: "pending"}, nil
}

func (f *fakeReminderService) List(context.Context) ([]queries.Reminder, error) {
	return []queries.Reminder{{ID: testUUID, ApplicationID: testUUID, Title: "Follow up", DueAt: time.Now(), Status: "pending"}}, nil
}

func (f *fakeReminderService) ListDue(context.Context) ([]queries.Reminder, error) {
	return []queries.Reminder{{ID: testUUID, ApplicationID: testUUID, Title: "Follow up", DueAt: time.Now(), Status: "pending"}}, nil
}

func (f *fakeReminderService) Get(context.Context, string) (queries.Reminder, error) {
	return queries.Reminder{ID: testUUID, ApplicationID: testUUID, Title: "Follow up", DueAt: time.Now(), Status: "pending"}, nil
}

func (f *fakeReminderService) Update(_ context.Context, arg queries.UpdateReminderParams) (queries.Reminder, error) {
	f.updated = arg
	title := "Follow up"
	if arg.Title != nil {
		title = *arg.Title
	}
	return queries.Reminder{ID: arg.ID, ApplicationID: testUUID, Title: title, DueAt: time.Now(), Status: "pending"}, nil
}

func (f *fakeReminderService) Cancel(context.Context, string) (queries.Reminder, error) {
	return queries.Reminder{ID: testUUID, ApplicationID: testUUID, Title: "Follow up", DueAt: time.Now(), Status: "cancelled"}, nil
}

func (f *fakeReminderService) Retry(context.Context, string) (queries.Reminder, error) {
	return queries.Reminder{ID: testUUID, ApplicationID: testUUID, Title: "Follow up", DueAt: time.Now(), Status: "pending"}, nil
}

func (f *fakeReminderService) ListFailed(context.Context) ([]queries.FailedReminderJob, error) {
	return nil, nil
}

func (f *fakeReminderService) Delete(context.Context, string) error {
	return nil
}
