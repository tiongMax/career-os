# CareerOS Detailed PRD

## 1. Product Overview

CareerOS is a backend-focused job application and resume versioning platform for candidates applying across multiple career tracks, including Backend Engineering, AI Engineering, Quant Development, Full Stack Engineering, and Platform Engineering.

The product consolidates job applications, companies, resume versions, job descriptions, recruiter notes, interview rounds, contacts, follow-up reminders, resume-to-JD matching, application analytics, and interview preparation context into one workflow.

CareerOS is intentionally designed as a production-equivalent backend project rather than a generic CRUD dashboard. It demonstrates API design, normalized PostgreSQL modeling, full-text search, Redis-backed asynchronous processing, idempotency, retry handling, audit logs, analytics, observability, benchmarking, and selective AI-assisted workflow features.

## 2. Product Positioning

CareerOS should be positioned as:

> A production-equivalent backend system for managing job applications, resume versions, interview workflows, and follow-up reminders, built with Go, PostgreSQL, Redis, full-text search, asynchronous workers, reliability patterns, analytics, and performance benchmarks.

The project should prove the builder can:

- Design relational data models
- Build clean REST APIs
- Implement status workflows and audit logs
- Handle asynchronous background processing
- Implement search and ranking
- Design idempotent and retry-safe systems
- Measure performance with benchmarks
- Build a useful product, not just a technically flashy demo

## 3. Problem Statement

When applying to many roles, candidates often manage their job search across scattered tools:

- Spreadsheets for application tracking
- Local files for resume versions
- Browser bookmarks for job descriptions
- Calendar apps for interviews
- Notes apps for recruiter/interview notes
- Memory or manual reminders for follow-ups

This creates several problems:

1. It is difficult to remember which resume version was used for which application.
2. Job descriptions and recruiter notes are hard to retrieve before interviews.
3. Follow-ups can be missed.
4. Application performance across resume versions cannot be measured.
5. Interview preparation context is fragmented.
6. Candidates cannot easily identify missing skills or resume gaps for a specific role.
7. Candidates cannot analyze which sources, tracks, or resume variants perform best.

CareerOS solves this by providing one structured backend system for managing the entire application lifecycle.

## 4. Target Users

### Primary User

A fresh CS graduate or software engineer applying to multiple roles across different tracks.

Example tracks:

- Backend Engineer
- AI Engineer / AI Infrastructure Engineer
- Quant Developer
- Full Stack Engineer
- Platform Engineer

### Secondary Users

- Bootcamp graduates applying to many roles
- Students applying for internships
- Engineers managing career transitions
- Candidates working with multiple resume variants
- Candidates applying internationally or across several role categories

## 5. Product Goals

### Functional Goals

CareerOS should allow users to:

1. Track job applications from saved to rejected/offered.
2. Store company, role, and job description data.
3. Upload or register different resume versions.
4. Link each application to the resume version submitted.
5. Track interview rounds and preparation notes.
6. Store recruiter, referral, and company contacts.
7. Create follow-up reminders.
8. Process follow-up reminders asynchronously.
9. Search across applications, job descriptions, companies, notes, contacts, and resume metadata.
10. Analyze application outcomes by role type, source, and resume version.
11. Extract skills from job descriptions.
12. Compare resume versions against job descriptions.
13. Recommend the best-fit resume version for a role.
14. Generate interview preparation context from JD, notes, contacts, and resume gaps.
15. Provide a simple dashboard for demo and daily usage.

### Engineering Goals

The project should demonstrate:

1. Clean REST API design.
2. Normalized PostgreSQL schema design.
3. PostgreSQL full-text search.
4. Optional pgvector semantic retrieval after v1.
5. Redis-backed asynchronous reminder processing.
6. Idempotency and retry handling.
7. Dead-letter recovery for failed jobs.
8. Audit logging for status changes.
9. Dockerized local deployment.
10. API benchmarking with k6.
11. Structured logs and request IDs.
12. Basic metrics endpoint.
13. Production-equivalent README and architecture documentation.
14. Clear tradeoffs between MVP simplicity and future scalability.

## 6. Build Strategy

CareerOS should follow a broad-plus-deep strategy:

- Build many features broad enough to demo.
- Go deep on selected backend areas that create strong interview signal.

### Broad Feature Coverage

Build usable versions of:

