const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";
const DEFAULT_TIMEOUT_MS = 5_000;

export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(apiUrl(path), {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`API ${res.status}: ${text}`);
    }
    if (res.status === 204) {
      return undefined as T;
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ResumeVersion {
  id: string;
  name: string;
  track: string;
  content_text?: string;
  has_pdf: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  company_id: string;
  resume_version_id?: string;
  title: string;
  role_track: string;
  role_tracks: string[];
  source?: string;
  status: string;
  location?: string;
  employment_type?: string;
  job_url?: string;
  portal_account?: string;
  portal_password?: string;
  applied_at?: string;
  deadline_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationPage {
  items: Application[];
  total: number;
  limit: number;
  offset: number;
}

export interface JobDescription {
  id: string;
  application_id: string;
  raw_text: string;
  extracted_keywords: string[];
  ai_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  name: string;
  role?: string;
  email?: string;
  linkedin_url?: string;
  relationship?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewRound {
  id: string;
  application_id: string;
  round_type: string;
  scheduled_at?: string;
  interviewer?: string;
  notes?: string;
  outcome?: string;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  application_id: string;
  contact_id?: string;
  title: string;
  description?: string;
  due_at: string;
  status: string;
  idempotency_key: string;
  retry_count: number;
  last_error?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FailedReminderJob {
  id: string;
  reminder_id?: string;
  error_message: string;
  retry_count: number;
  payload: unknown;
  failed_at: string;
}

export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value?: unknown;
  new_value?: unknown;
  created_at: string;
}

export type AnalysisJobType = "resume_match" | "jd_extract" | "prep_brief";
export type AnalysisJobStatus = "queued" | "processing" | "completed" | "failed";

export interface EmbeddingMatch {
  resume_version_id: string;
  resume_version_name: string;
  similarity: number;
}

export interface AnalysisResult {
  summary?: string;
  recommended_resume_id?: string;
  recommended_resume_name?: string;
  match_score?: number;
  matched_skills?: string[];
  missing_skills?: string[];
  extracted_keywords?: string[];
  core_requirements?: string[];
  responsibilities?: string[];
  seniority?: string;
  resume_feedback?: string[];
  interview_focus?: string[];
  prep_plan?: string[];
  talking_points?: string[];
  suggested_questions?: string[];
  embedding_matches?: EmbeddingMatch[];
  generated_at?: string;
}

export interface AnalysisJob {
  id: string;
  application_id: string;
  job_type: AnalysisJobType;
  status: AnalysisJobStatus;
  input_snapshot: unknown;
  result?: AnalysisResult;
  error_message?: string;
  retry_count: number;
  idempotency_key: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// ─── Role Tracks ─────────────────────────────────────────────────────────────

export interface RoleTrack {
  id: string;
  name: string;
  created_at: string;
}

export const getRoleTracks = () => apiFetch<RoleTrack[]>("/tracks");
export const createRoleTrack = (name: string) =>
  apiFetch<RoleTrack>("/tracks", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

// ─── Companies ──────────────────────────────────────────────────────────────

export const getCompanies = () => apiFetch<Company[]>("/companies");
export const getCompany = (id: string) => apiFetch<Company>(`/companies/${id}`);

export interface CreateCompanyPayload {
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  notes?: string;
}

export const createCompany = (payload: CreateCompanyPayload) =>
  apiFetch<Company>("/companies", { method: "POST", body: JSON.stringify(payload) });
export const deleteCompany = (id: string) =>
  apiFetch<void>(`/companies/${id}`, { method: "DELETE" });

// ─── Resume Versions ─────────────────────────────────────────────────────────

export const getResumeVersions = () => apiFetch<ResumeVersion[]>("/resume-versions");
export const getResumeVersion = (id: string) =>
  apiFetch<ResumeVersion>(`/resume-versions/${id}`);
export const createResumeVersion = (body: {
  name: string;
  track: string;
  content_text?: string;
  tags?: string[];
}) => apiFetch<ResumeVersion>("/resume-versions", { method: "POST", body: JSON.stringify(body) });
export const updateResumeVersion = (id: string, body: {
  name?: string;
  track?: string;
  content_text?: string;
  tags?: string[];
}) => apiFetch<ResumeVersion>(`/resume-versions/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteResumeVersion = (id: string) =>
  apiFetch<void>(`/resume-versions/${id}`, { method: "DELETE" });

export const uploadResumePDF = async (id: string, file: File): Promise<void> => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(apiUrl(`/resume-versions/${id}/pdf`), { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
};

export const getResumePDFUrl = (id: string) => apiUrl(`/resume-versions/${id}/pdf`);

// ─── Applications ────────────────────────────────────────────────────────────

export const getApplications = () => apiFetch<Application[]>("/applications");
export const getApplicationsPage = async ({ limit, offset }: { limit: number; offset: number }): Promise<ApplicationPage> => {
  const data = await apiFetch<ApplicationPage | Application[]>(`/applications?limit=${limit}&offset=${offset}`);
  if (Array.isArray(data)) {
    return {
      items: data.slice(offset, offset + limit),
      total: data.length,
      limit,
      offset,
    };
  }
  return {
    items: data.items ?? [],
    total: data.total ?? data.items?.length ?? 0,
    limit: data.limit ?? limit,
    offset: data.offset ?? offset,
  };
};
export const getApplication = (id: string) =>
  apiFetch<Application>(`/applications/${id}`);
export interface CreateApplicationPayload {
  company_id: string;
  resume_version_id?: string;
  title: string;
  role_track: string;
  role_tracks?: string[];
  source?: string;
  status?: string;
  location?: string;
  employment_type?: string;
  job_url?: string;
  portal_account?: string;
  portal_password?: string;
  applied_at?: string;
  deadline_at?: string;
  notes?: string;
}

export const createApplication = (payload: CreateApplicationPayload) =>
  apiFetch<Application>("/applications", { method: "POST", body: JSON.stringify(payload) });
export type UpdateApplicationPayload = Partial<CreateApplicationPayload>;
export const updateApplication = (id: string, payload: UpdateApplicationPayload) =>
  apiFetch<Application>(`/applications/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
export const updateApplicationStatus = (
  id: string,
  status: string,
  dates?: { received_at?: string; completed_at?: string }
) =>
  apiFetch<Application>(`/applications/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, ...dates }),
  });
export const getApplicationAuditLogs = (id: string) =>
  apiFetch<AuditLog[]>(`/applications/${id}/audit-logs`);
export const getApplicationJobDescription = (id: string) =>
  apiFetch<JobDescription>(`/applications/${id}/job-description`);
export const getApplicationInterviews = (id: string) =>
  apiFetch<InterviewRound[]>(`/applications/${id}/interviews`);
export const getRecommendedResume = (applicationId: string) =>
  apiFetch<RecommendedResumeResult>(`/applications/${applicationId}/recommended-resume`);

export interface ResumeMatchResult {
  matched: string[];
  missing: string[];
  score: number;
  compared_keywords: number;
  evidence: Array<{ keyword: string; source: string; weight: number }>;
}

export interface RecommendedResumeResult {
  resume_version: ResumeVersion;
  matched: string[];
  missing: string[];
  score: number;
}

export const extractKeywords = (jdId: string) =>
  apiFetch<JobDescription>(`/job-descriptions/${jdId}/extract-keywords`, { method: "POST" });
export const compareResume = (jdId: string, resumeVersionId: string) =>
  apiFetch<ResumeMatchResult>(`/job-descriptions/${jdId}/compare-resume/${resumeVersionId}`, { method: "POST" });

export interface PrepContext {
  application: Application;
  company: Company;
  job_description?: JobDescription;
  resume?: ResumeVersion;
  interviews: InterviewRound[];
  contacts: Contact[];
  audit_logs: AuditLog[];
}

export interface PrepBrief {
  role_summary: string;
  key_gaps: string[];
  focus_areas: string[];
  talking_points: string[];
  generated_at: string;
}

export const getPrepContext = (applicationId: string) =>
  apiFetch<PrepContext>(`/applications/${applicationId}/prep-context`);
export const generatePrepBrief = (applicationId: string) =>
  apiFetch<PrepBrief>(`/applications/${applicationId}/generate-prep-brief`, { method: "POST" });
export const getApplicationAnalysisJobs = (applicationId: string) =>
  apiFetch<AnalysisJob[]>(`/applications/${applicationId}/ai-analysis-jobs`);
export const createAnalysisJob = (applicationId: string, jobType: AnalysisJobType) =>
  apiFetch<AnalysisJob>(`/applications/${applicationId}/ai-analysis-jobs`, {
    method: "POST",
    body: JSON.stringify({ job_type: jobType }),
  });

// ─── Contacts ────────────────────────────────────────────────────────────────

export const getContacts = () => apiFetch<Contact[]>("/contacts");
export const getContact = (id: string) => apiFetch<Contact>(`/contacts/${id}`);

export interface CreateContactPayload {
  company_id: string;
  name: string;
  role?: string;
  email?: string;
  linkedin_url?: string;
  relationship?: string;
  notes?: string;
}

export const createContact = (payload: CreateContactPayload) =>
  apiFetch<Contact>("/contacts", { method: "POST", body: JSON.stringify(payload) });

export interface UpdateContactPayload {
  company_id?: string;
  name?: string;
  role?: string;
  email?: string;
  linkedin_url?: string;
  relationship?: string;
  notes?: string;
}

export const updateContact = (id: string, payload: UpdateContactPayload) =>
  apiFetch<Contact>(`/contacts/${id}`, { method: "PATCH", body: JSON.stringify(payload) });

// ─── Reminders ───────────────────────────────────────────────────────────────

export const getReminders = () => apiFetch<Reminder[]>("/reminders");
export const getFailedReminders = () => apiFetch<FailedReminderJob[]>("/reminders/failed");
export const retryReminder = (id: string) =>
  apiFetch<Reminder>(`/reminders/${id}/retry`, { method: "POST" });

// ─── Search ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  company?: string;
  rank: number;
}

export const search = (q: string) =>
  apiFetch<{ query: string; results: SearchResult[] }>(`/search?q=${encodeURIComponent(q)}`);

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  total: number;
  active: number;
  responded: number;
  offers: number;
  response_rate: number;
  offer_rate: number;
  pending_reminders: number;
}

export interface StatusCount {
  status: string;
  count: number;
}

export interface TrackCount {
  track: string;
  count: number;
}

export interface ResumeVersionPerformance {
  id: string;
  name: string;
  track: string;
  applications: number;
  responses: number;
  interviews: number;
  offers: number;
  response_rate: number;
  offer_rate: number;
}

export interface SourcePerformance {
  source: string;
  applications: number;
  responses: number;
  offers: number;
  response_rate: number;
}

export interface FunnelStep {
  stage: string;
  count: number;
}

export interface UpcomingInterview {
  id: string;
  round_type: string;
  scheduled_at?: string;
  application_title: string;
  company_name: string;
}

export interface UpcomingReminder {
  id: string;
  title: string;
  due_at: string;
  application_title: string;
}

export interface UpcomingData {
  interviews: UpcomingInterview[];
  reminders: UpcomingReminder[];
}

export const getAnalyticsSummary = () => apiFetch<AnalyticsSummary>("/analytics/summary");
export const getAnalyticsByStatus = () => apiFetch<StatusCount[]>("/analytics/by-status");
export const getAnalyticsByTrack = () => apiFetch<TrackCount[]>("/analytics/by-role-track");
export const getAnalyticsByResumeVersion = () => apiFetch<ResumeVersionPerformance[]>("/analytics/by-resume-version");
export const getAnalyticsSourcePerformance = () => apiFetch<SourcePerformance[]>("/analytics/source-performance");
export const getAnalyticsFunnel = () => apiFetch<FunnelStep[]>("/analytics/funnel");
export const getAnalyticsUpcoming = () => apiFetch<UpcomingData>("/analytics/upcoming");

export type ExportKind = "applications" | "contacts" | "reminders";

export const getExportUrl = (kind: ExportKind) => apiUrl(`/exports/${kind}.csv`);
