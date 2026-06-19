# CareerOS Roadmap

This roadmap reflects the current codebase after the core tracker, reminder
worker, analytics, exports, and AI analysis job flow have landed. Use it as the
forward-looking product plan, not as a record of the original one-week build
plan.

## Current Baseline

Implemented today:

- Go API with Chi, pgx, Goose migrations, structured logging, CORS, request IDs,
  health checks, Swagger UI, and OpenAPI YAML.
- PostgreSQL schema for companies, applications, resume versions, job
  descriptions, contacts, interviews, reminders, audit logs, role tracks,
  application multi-track labels, reminder deliveries, failed reminder jobs, and
  AI analysis jobs.
- Next.js app for dashboard, applications, application detail, create/edit
  application, contacts, resume versions, reminders, and analytics.
- Application status state machine with audit logs.
- Configurable role tracks, plus `application_role_tracks` for multi-track
  applications.
- Resume PDF upload/download.
- Portal account/password fields on applications for local personal tracking.
- Deterministic JD keyword extraction, resume/JD comparison, recommended resume,
  prep context, and template prep brief generation.
- Gemini-backed async AI analysis jobs for resume match, JD extraction, and prep
  brief generation when `GEMINI_API_KEY` is set.
- Redis sorted-set reminder scheduling, worker retries, idempotent delivery
  records, and failed job storage.
- Analytics summary, status counts, role-track counts, resume performance,
  source performance, funnel, upcoming work, and CSV exports.
- k6 benchmark scripts for search, create application, status update, reminder
  create, and mixed workload.
- Demo seed command under `backend/cmd/seed`.

## Near-Term Priorities

### 1. Data Safety And Local-First Polish

- Add a clear settings page or docs warning for sensitive local-only fields such
  as `portal_password`.
- Decide whether portal passwords should be encrypted at rest, hidden entirely,
  or replaced with a password-manager reference field.
- Add backup/export guidance for personal data.
- Add a safer reset story for local databases, including how seed data and real
  data should stay separate.

### 2. Documentation And Demo Readiness

- Add screenshots for dashboard, applications, application detail, reminders,
  analytics, and AI analysis results.
- Record real benchmark runs before making performance claims.
- Add a short demo script that walks through creating an application, adding a
  JD, comparing resumes, updating status, creating a reminder, and viewing
  analytics.
- Keep `backend/internal/httpapi/openapi.yaml` aligned with handler behavior.

### 3. Testing Depth

- Add integration tests for migrations, application status audit transactions,
  search, analytics, and reminder scheduling against PostgreSQL/Redis.
- Add more coverage for `analysis_jobs` retry/failure paths with fake providers.
- Add frontend smoke tests for the main create/edit/detail flows.
- Add a benchmark-results document only after measured local runs.

### 4. Product Workflow

- Add create/edit UI for job descriptions and interview rounds directly on the
  application detail page.
- Add reminder creation from application and contact context.
- Add richer stale-application detection and follow-up suggestions.
- Add search UI if the API remains useful enough to expose in the frontend.
- Improve contact-to-application context so recruiter/referral notes surface on
  prep pages.

## Later Enhancements

- Calendar integration for interviews and reminders.
- Email, Telegram, or desktop notification delivery instead of simulated
  reminder delivery.
- CSV import for historical job-search data.
- Browser extension or bookmarklet to capture jobs from career pages.
- OAuth or single-user passcode if the app is deployed beyond local use.
- Encrypted secret storage for portal credentials.
- OpenTelemetry/Prometheus metrics and worker heartbeat visibility.
- pgvector or another semantic search layer if measured keyword search becomes a
  real limitation.
- Hosted demo with sanitized seed data.

## Resume Claim Rules

Only claim what is implemented and measured.

Safe current claims:

- Built a Go/PostgreSQL job application tracker with normalized application,
  resume, contact, interview, reminder, analytics, and audit-log workflows.
- Implemented a Redis-backed reminder worker with retry handling, idempotency
  keys, failed-job storage, and PostgreSQL as the source of truth.
- Added application status transition rules with transactional audit logging.
- Added deterministic resume/JD matching, prep context generation, analytics,
  CSV exports, and optional Gemini-backed asynchronous analysis jobs.

Claims that still need measured evidence:

- Specific p95 latency numbers.
- Large-scale seed volumes.
- Zero-duplicate delivery guarantees under restart tests.
- Production-readiness, authentication, encryption, or deployed availability.
