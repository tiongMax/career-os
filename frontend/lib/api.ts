const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
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
  source?: string;
  status: string;
  location?: string;
  employment_type?: string;
  job_url?: string;
  applied_at?: string;
  deadline_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
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

// ─── Resume Versions ─────────────────────────────────────────────────────────

export const getResumeVersions = () => apiFetch<ResumeVersion[]>("/resume-versions");
export const getResumeVersion = (id: string) =>
  apiFetch<ResumeVersion>(`/resume-versions/${id}`);
export const createResumeVersion = (body: {
  name: string;
  track: string;
  tags?: string[];
}) => apiFetch<ResumeVersion>("/resume-versions", { method: "POST", body: JSON.stringify(body) });
export const updateResumeVersion = (id: string, body: {
  name?: string;
  track?: string;
  tags?: string[];
}) => apiFetch<ResumeVersion>(`/resume-versions/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const deleteResumeVersion = (id: string) =>
  apiFetch<void>(`/resume-versions/${id}`, { method: "DELETE" });

export const uploadResumePDF = async (id: string, file: File): Promise<void> => {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/resume-versions/${id}/pdf`, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }
};

export const getResumePDFUrl = (id: string) => `${BASE}/resume-versions/${id}/pdf`;

// ─── Applications ────────────────────────────────────────────────────────────

export const getApplications = () => apiFetch<Application[]>("/applications");
export const getApplication = (id: string) =>
  apiFetch<Application>(`/applications/${id}`);
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
