# CareerOS 1-Week Roadmap

## Strategy

The strategy is broad-plus-deep:

> Build everything broad enough to demo, but go deep on selected backend features that support strong resume bullets and interview discussion.

CareerOS should not be a shallow feature dump. It should have broad product coverage, but the strongest technical depth should be in:

1. PostgreSQL schema, full-text search, ranking, and benchmarks.
2. Redis-backed reminder worker with idempotency, retries, and dead-letter recovery.
3. Application status workflow, audit logs, and transaction safety.
4. Analytics around application funnel, resume performance, and source performance.

## End-of-Week Target

By the end of the week, the project should include:

### Working Local App

- Go backend
- PostgreSQL
- Redis
- Docker Compose
- Simple Next.js dashboard

### Core Product

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
- Basic JD analysis
- Interview prep brief

### Deep Backend Features

- Application status state machine
- Audit logs
- PostgreSQL full-text search
- Redis reminder worker
- Idempotency keys
- Retry handling
- Dead-letter failed jobs
- Seed data
- k6 benchmarks

### Portfolio Polish

- README
- Architecture diagram
- API examples
- Screenshots
- Benchmark notes
- Resume bullets

---

# Day 1 — Foundation + Core Data Model

## Goal

Get the backend running with PostgreSQL, Redis, migrations, and the core schema.

## Build

### 1. Repository scaffold

```text
careeros/
  backend/
    cmd/
      api/
      worker/
      seed/
    internal/
      config/
      db/
      http/
      services/
      workers/
      logger/
    migrations/
    queries/
    sqlc.yaml
  frontend/
  benchmarks/
  docs/
  docker-compose.yml
  Makefile
  README.md
```

### 2. Docker Compose

Services:

- api
- worker
- postgres
- redis
- frontend optional

### 3. Environment config

```env
APP_ENV=development
API_PORT=8080
DATABASE_URL=postgres://postgres:postgres@postgres:5432/careeros?sslmode=disable
REDIS_URL=redis://redis:6379
REMINDER_WORKER_POLL_INTERVAL_MS=1000
REMINDER_MAX_RETRIES=3
LOG_LEVEL=info
```

### 4. Database migrations

Create tables:

- companies
- resume_versions
- applications
- job_descriptions
- contacts
- interview_rounds
- reminders
- audit_logs
- reminder_deliveries
- failed_reminder_jobs

### 5. Important indexes

Add indexes for:

- applications.status
- applications.role_track
- applications.company_id
- applications.resume_version_id
- reminders.status
- reminders.due_at
- job_descriptions full-text search
- applications full-text search

### 6. Health endpoint

```http
GET /api/v1/health
```

Response:

```json
{
  "status": "ok",
  "postgres": "ok",
  "redis": "ok"
}
```

## Go Deep Today

Focus on schema quality.

Make sure:

- foreign keys are correct
- status checks exist
- role_track checks exist
- timestamps exist
- UUIDs are used
- reminder idempotency key is unique
- audit logs use JSONB old_value/new_value
- failed jobs are preserved instead of deleted

## Definition of Done

- `docker compose up` works
- API starts
- PostgreSQL is reachable
- Redis is reachable
- migrations run
- health endpoint works

## AI Coding Prompt

```text
Generate a Go backend scaffold for CareerOS using Chi, pgx, sqlc, Goose migrations, PostgreSQL, Redis, Docker Compose, Zerolog, and a Makefile.

Create cmd/api, cmd/worker, cmd/seed, internal/config, internal/db, internal/httpapi, internal/services, internal/workers, internal/logger.

Add docker-compose.yml, .env.example, health endpoint, and initial Goose migrations for companies, resume_versions, applications, job_descriptions, contacts, interview_rounds, reminders, audit_logs, reminder_deliveries, and failed_reminder_jobs.
```

---

# Day 2 — Core APIs + Application Workflow

## Goal

Implement the core product workflow: create applications, attach resume versions, store job descriptions, update statuses, and audit changes.

## Build APIs

### Companies

```http
POST   /api/v1/companies
GET    /api/v1/companies
GET    /api/v1/companies/{id}
PATCH  /api/v1/companies/{id}
DELETE /api/v1/companies/{id}
```

### Resume Versions

```http
POST   /api/v1/resume-versions
GET    /api/v1/resume-versions
GET    /api/v1/resume-versions/{id}
PATCH  /api/v1/resume-versions/{id}
DELETE /api/v1/resume-versions/{id}
```