- Companies
- Applications
- Resume versions
- Job descriptions
- Contacts
- Interview rounds
- Reminders
- Search
- Analytics
- Resume/JD comparison
- Interview prep briefs
- Dashboard
- Benchmarks

### Deep Backend Areas

Go deep on:

1. PostgreSQL schema, search, ranking, and benchmarks.
2. Redis reminder worker, idempotency, retries, dead-letter jobs, and worker restart tests.
3. Application status workflow, transaction safety, and audit logs.
4. Analytics around application funnel, source performance, and resume performance.

## 7. Non-Goals for Week 1

To keep the project achievable, the first working version will not include:

- Complex OAuth login
- Payment or billing
- Team collaboration
- Enterprise permissions
- Browser extension
- Native mobile app
- Complex AI resume rewriting
- Production email sending
- Full calendar synchronization
- Heavy frontend polish
- Complex deployment infrastructure

These can be future extensions.

## 8. MVP Scope

The MVP should be fully usable by one user.

### Must Have

1. Single-user mode or simplified authentication.
2. Company management.
3. Application management.
4. Resume version management.
5. Job description storage.
6. Application status workflow.
7. Audit log on status change.
8. Interview round tracking.
9. Contact tracking.
10. Follow-up reminders.
11. Redis-backed reminder worker.
12. Retry handling and idempotency keys.
13. Failed job or dead-letter table.
14. PostgreSQL full-text search.
15. JD keyword extraction.
16. Resume-to-JD keyword comparison.
17. Analytics summary endpoint.
18. Docker Compose setup.
19. Seed data script.
20. k6 benchmark scripts.
21. README with setup, architecture, metrics, API examples, and roadmap.

### Should Have

1. Simple web dashboard.
2. Application detail page.
3. Search page.
4. Reminder list.
5. Analytics cards.
6. Structured logs.
7. Request ID middleware.
8. Swagger/OpenAPI documentation.
9. CSV export.
10. Basic prep context endpoint.

### Nice to Have

1. pgvector semantic retrieval.
2. LLM-powered JD summarization.
3. AI-generated interview prep briefs.
4. Email or Telegram notification integration.
5. CSV import.
6. Prometheus metrics endpoint.
7. Grafana dashboard.
8. Calendar integration.
9. Browser extension.
10. Deployed demo.

## 9. Recommended Tech Stack

### Backend

Recommended stack:

- Go
- Chi or Gin for HTTP routing
- pgx for PostgreSQL access
- sqlc for type-safe SQL generation
- Goose or Atlas for migrations
- Redis for reminder scheduling and processing
- Zerolog or Zap for structured logging
- k6 for load testing

### Database

- PostgreSQL
- PostgreSQL full-text search
- Optional pg_trgm for fuzzy search
- Optional pgvector for semantic search

### Queue / Cache

- Redis
- Sorted sets for scheduled reminders
- Optional Redis Streams for advanced worker processing

### Frontend

Recommended for speed:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

### DevOps / Tooling

- Docker Compose
- Makefile
- OpenAPI / Swagger
- k6
- GitHub Actions optional

## 10. High-Level Architecture

```text
+-------------------+
|   Web Dashboard   |
| Next.js / React   |
+---------+---------+
          |
          | REST API
          v
+-------------------+          +-------------------+
|   API Service     |--------->|   PostgreSQL      |
| Go / Chi or Gin   |          | relational data   |
+---------+---------+          | full-text search  |
          |                    | analytics         |
          |                    +-------------------+
          |
          | enqueue reminders
          v
+-------------------+          +-------------------+
|      Redis        |<-------->| Reminder Worker   |
| schedule + queue  |          | Go background svc |
+-------------------+          +-------------------+
          |
          v
+-------------------+
| Logs / Metrics    |
| k6 / Prometheus   |
+-------------------+
```

## 11. Core Domain Model

### User

For MVP, single-user mode is acceptable.

Fields:

- id
- email
- name
- created_at
- updated_at

### Company

Fields:

- id
- name
- website
- industry
- location
- notes
- created_at
- updated_at

### ResumeVersion

Fields:

- id
- name
- track
- file_path
- content_text
- tags
- created_at
- updated_at

Tracks:

- backend
- ai
- quant
- general

### Application

Fields:

- id
- company_id
- resume_version_id
- title
- role_track
- source
- status
- location
- employment_type
- job_url
- applied_at
- deadline_at
- notes
- created_at
- updated_at

Statuses:

- saved
- applied
- recruiter_screen
- technical_screen
- onsite
- offer
- rejected
- withdrawn

