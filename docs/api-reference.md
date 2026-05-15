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

## Planned API Groups

These groups come from the PRD and roadmap. They are not implemented in the
current codebase yet.

### Companies

Planned endpoints:

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

Planned endpoints:

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

Planned endpoints:

```http
POST /api/v1/applications
GET /api/v1/applications
GET /api/v1/applications/{id}
PATCH /api/v1/applications/{id}
POST /api/v1/applications/{id}/status
DELETE /api/v1/applications/{id}
```

Purpose:

- Track job opportunities.
- Attach company, resume version, source, dates, and status.
- Enforce workflow transitions through a service layer.

### Job Descriptions

Planned endpoints:

```http
POST /api/v1/applications/{application_id}/job-description
GET /api/v1/applications/{application_id}/job-description
PATCH /api/v1/job-descriptions/{id}
```

Purpose:

- Store raw JD text.
- Support keyword extraction, summaries, and search.

### Contacts

Planned endpoints:

```http
POST /api/v1/contacts
GET /api/v1/contacts
GET /api/v1/contacts/{id}
PATCH /api/v1/contacts/{id}
DELETE /api/v1/contacts/{id}
```

Purpose:

- Track people related to companies and applications.

### Interview Rounds

Planned endpoints:

```http
POST /api/v1/interview-rounds
GET /api/v1/applications/{application_id}/interview-rounds
PATCH /api/v1/interview-rounds/{id}
DELETE /api/v1/interview-rounds/{id}
```

Purpose:

- Track interview stages, schedules, notes, and outcomes.

### Reminders

Planned endpoints:

```http
POST /api/v1/reminders
GET /api/v1/reminders
GET /api/v1/reminders/{id}
PATCH /api/v1/reminders/{id}
POST /api/v1/reminders/{id}/cancel
```

Purpose:

- Schedule follow-ups and deadlines.
- Feed the reminder worker.

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