### Applications

```http
POST   /api/v1/applications
GET    /api/v1/applications
GET    /api/v1/applications/{id}
PATCH  /api/v1/applications/{id}
DELETE /api/v1/applications/{id}
PATCH  /api/v1/applications/{id}/status
GET    /api/v1/applications/{id}/audit-logs
```

### Job Descriptions

```http
POST  /api/v1/applications/{id}/job-description
GET   /api/v1/applications/{id}/job-description
PATCH /api/v1/job-descriptions/{id}
```

## Go Deep Today

### Application Status State Machine

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

### Transactional Status Update

When calling:

```http
PATCH /api/v1/applications/{id}/status
```

Backend should:

1. Load current application.
2. Validate transition.
3. Begin transaction.
4. Update application status.
5. Insert audit log.
6. Commit transaction.
7. Return updated application.

## Add Basic Tests

Test:

- valid status transition
- invalid status transition
- audit log created after status change
- rejected is terminal
- withdrawn is terminal

## Definition of Done

- Can create company
- Can create resume version
- Can create application
- Can attach job description
- Can update status
- Can see audit logs
- Invalid transitions fail

## AI Coding Prompt

```text
Implement CareerOS REST APIs for companies, resume_versions, applications, and job_descriptions.

Use service/repository layering. Implement application status transition validation as a state machine. The status update endpoint must update the application and insert an audit_log entry in a single PostgreSQL transaction.

Add tests for valid transitions, invalid transitions, and audit log creation.
```

---

# Day 3 — Contacts, Interviews, Reminders + Redis Worker

## Goal

Complete the workflow entities and implement the first real backend system: reminder processing.

## Build APIs

### Contacts

```http
POST   /api/v1/contacts
GET    /api/v1/contacts
GET    /api/v1/contacts/{id}
PATCH  /api/v1/contacts/{id}
DELETE /api/v1/contacts/{id}
```

### Interview Rounds

```http
POST   /api/v1/applications/{id}/interviews
GET    /api/v1/applications/{id}/interviews
PATCH  /api/v1/interviews/{id}
DELETE /api/v1/interviews/{id}
```

### Reminders

```http
POST   /api/v1/reminders
GET    /api/v1/reminders
GET    /api/v1/reminders/due
PATCH  /api/v1/reminders/{id}
DELETE /api/v1/reminders/{id}
POST   /api/v1/reminders/{id}/cancel
```

## Redis Reminder Scheduling

When creating a reminder:

1. Insert reminder into PostgreSQL.
2. Generate idempotency_key.
3. Add reminder ID to Redis sorted set.
4. Score = due_at Unix timestamp.

Redis key:

```text
reminders:scheduled
```

## Worker Flow

1. Poll Redis sorted set for due reminders.
2. Remove due reminder from Redis.
3. Load reminder from PostgreSQL.
4. Check status is pending.
5. Mark processing.
6. Insert into reminder_deliveries using unique idempotency_key.
7. Simulate notification delivery.
8. Mark sent and set delivered_at.
9. On failure, retry.
10. If retries exceeded, mark failed and insert failed_reminder_jobs.

## Go Deep Today

Implement:

- idempotency keys
- reminder_deliveries table
- retry_count
- last_error
- failed_reminder_jobs table
- dead-letter recovery

## Failure Handling

```text
retry_count < max:
  status = pending
  reinsert into Redis with backoff

retry_count >= max:
  status = failed
  insert failed_reminder_jobs
```

Suggested backoff:

```text
retry 1: 30 seconds
retry 2: 2 minutes
retry 3: 5 minutes
then failed
```

## Definition of Done

- Can create reminders
- Reminder appears in Redis
- Worker processes due reminders
- Reminder becomes sent
- Duplicate processing does not create duplicate delivery
- Failed reminders retry
- Exceeded retries go to failed_reminder_jobs

## AI Coding Prompt

```text
Implement contacts, interview_rounds, and reminders APIs for CareerOS.

Then implement a Redis-backed reminder worker using a sorted set named reminders:scheduled. When reminders are due, process them idempotently using a reminder_deliveries table with a unique idempotency_key. Add retry handling, exponential backoff, and failed_reminder_jobs dead-letter storage after max retries.
```

---

# Day 4 — Search, Resume/JD Matching, JD Analysis

## Goal