### JobDescription

Fields:

- id
- application_id
- raw_text
- extracted_keywords
- search_vector
- ai_summary optional
- created_at
- updated_at

### InterviewRound

Fields:

- id
- application_id
- round_type
- scheduled_at
- interviewer
- notes
- outcome
- created_at
- updated_at

Round types:

- recruiter
- online_assessment
- technical
- system_design
- behavioral
- final

### Contact

Fields:

- id
- company_id
- name
- role
- email
- linkedin_url
- relationship
- notes
- created_at
- updated_at

### Reminder

Fields:

- id
- application_id
- contact_id nullable
- title
- description
- due_at
- status
- idempotency_key
- retry_count
- last_error
- delivered_at
- created_at
- updated_at

Statuses:

- pending
- processing
- sent
- failed
- cancelled

### ReminderDelivery

Purpose:

Prevents duplicate reminder delivery.

Fields:

- id
- reminder_id
- idempotency_key unique
- delivered_at
- created_at

### FailedReminderJob

Purpose:

Stores poison jobs or reminders that exceed retry limits.

Fields:

- id
- reminder_id
- error_message
- retry_count
- payload
- failed_at

### AuditLog

Fields:

- id
- entity_type
- entity_id
- action
- old_value
- new_value
- created_at

Example:

Application status changed from `applied` to `technical_screen`.

## 12. Application Status Workflow

Allowed transitions:

```text
saved -> applied
saved -> withdrawn

applied -> recruiter_screen
applied -> technical_screen
applied -> rejected
applied -> withdrawn

recruiter_screen -> technical_screen
recruiter_screen -> rejected
recruiter_screen -> withdrawn

technical_screen -> onsite
technical_screen -> rejected
technical_screen -> withdrawn

onsite -> offer
onsite -> rejected
onsite -> withdrawn

offer -> withdrawn
offer -> rejected

rejected -> terminal
withdrawn -> terminal
```

Status update behavior:

1. Load current application.
2. Validate transition.
3. Begin PostgreSQL transaction.
4. Update application status.
5. Insert audit log.
6. Commit transaction.
7. Return updated application.

This demonstrates domain modeling and transaction safety.

## 13. API Design

Base URL:

```text
/api/v1
```

### Health

```http
GET /health
```

### Companies

```http
POST /companies
GET /companies
GET /companies/{id}
PATCH /companies/{id}
DELETE /companies/{id}
```

### Resume Versions

```http
POST /resume-versions
GET /resume-versions
GET /resume-versions/{id}
PATCH /resume-versions/{id}
DELETE /resume-versions/{id}
```

### Applications

```http
POST /applications
GET /applications
GET /applications/{id}
PATCH /applications/{id}
DELETE /applications/{id}
PATCH /applications/{id}/status
GET /applications/{id}/audit-logs
GET /applications/{id}/prep-context
POST /applications/{id}/generate-prep-brief
GET /applications/{id}/recommended-resume
```

### Job Descriptions

```http
POST /applications/{id}/job-description
GET /applications/{id}/job-description
PATCH /job-descriptions/{id}
POST /job-descriptions/{id}/extract-keywords
POST /job-descriptions/{id}/compare-resume/{resumeVersionId}
```

### Interviews

```http
POST /applications/{id}/interviews
GET /applications/{id}/interviews
PATCH /interviews/{id}
DELETE /interviews/{id}
```

### Contacts

```http
POST /contacts
GET /contacts
GET /contacts/{id}
PATCH /contacts/{id}
DELETE /contacts/{id}
```

### Reminders

```http
POST /reminders
GET /reminders
GET /reminders/due
PATCH /reminders/{id}
DELETE /reminders/{id}
POST /reminders/{id}/cancel
GET /reminders/failed
POST /reminders/{id}/retry
```

### Search

```http
GET /search?q=postgres redis backend
```

### Analytics

```http
GET /analytics/summary
GET /analytics/by-status
GET /analytics/by-role-track
GET /analytics/by-resume-version
GET /analytics/source-performance
GET /analytics/funnel
GET /analytics/upcoming
```

## 14. Search Design

Use PostgreSQL full-text search for MVP.

Search should cover:

- company name
- application title
- job description text
- application notes
- contact notes
- resume version names
- resume tags

Weighted search:

```text
Application title: A
Company name: A
Resume version name/tags: B
Job description: B
Notes: C
```

