# CareerOS Roadmap

This roadmap reflects the current codebase after the core tracker, dashboard
attention rules, analytics, and exports have landed. Use it as the
forward-looking product plan, not as a record of the original one-week build
plan.

## Current Baseline

Implemented today:

- TypeScript API with Fastify, Zod, Drizzle, structured logging, CORS, request
  IDs, health checks, Swagger UI, and generated OpenAPI.
- PostgreSQL schema for companies, applications, resume versions, job
  descriptions, contacts, interviews, reminders, audit logs, role tracks,
  application multi-track labels, reminder deliveries, failed reminder jobs, and
  retained historical analysis jobs.
- Next.js app for dashboard, applications, application detail, create/edit
  application, contacts, resume versions, reminders, and analytics.
- Application status state machine with audit logs.
- Configurable role tracks, plus `application_role_tracks` for multi-track
  applications.
- Resume PDF upload/download.
- Portal account/password fields on applications for local personal tracking.
- Job-description text storage and manual resume selection. Unused keyword
  extraction, matching, preparation generation, and Gemini analysis were removed.
- Dashboard attention rules for due reminders, follow-ups, stale applications,
  deadlines, interviews, and missing resume links.
- Analytics summary, status counts, role-track counts, resume performance,
  source performance, funnel, upcoming work, and CSV exports.
- k6 benchmark scripts for search, create application, status update, reminder
  create, and mixed workload.
- Transactional, idempotent demo seed command under `backend/src/scripts/seed.ts`.

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
  and analytics.
- Record real benchmark runs before making performance claims.
- Add a short demo script that walks through creating an application, adding a
  JD, attaching a resume, updating status, creating a reminder, and viewing
  analytics.
- Keep route-level Zod schemas aligned with handler behavior and generated
  OpenAPI output.

### 3. Testing Depth

- Add integration tests for migrations, application status audit transactions,
  search, analytics, and dashboard attention rules against PostgreSQL.
- Add frontend smoke tests for the main create/edit/detail flows.
- Add a benchmark-results document only after measured local runs.

### 4. Product Workflow

- Add create/edit UI for job descriptions and interview rounds directly on the
  application detail page.
- Add reminder creation from application and contact context.
- Add snooze and handled actions for dashboard attention items.
- Add search UI if the API remains useful enough to expose in the frontend.
- Improve contact-to-application context so recruiter/referral notes surface on
  application pages.

## Later Enhancements

- Calendar integration for interviews and reminders.
- Optional email, Telegram, or desktop notifications if dashboard-only attention
  stops being sufficient.
- CSV import for historical job-search data.
- Browser extension or bookmarklet to capture jobs from career pages.
- OAuth or single-user passcode if the app is deployed beyond local use.
- Encrypted secret storage for portal credentials.
- OpenTelemetry/Prometheus API metrics.
- pgvector or another semantic search layer if measured full-text search becomes a
  real limitation.
- Hosted demo with sanitized seed data.

## Resume Claim Rules

Only claim what is implemented and measured.

Safe current claims:

- Built a Go/PostgreSQL job application tracker with normalized application,
  resume, contact, interview, reminder, analytics, and audit-log workflows.
- Added a dashboard attention queue derived from application state, dates,
  interviews, and manual reminders without a separate scheduling service.
- Added application status transition rules with transactional audit logging.
- Added application analytics and CSV exports.

Claims that still need measured evidence:

- Specific p95 latency numbers.
- Large-scale seed volumes.
- Production-readiness, authentication, encryption, or deployed availability.