Build the intelligence layer that supports strong resume bullets.

## Build Full-Text Search

Endpoint:

```http
GET /api/v1/search?q=postgres redis backend
```

Search across:

- applications.title
- applications.notes
- job_descriptions.raw_text
- companies.name
- contacts.notes
- resume_versions.name
- resume_versions.tags

For Day 4, at minimum:

- applications
- job_descriptions
- companies
- resume_versions

## Use PostgreSQL Full-Text Search

Add weighted vectors:

- Application title: A
- Company name: A
- Resume version name/tags: B
- Job description: B
- Notes: C

Return:

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

## Build Deterministic JD Skill Extraction

Endpoint:

```http
POST /api/v1/job-descriptions/{id}/extract-keywords
```

Use dictionary:

```text
go
java
python
typescript
postgresql
mysql
redis
kafka
docker
kubernetes
aws
gcp
grpc
rest
microservices
distributed systems
system design
ci/cd
linux
prometheus
grafana
machine learning
pytorch
tensorflow
llm
rag
vector database
quant
c++
low latency
```

Return:

```json
{
  "keywords": ["go", "postgresql", "redis", "docker"]
}
```

Store in:

```text
job_descriptions.extracted_keywords
```

## Build Resume/JD Comparison

Endpoint:

```http
POST /api/v1/job-descriptions/{id}/compare-resume/{resumeVersionId}
```

Response:

```json
{
  "matched_keywords": ["go", "postgresql", "redis"],
  "missing_keywords": ["docker", "kubernetes"],
  "match_score": 0.6
}
```

## Build Best Resume Recommendation

Endpoint:

```http
GET /api/v1/applications/{id}/recommended-resume
```

Compares all resume versions against the job description and returns:

```json
{
  "recommended_resume_version_id": "uuid",
  "resume_name": "Backend Resume v2",
  "match_score": 0.82,
  "matched_keywords": [],
  "missing_keywords": []
}
```

## Optional If Time: pgvector Placeholder

Do not force pgvector unless everything else is stable.

Acceptable options:

- Add `docs/pgvector-plan.md`.
- Add schema for future embeddings.
- Avoid putting pgvector on resume until it actually works.

## Go Deep Today

Go deeper on:

- search ranking
- GIN indexes
- weighted keyword scoring
- resume recommendation logic

## Definition of Done

- Search returns ranked results
- JD keyword extraction works
- Resume/JD comparison works
- Best resume recommendation works

## AI Coding Prompt

```text
Implement CareerOS search and resume matching.

Add PostgreSQL full-text search with weighted search vectors and GIN indexes across applications, job_descriptions, companies, and resume_versions. Implement /search?q=.

Add deterministic JD skill extraction using a backend/AI/quant skill dictionary. Store extracted keywords in job_descriptions.extracted_keywords.

Add resume-to-JD comparison using resume tags and content_text with weighted keyword scoring. Add an endpoint to recommend the best resume version for an application.
```

---

# Day 5 — Analytics + Prep Briefs + Seed Data

## Goal

Make the product useful and generate demo-ready data.

## Build Analytics Endpoints

```http
GET /api/v1/analytics/summary
GET /api/v1/analytics/by-status
GET /api/v1/analytics/by-role-track
GET /api/v1/analytics/by-resume-version
GET /api/v1/analytics/source-performance
GET /api/v1/analytics/funnel
GET /api/v1/analytics/upcoming
```

## Summary Response

```json
{
  "total_applications": 128,
  "active_applications": 46,
  "interviews_scheduled": 5,
  "pending_followups": 8,
  "response_rate": 0.18,
  "offer_rate": 0.02
}
```

## Resume Version Analytics

```json
[
  {
    "resume_version_id": "uuid",
    "resume_name": "Backend Resume v2",
    "applications": 42,
    "responses": 9,
    "offers": 1,
    "response_rate": 0.214,
    "offer_rate": 0.024
  }
]
```

## Build Prep Context Endpoint

```http
GET /api/v1/applications/{id}/prep-context
```

Return:

```json
{
  "company": "Stripe",
  "title": "Backend Engineer",
  "resume_version": "Backend Resume v2",
  "job_keywords": ["go", "postgresql", "redis"],
  "missing_keywords": ["kubernetes"],
  "recruiter_notes": [],
  "interview_rounds": [],
  "contacts": [],
  "suggested_focus_areas": [
    "PostgreSQL indexing",
    "Redis caching",
    "system design"
  ]
}
```