Example response:

```json
{
  "query": "postgres redis backend",
  "results": [
    {
      "type": "application",
      "id": "uuid",
      "title": "Backend Engineer Intern",
      "company": "Stripe",
      "rank": 0.94
    }
  ]
}
```

Advanced search features:

- pg_trgm fuzzy search
- highlighted snippets with ts_headline
- filters by status, role_track, company, and date
- saved searches
- pgvector semantic retrieval

## 15. JD Keyword Extraction Design

For v1, use deterministic extraction with a skill dictionary.

Example skill dictionary:

```json
[
  "go",
  "java",
  "python",
  "typescript",
  "postgresql",
  "mysql",
  "redis",
  "kafka",
  "docker",
  "kubernetes",
  "aws",
  "gcp",
  "grpc",
  "rest",
  "microservices",
  "distributed systems",
  "system design",
  "ci/cd",
  "linux",
  "prometheus",
  "grafana",
  "machine learning",
  "pytorch",
  "tensorflow",
  "llm",
  "rag",
  "vector database",
  "quant",
  "c++",
  "low latency"
]
```

Extraction logic:

1. Lowercase JD text.
2. Normalize punctuation.
3. Match known skills from dictionary.
4. Store extracted keywords.
5. Compare with resume tags and resume text.

## 16. Resume-to-JD Matching Design

Endpoint:

```http
POST /job-descriptions/{id}/compare-resume/{resumeVersionId}
```

Response:

```json
{
  "matched_keywords": ["go", "postgresql", "redis"],
  "missing_keywords": ["docker", "kubernetes"],
  "match_score": 0.6
}
```

Scoring:

```text
match_score = matched_keywords / total_extracted_keywords
```

Advanced scoring:

```text
required_match_score = matched_required / total_required
preferred_match_score = matched_preferred / total_preferred
final_score = required_match_score * 0.75 + preferred_match_score * 0.25
```

Best resume recommendation:

```http
GET /applications/{id}/recommended-resume
```

This compares all resume versions against the job description and recommends the highest-scoring one.

## 17. Reminder Worker Design

### Redis Data Structure

Use a Redis sorted set:

```text
reminders:scheduled
```

- member: reminder ID
- score: Unix timestamp of due_at

### Worker Flow

1. Poll Redis sorted set for reminders with score <= now.
2. Remove due reminder from Redis.
3. Load reminder from PostgreSQL.
4. Check reminder status.
5. Mark reminder as processing.
6. Insert into reminder_deliveries with unique idempotency_key.
7. Simulate notification delivery.
8. Mark reminder as sent.
9. Set delivered_at timestamp.
10. On failure, increment retry_count.
11. If retry_count exceeds limit, mark failed and insert failed_reminder_jobs.

### Failure Handling

The worker must handle:

- Worker restart
- Redis unavailable
- PostgreSQL unavailable
- Duplicate processing
- Notification failure
- Poison jobs

### Reliability Features

- PostgreSQL remains source of truth.
- Redis coordinates scheduling only.
- Unique idempotency keys prevent duplicate delivery.
- Retry count limits repeated failures.
- Failed jobs are preserved for inspection.
- Worker restart tests validate duplicate prevention.

## 18. Analytics Design

Analytics endpoints should include:

### Summary

- total applications
- active applications
- interviews scheduled
- pending follow-ups
- response rate
- offer rate

### By Status

Counts by:

- saved
- applied
- recruiter_screen
- technical_screen
- onsite
- offer
- rejected
- withdrawn

### By Role Track

Counts by:

- backend
- ai
- quant
- general

### By Resume Version

Metrics:

- applications
- responses
- interviews
- offers
- response rate
- offer rate

### Source Performance

Compare:

- LinkedIn
- referral
- company site
- recruiter
- cold email
- campus portal

### Funnel

Track conversion through:

```text
saved -> applied -> recruiter_screen -> technical_screen -> onsite -> offer
```

### Upcoming

Return:

- upcoming interviews
- pending follow-ups
- stale applications

## 19. Interview Prep Brief Design

Endpoint:

```http
POST /applications/{id}/generate-prep-brief
```

Input sources:

- job description
- extracted keywords
- missing resume keywords
- resume version used
- recruiter notes
- interview rounds
- contacts
- application notes

Response:

