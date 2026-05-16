# API Reference

Base path:

```text
/api/v1
```

This doc separates implemented endpoints from planned endpoints. Treat the
implemented section as live behavior and the planned section as the roadmap.

## Implemented

### Health Check

```http
GET /api/v1/health
```

Checks PostgreSQL and Redis connectivity.

Healthy response:

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "status": "ok",
  "postgres": "ok",
  "redis": "ok"
}
```

Degraded response:

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json
```

```json
{
  "status": "degraded",
  "postgres": "error",
  "redis": "ok"
}
```

Either `postgres` or `redis` can be `error` depending on which dependency
failed.

## Implemented API Groups

### Companies

```http
POST /api/v1/companies
GET /api/v1/companies
GET /api/v1/companies/{id}
PATCH /api/v1/companies/{id}
DELETE /api/v1/companies/{id}
```

Purpose:

- Track companies and organization-level metadata.
- Connect applications and contacts to companies.

### Resume Versions

```http
POST /api/v1/resume-versions
GET /api/v1/resume-versions
GET /api/v1/resume-versions/{id}
PATCH /api/v1/resume-versions/{id}
DELETE /api/v1/resume-versions/{id}
```

Purpose:

- Track resume variants by role track.
- Support later resume-to-JD matching.

### Applications

```http
POST /api/v1/applications
GET /api/v1/applications
GET /api/v1/applications/{id}
PATCH /api/v1/applications/{id}
PATCH /api/v1/applications/{id}/status
GET /api/v1/applications/{id}/audit-logs
DELETE /api/v1/applications/{id}
```

Purpose:

- Track job opportunities.
- Attach company, resume version, source, dates, and status.
- Enforce workflow transitions through a service layer.

### Job Descriptions

```http
POST /api/v1/applications/{id}/job-description
GET /api/v1/applications/{id}/job-description
PATCH /api/v1/job-descriptions/{id}
```

Purpose:

- Store raw JD text.
- Support keyword extraction, summaries, and search.

### Contacts

```http
POST /api/v1/contacts
GET /api/v1/contacts
GET /api/v1/contacts/{id}
PATCH /api/v1/contacts/{id}
DELETE /api/v1/contacts/{id}
```

Purpose:

- Track people related to companies and applications.

Create request:

```json
{
  "company_id": "uuid",
  "name": "Ada Lovelace",
  "role": "Recruiter",
  "email": "ada@example.com",
  "linkedin_url": "https://linkedin.com/in/ada",
  "relationship": "recruiter",
  "notes": "Met during screening"
}
```

Validation:

- `name` is required and cannot be blank.
- `company_id` must reference an existing company.

### Interview Rounds

```http
POST /api/v1/applications/{id}/interviews
GET /api/v1/applications/{id}/interviews
PATCH /api/v1/interviews/{id}
DELETE /api/v1/interviews/{id}
```

Purpose:

- Track interview stages, schedules, notes, and outcomes.

Create request:

```json
{
  "round_type": "technical",
  "scheduled_at": "2026-05-17T10:00:00Z",
  "interviewer": "Grace Hopper",
  "notes": "Focus on Go services",
  "outcome": "pending"
}
```

Validation:

- `round_type` must be one of `recruiter`, `online_assessment`, `technical`,
  `system_design`, `behavioral`, or `final`.
- Interview rounds are created under an application ID.

### Reminders

```http
POST /api/v1/reminders
GET /api/v1/reminders
GET /api/v1/reminders/due
GET /api/v1/reminders/{id}
PATCH /api/v1/reminders/{id}
DELETE /api/v1/reminders/{id}
POST /api/v1/reminders/{id}/cancel
```

Purpose:

- Schedule follow-ups and deadlines.
- Feed the Redis sorted set used by the reminder worker.

Create request:

```json
{
  "application_id": "uuid",
  "contact_id": "uuid",
  "title": "Follow up with recruiter",
  "description": "Send a short note after the technical round",
  "due_at": "2026-05-17T10:00:00Z"
}
```

Validation and behavior:

- `title` is required and cannot be blank.
- `due_at` is required.
- The API generates `idempotency_key` server-side.
- Pending reminders are scheduled in Redis under `reminders:scheduled`.
- Cancelling or deleting a reminder removes it from the Redis schedule.

## Planned API Groups

### Search

Planned endpoint:

```http
GET /api/v1/search?q={query}
```

Purpose:

- Search applications and job descriptions through PostgreSQL full-text search.

### Analytics

Planned endpoints:

```http
GET /api/v1/analytics/summary
GET /api/v1/analytics/by-status
GET /api/v1/analytics/by-role-track
GET /api/v1/analytics/by-resume-version
GET /api/v1/analytics/funnel
GET /api/v1/analytics/upcoming
```

Purpose:

- Summarize pipeline health, role-track distribution, conversion funnel, and
  upcoming dates.