## Build Interview Prep Brief

For week 1, deterministic/template-based is fine.

Endpoint:

```http
POST /api/v1/applications/{id}/generate-prep-brief
```

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

Only call this AI-generated if an actual LLM is used.

## Build Seed Script

Target seed:

- 100 companies
- 10 resume versions
- 10,000 applications
- 10,000 job descriptions
- 20,000 reminders
- 5,000 contacts
- 3,000 interview rounds

If too slow, start with:

- 1,000 applications
- 1,000 job descriptions
- 2,000 reminders

Then scale up.

## Go Deep Today

Go deeper on:

- analytics SQL aggregation
- seed data realism
- prep context usefulness

## Definition of Done

- Analytics endpoints work
- Prep context works
- Prep brief works
- Seed data exists
- Large dataset can be generated

## AI Coding Prompt

```text
Implement CareerOS analytics endpoints:
summary, by-status, by-role-track, by-resume-version, source-performance, funnel, and upcoming.

Use efficient PostgreSQL aggregation queries.

Implement /applications/{id}/prep-context and /applications/{id}/generate-prep-brief using job description keywords, resume matching results, recruiter notes, contacts, and interview rounds.

Create a seed command that generates realistic companies, resume versions, applications, job descriptions, reminders, contacts, and interview rounds across backend, AI, quant, and general tracks.
```

---

# Day 6 — Benchmarks, Tests, Frontend

## Goal

Make the project demo-ready and resume-ready.

## Build k6 Benchmarks

Scripts:

```text
benchmarks/k6/search.js
benchmarks/k6/create-application.js
benchmarks/k6/status-update.js
benchmarks/k6/reminder-create.js
benchmarks/k6/mixed-workload.js
```

## Benchmark Targets

Measure:

- search p95
- application create p95
- status update p95
- reminder create p95
- analytics summary p95

Do not fake numbers.

Record results in:

```text
docs/benchmark-results.md
```

## Worker Reliability Test

Add a script or test:

1. Seed due reminders.
2. Start worker.
3. Simulate duplicate processing.
4. Verify no duplicate reminder_deliveries.
5. Optionally restart worker.
6. Verify all reminders processed.

If full restart testing is too much, create tests for:

- idempotency
- retry behavior
- failed job handling
- duplicate delivery conflict

## Build Simple Frontend

Use Next.js.

Pages:

- /dashboard
- /applications
- /applications/[id]
- /resume-versions
- /search
- /reminders
- /analytics

### Dashboard Cards

- Total applications
- Active applications
- Upcoming interviews
- Pending follow-ups
- Response rate
- Best resume version

### Application Detail Page

Show:

- company
- role title
- status
- resume version
- job description
- keywords
- resume match
- interviews
- contacts
- reminders
- audit logs
- prep brief

## Go Deep Today

Go deeper on:

- benchmarks
- idempotency tests
- worker reliability
- frontend demo path

## Definition of Done

- k6 scripts run
- benchmark results are recorded
- worker idempotency test passes
- frontend can demo main workflow
- application detail page looks useful

## AI Coding Prompt

```text
Create k6 benchmark scripts for CareerOS:
search, create application, update status, create reminder, and mixed workload.

Create benchmark-results.md template.

Add tests for reminder worker idempotency, retry behavior, and failed job handling.

Create a simple Next.js dashboard with pages for applications, application detail, search, reminders, resume versions, and analytics. Keep UI minimal with Tailwind and shadcn/ui.
```

---

# Day 7 — Polish, README, Resume Bullets, Demo

## Goal

Make the project professional enough to apply with.

## Polish README

README should include:

1. Project overview
2. Why this project was built
3. Key features
4. Architecture diagram
5. Tech stack
6. Data model overview
7. API examples
8. Search design
9. Reminder worker design
10. Resume/JD matching design
11. Analytics design
12. Benchmark results
13. Setup instructions
14. Screenshots
15. Future improvements
16. Resume bullets

## Architecture Diagram

Include:

```text
Next.js Dashboard
       |
       v
Go REST API
   |       |
   v       v
PostgreSQL Redis
             |
             v
       Reminder Worker
```

## Add Screenshots

Take screenshots of:

- dashboard
- applications list
- application detail
- search
- analytics
- reminders
- prep brief

## Add Docs

Create:

```text
docs/architecture.md
docs/api.md
docs/search-design.md
docs/reminder-worker.md
docs/benchmark-results.md
docs/future-roadmap.md
```

## Final Smoke Test

Run:

```bash
make up
make migrate
make seed
make test
make bench-search
```

Manually test:

- create application
- add job description
- extract keywords
- compare resume
- update status
- view audit log
- create reminder
- run worker
- search
- view analytics
- generate prep brief

## Resume Bullets

Use this version if you completed the features but not all final advanced metrics:

```text
Built CareerOS, a Go/PostgreSQL job application platform that consolidates resume versions, job descriptions, recruiter notes, interview rounds, contacts, follow-up reminders, and analytics across backend, AI, quant, and general applications.

Implemented a resume-to-JD matching engine using PostgreSQL full-text search, structured skill extraction, and weighted keyword scoring to identify matched skills, missing keywords, and best-fit resume variants for each role.

Designed a Redis-backed reminder worker with retry handling, idempotency keys, and dead-letter recovery, validating scheduled follow-up processing under worker-restart and duplicate-processing scenarios.

Added analytics endpoints and interview prep brief generation for application funnel tracking, response rate by resume version, source effectiveness, upcoming interviews, pending follow-ups, and role-specific preparation context.
```

Use this version only after actual benchmark numbers:

```text
Benchmarked PostgreSQL full-text search across 10,000 seeded applications and job descriptions with k6, achieving p95 latency of X ms.

Processed 10,000 scheduled reminders with zero duplicate sends during worker-restart tests using idempotent delivery records and retry-safe state transitions.
```

## Definition of Done

- README looks professional
- screenshots exist
- benchmarks are documented
- project runs from fresh clone
- resume bullets are honest
- project can be demoed in under 5 minutes

---

# If Time Gets Tight

Prioritize in this order.

## Priority 1 — Resume-Critical Backend

- application workflow
- audit logs
- full-text search
- Redis reminder worker
- idempotency
- analytics
- README

## Priority 2 — Product Completeness

- contacts
- interviews
- resume/JD comparison
- prep brief
- dashboard
- seed data

## Priority 3 — Advanced Extras

- pgvector
- real LLM integration
- calendar integration
- email integration
- browser extension
- multi-user auth
- deployment

Do not sacrifice core backend quality for pgvector or fancy AI.

---

# Minimum Viable Week-1 Version

If development goes slower than expected, finish this:

- Go API
- PostgreSQL migrations
- Docker Compose
- companies/applications/resume versions/JDs/reminders
- status workflow
- audit logs
- full-text search
- Redis worker
- basic analytics
- seed data
- README

This is enough to start applying.

---

# Stretch Version If You Move Fast

If you finish early, add:

- pgvector semantic resume/JD matching
- OpenAPI Swagger docs
- CSV import/export
- Prometheus `/metrics` endpoint
- worker heartbeat table
- Telegram reminder notifications
- deployed demo
- GitHub Actions CI

---

# Suggested GitHub Milestones

## v0.1 — Core Tracker

- companies
- applications
- resume versions
- status workflow
- audit logs
- Docker Compose

## v0.2 — Search and Analytics

- job descriptions
- full-text search
- analytics summary
- seed data

## v0.3 — Reminder System

- Redis scheduled reminders
- worker
- retries
- idempotency
- failed jobs

## v0.4 — Dashboard

- Next.js dashboard
- application detail
- search UI
- analytics UI
- reminder UI

## v0.5 — Backend Reliability

- structured logs
- k6 benchmarks
- worker restart tests
- dead-letter recovery

## v1.0 — Portfolio Release

- polished README
- architecture docs
- screenshots
- benchmark results
- resume bullets

---

# Interview Positioning

Use this explanation:

> I intentionally built CareerOS with broad product coverage because it mirrors my real job application workflow, but I went deeper on the backend-heavy parts: PostgreSQL full-text search, Redis-based reminder processing, idempotency, audit logs, analytics, and benchmarking.

This is stronger than saying the project is just a CRUD app or just an AI wrapper.

---

# Final 1-Week Target

The strongest realistic version is:

```text
CareerOS v1:
- Broad product surface
- Deep search
- Deep reminder worker
- Solid audit/status workflow
- Useful analytics
- Basic resume/JD matching
- Simple dashboard
- Honest benchmark results
- Polished README
```

That is enough to put on your resume and start applying while continuing to improve the project.