```json
{
  "brief": {
    "role_summary": "Backend role focused on Go, PostgreSQL, Redis, and distributed systems.",
    "resume_alignment": "Your Backend Resume v2 matches 7 of 10 extracted JD keywords.",
    "gaps": ["kubernetes", "grpc"],
    "focus_areas": [
      "Review Redis caching strategies",
      "Prepare PostgreSQL indexing examples",
      "Prepare system design discussion around reminder workers"
    ],
    "talking_points": [
      "Discuss CareerOS reminder worker design",
      "Discuss PostgreSQL full-text search tradeoffs"
    ]
  }
}
```

For v1, this can be template-based. If an LLM is used later, it can become AI-generated.

## 20. Observability

### Logs

Use structured JSON logs.

Log events:

- api_request
- application_created
- application_status_changed
- reminder_created
- reminder_processed
- reminder_failed
- search_performed
- benchmark_started
- benchmark_completed

Example:

```json
{
  "level": "info",
  "event": "reminder_processed",
  "reminder_id": "uuid",
  "application_id": "uuid",
  "retry_count": 0,
  "duration_ms": 42
}
```

### Metrics

MVP metrics:

- API request count
- API latency
- search latency
- reminder processed count
- reminder failed count
- reminder retry count

Optional endpoint:

```http
GET /metrics
```

## 21. Performance Benchmarks

Use k6 to test core APIs.

Benchmark scripts:

- search.js
- create-application.js
- status-update.js
- reminder-create.js
- mixed-workload.js

Benchmark targets for local seeded data:

| Area | Target |
|---|---|
| Search latency | p95 < 100ms over 10,000 seeded records |
| Application creation | p95 < 150ms |
| Status update | p95 < 100ms |
| Reminder creation | p95 < 150ms |
| Worker reliability | 10,000 reminders processed with zero duplicate sends in restart test |

Use only measured results in the README and resume.

## 22. Seed Data Strategy

Seed realistic data for benchmarking and demo.

Target seed:

- 100 companies
- 10 resume versions
- 10,000 applications
- 10,000 job descriptions
- 20,000 reminders
- 5,000 contacts
- 3,000 interview rounds

Tracks:

- backend
- ai
- quant
- general

Statuses:

- saved
- applied
- recruiter_screen
- technical_screen
- onsite
- offer
- rejected
- withdrawn

## 23. Frontend MVP

The frontend should be simple because backend quality matters more.

Pages:

1. Dashboard
2. Applications list
3. Application detail
4. Create application
5. Resume versions
6. Search
7. Reminders
8. Analytics

Dashboard cards:

- Total applications
- Active applications
- Upcoming interviews
- Pending follow-ups
- Response rate
- Best-performing resume version

Application detail should show:

- Company
- Role title
- Status
- Resume version used
- Job description
- Extracted keywords
- Resume match score
- Interview rounds
- Contacts
- Reminders
- Audit log
- Prep brief

## 24. Security and Data Integrity

For MVP:

- Single-user mode is acceptable.
- Use environment variables for configuration.
- Validate request bodies.
- Use prepared statements or sqlc-generated queries.
- Add database constraints.
- Use UUID primary keys.
- Avoid storing secrets in Git.

Important integrity rules:

- Applications must belong to a company.
- Resume versions can be detached without deleting applications.
- Status updates must create audit logs.
- Reminder idempotency keys must be unique.
- Failed reminders must not be silently deleted.
- PostgreSQL remains source of truth for reminder state.

## 25. Testing Plan

### Unit Tests

Test:

- status transition validation
- keyword extraction
- resume/JD comparison
- reminder idempotency logic
- search query parsing
- analytics calculations

### Integration Tests

Test:

- create application workflow
- update application status and audit log creation
- create reminder and worker processing
- search over seeded job descriptions
- analytics summary correctness

### Failure Tests

Test:

- worker restart during reminder processing
- duplicate reminder processing attempt
- failed reminder retry
- exceeded retry limit
- failed job insertion

## 26. Suggested Repository Structure

```text
careeros/
  backend/
    cmd/
      api/
        main.go
      worker/
        main.go
      seed/
        main.go
    internal/
      config/
      db/
      http/
        handlers/
        middleware/
        routes/
      services/
        applications/
        companies/
        resumes/
        reminders/
        search/
        analytics/
        matching/
      workers/
      logger/
    migrations/
    queries/
    sqlc.yaml
    Dockerfile
  frontend/
    app/
    components/
    lib/
    package.json
  benchmarks/
    k6/
      create-application.js
      search.js
      status-update.js
      reminder-create.js
      mixed-workload.js
  docs/
    architecture.md
    api.md
    search-design.md
    development/reminder-worker.md
    benchmark-results.md
    future-roadmap.md
  docker-compose.yml
  Makefile
  README.md
```

## 27. Makefile Commands

```makefile
up:
	docker compose up --build

down:
	docker compose down

migrate:
	go run ./backend/cmd/migrate

seed:
	go run ./backend/cmd/seed

api:
	go run ./backend/cmd/api

worker:
	go run ./backend/cmd/worker

test:
	go test ./...

bench-search:
	k6 run benchmarks/k6/search.js

bench-mixed:
	k6 run benchmarks/k6/mixed-workload.js
```

## 28. Environment Variables

```env
APP_ENV=development
API_PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/careeros?sslmode=disable
REDIS_URL=redis://localhost:6379
REMINDER_WORKER_POLL_INTERVAL_MS=1000
REMINDER_MAX_RETRIES=3
LOG_LEVEL=info
```

## 29. README Requirements

The final README should include:

1. Project title
2. One-line product description
3. Why it was built
4. Key features
5. Architecture diagram
6. Tech stack
7. Data model overview
8. API examples
9. Reminder worker design
10. Search design
11. Resume/JD matching design
12. Analytics design
13. Metrics and benchmarks
14. Setup instructions
15. Screenshots
16. Future improvements
17. Resume bullets

## 30. Resume Bullet Strategy

Use only claims that are implemented and measured.

### Safe Week 1 Bullets

```text
Built CareerOS, a Go/PostgreSQL job application platform that consolidates resume versions, job descriptions, recruiter notes, interview rounds, contacts, follow-up reminders, and analytics across backend, AI, quant, and general applications.

Implemented a resume-to-JD matching engine using PostgreSQL full-text search, structured skill extraction, and weighted keyword scoring to identify matched skills, missing keywords, and best-fit resume variants for each role.

Designed a Redis-backed reminder worker with retry handling, idempotency keys, and dead-letter recovery, validating scheduled follow-up processing under worker-restart and duplicate-processing scenarios.

Added analytics endpoints and interview prep brief generation for application funnel tracking, response rate by resume version, source effectiveness, upcoming interviews, pending follow-ups, and role-specific preparation context.
```

### Upgrade After Benchmarks

```text
Benchmarked PostgreSQL full-text search across 10,000 seeded applications and job descriptions with k6, achieving p95 latency of X ms.

Processed 10,000 scheduled reminders with zero duplicate sends during worker-restart tests using idempotent delivery records and retry-safe state transitions.
```

### Upgrade After Real AI / pgvector

```text
Implemented an AI-powered JD analysis pipeline using embeddings and structured skill extraction to identify required skills, missing resume keywords, and role-fit gaps across backend, AI, quant, and general applications.

Designed a resume-to-JD matching engine with PostgreSQL full-text search, pgvector semantic retrieval, and weighted keyword scoring to rank resume versions against job descriptions and recommend the best-fit variant for each role.
```

## 31. Future Extensions

After the 1-week v1, possible improvements include:

1. Browser extension to save jobs from LinkedIn or company career pages.
2. Calendar integration for interviews.
3. Email notification delivery.
4. Resume upload and parsing.
5. LLM-based JD analysis.
6. Automatic resume tailoring suggestions.
7. Multi-user support.
8. OAuth login.
9. Deployment to Fly.io, Render, Railway, or AWS.
10. Prometheus + Grafana dashboard.
11. OpenTelemetry tracing.
12. Webhook integration.
13. CSV import/export.
14. Company contact graph.
15. Interview question tracker.
16. pgvector semantic search.
17. Redis Streams worker implementation.
18. Worker heartbeat dashboard.

## 32. Project Success Criteria

The project is considered successful if:

1. It can be run locally with Docker Compose.
2. It has a working API service and reminder worker.
3. It persists normalized data in PostgreSQL.
4. It supports creating and tracking real job applications.
5. It links applications to resume versions.
6. It stores and searches job descriptions.
7. It supports full-text search over job descriptions and notes.
8. It processes reminders asynchronously with retries and idempotency.
9. It exposes analytics endpoints.
10. It supports resume/JD matching.
11. It includes benchmark scripts and honest results.
12. It has a polished README and architecture diagram.
13. It produces 2-4 strong backend resume bullets.
