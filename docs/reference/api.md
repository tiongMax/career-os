# API Reference

CareerOS exposes a REST API under:

```text
http://localhost:8080/api/v1
```

The canonical machine-readable spec is served at `GET /api/v1/openapi.yaml`, and Swagger UI is available at `GET /api/v1/docs`.

## Authentication

No authentication or authorization is currently implemented. The API sets permissive CORS headers and accepts an `Authorization` header, but handlers do not validate it.

<!-- TODO: clarify intended auth model with team before production use -->

## Response and Error Format

Successful JSON responses use `Content-Type: application/json`.

Errors use:

```json
{
  "error": "message"
}
```

Common status codes:

| Code | Meaning |
| --- | --- |
| `200` | Request succeeded. |
| `201` | Resource created. |
| `204` | Resource deleted or upload completed without a JSON body. |
| `400` | Invalid JSON, invalid UUID, validation error, unknown JSON field, or constraint violation. |
| `404` | Resource not found. |
| `409` | Duplicate resource or invalid application status transition. |
| `500` | Unexpected server error. |
| `503` | Health check dependency failure. |

## Health and Docs

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Checks PostgreSQL and Redis connectivity. |
| `GET` | `/openapi.yaml` | Serves the OpenAPI 3.1 spec. |
| `GET` | `/docs` | Serves Swagger UI. |

Example:

```http
GET /api/v1/health
```

```json
{
  "status": "ok",
  "postgres": "ok",
  "redis": "ok"
}
```

## Companies

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/companies` | List companies. |
| `POST` | `/companies` | Create a company. |
| `GET` | `/companies/{id}` | Get one company. |
| `PATCH` | `/companies/{id}` | Update a company. |
| `DELETE` | `/companies/{id}` | Delete a company. |

Create/update request:

```json
{
  "name": "Example Corp",
  "website": "https://example.com",
  "industry": "Software",
  "location": "Remote",
  "notes": "Target account"
}
```

Response:

```json
{
  "id": "00000000-0000-4000-8000-000000000000",
  "name": "Example Corp",
  "website": "https://example.com",
  "industry": "Software",
  "location": "Remote",
  "notes": "Target account",
  "created_at": "2026-05-25T00:00:00Z",
  "updated_at": "2026-05-25T00:00:00Z"
}
```

Required fields: `name`.

## Resume Versions

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/resume-versions` | List resume versions. |
| `POST` | `/resume-versions` | Create a resume version. |
| `GET` | `/resume-versions/{id}` | Get one resume version. |
| `PATCH` | `/resume-versions/{id}` | Update a resume version. |
| `DELETE` | `/resume-versions/{id}` | Delete a resume version. |
| `POST` | `/resume-versions/{id}/pdf` | Upload a PDF using multipart form field `file`. |
| `GET` | `/resume-versions/{id}/pdf` | Download the attached PDF. |

Create/update request:

```json
{
  "name": "Backend Resume",
  "track": "backend",
  "content_text": "Built Go APIs with PostgreSQL, Redis workers, and full-text search.",
  "tags": ["go", "postgres"]
}
```

Response:

```json
{
  "id": "00000000-0000-4000-8000-000000000000",
  "name": "Backend Resume",
  "track": "backend",
  "content_text": "Built Go APIs with PostgreSQL, Redis workers, and full-text search.",
  "has_pdf": false,
  "tags": ["go", "postgres"],
  "created_at": "2026-05-25T00:00:00Z",
  "updated_at": "2026-05-25T00:00:00Z"
}
```

Required fields: `name`, `track`.

## Applications

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/applications` | List applications. |
| `POST` | `/applications` | Create an application. |
| `GET` | `/applications/{id}` | Get one application. |
| `PATCH` | `/applications/{id}` | Update an application. |
| `DELETE` | `/applications/{id}` | Delete an application. |
| `PATCH` | `/applications/{id}/status` | Transition application status and write an audit log. |
| `GET` | `/applications/{id}/audit-logs` | List audit logs for an application. |
| `GET` | `/applications/{id}/recommended-resume` | Return the best resume match for an application JD. |
| `GET` | `/applications/{id}/prep-context` | Aggregate interview prep context. |
| `POST` | `/applications/{id}/generate-prep-brief` | Generate a deterministic prep brief. |
| `POST` | `/applications/{id}/ai-analysis-jobs` | Queue a Gemini-backed AI analysis job for an application. |
| `GET` | `/applications/{id}/ai-analysis-jobs` | List AI analysis jobs for an application. |

Create/update request:

```json
{
  "company_id": "00000000-0000-4000-8000-000000000000",
  "resume_version_id": "00000000-0000-4000-8000-000000000001",
  "title": "Backend Engineer",
  "role_track": "backend",
  "source": "company_site",
  "status": "saved",
  "location": "Remote",
  "employment_type": "full_time",
  "job_url": "https://example.com/jobs/backend",
  "applied_at": "2026-05-25T00:00:00Z",
  "deadline_at": "2026-06-01T00:00:00Z",
  "notes": "Strong fit"
}
```

Response:

```json
{
  "id": "00000000-0000-4000-8000-000000000010",
  "company_id": "00000000-0000-4000-8000-000000000000",
  "resume_version_id": "00000000-0000-4000-8000-000000000001",
  "title": "Backend Engineer",
  "role_track": "backend",
  "source": "company_site",
  "status": "saved",
  "location": "Remote",
  "employment_type": "full_time",
  "job_url": "https://example.com/jobs/backend",
  "applied_at": "2026-05-25T00:00:00Z",
  "deadline_at": "2026-06-01T00:00:00Z",
  "notes": "Strong fit",
  "created_at": "2026-05-25T00:00:00Z",
  "updated_at": "2026-05-25T00:00:00Z"
}
```

Required fields: `company_id`, `title`, `role_track`.

Status values:

```text
saved, applied, recruiter_screen, technical_screen, onsite, offer, rejected, withdrawn
```

Status transition request:

```json
{
  "status": "applied"
}
```

Invalid transitions return `409`.

## AI Analysis Jobs

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/applications/{id}/ai-analysis-jobs` | Queue an async AI analysis job. |
| `GET` | `/applications/{id}/ai-analysis-jobs` | List jobs for one application. |
| `GET` | `/ai-analysis-jobs` | List the latest 100 analysis jobs. |
| `GET` | `/ai-analysis-jobs/{id}` | Get one analysis job and its result. |

Create request:

```json
{
  "job_type": "resume_match"
}
```

Supported `job_type` values:

```text
resume_match, jd_extract, prep_brief
```

Job statuses:

```text
queued, processing, completed, failed
```

Completed jobs include a persisted `result` JSON object. The shape depends on `job_type`:

- `resume_match`: uses Gemini embeddings to rank resume versions, then returns `recommended_resume_id`, `match_score`, `matched_skills`, `missing_skills`, `resume_feedback`, `interview_focus`, and `embedding_matches`.
- `jd_extract`: extracts `extracted_keywords`, `core_requirements`, `responsibilities`, `seniority`, and `summary`. Extracted keywords and summary are also written back to the job description.
- `prep_brief`: returns `prep_plan`, `talking_points`, `suggested_questions`, `matched_skills`, `missing_skills`, and `interview_focus`.

The worker processes queued jobs with Gemini when `GEMINI_API_KEY` is set.

## Job Descriptions

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/applications/{id}/job-description` | Attach a JD to an application. |
| `GET` | `/applications/{id}/job-description` | Get an application's JD. |
| `PATCH` | `/job-descriptions/{id}` | Update JD raw text or extracted keywords. |
| `POST` | `/job-descriptions/{id}/extract-keywords` | Run deterministic keyword extraction. |
| `POST` | `/job-descriptions/{id}/compare-resume/{resumeVersionId}` | Score a resume against a JD. |

Create request:

```json
{
  "raw_text": "We are hiring a Go engineer with PostgreSQL and Redis experience."
}
```

Update request:

```json
{
  "raw_text": "Updated JD text",
  "extracted_keywords": ["go", "postgresql", "redis"]
}
```

Response:

```json
{
  "id": "00000000-0000-4000-8000-000000000020",
  "application_id": "00000000-0000-4000-8000-000000000010",
  "raw_text": "We are hiring a Go engineer with PostgreSQL and Redis experience.",
  "extracted_keywords": ["go", "postgresql", "redis"],
  "ai_summary": null,
  "created_at": "2026-05-25T00:00:00Z",
  "updated_at": "2026-05-25T00:00:00Z"
}
```

Resume comparison response:

```json
{
  "matched": ["go", "postgresql"],
  "missing": ["redis"],
  "score": 0.67
}
```

Required fields: `raw_text` when creating.

## Contacts

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/contacts` | List contacts. |
| `POST` | `/contacts` | Create a contact. |
| `GET` | `/contacts/{id}` | Get one contact. |
| `PATCH` | `/contacts/{id}` | Update a contact. |
| `DELETE` | `/contacts/{id}` | Delete a contact. |

Create/update request:

```json
{
  "company_id": "00000000-0000-4000-8000-000000000000",
  "name": "Ada Lovelace",
  "role": "Recruiter",
  "email": "ada@example.com",
  "linkedin_url": "https://linkedin.com/in/ada",
  "relationship": "recruiter",
  "notes": "Met after screening"
}
```

Required fields: `company_id`, `name`.

## Interviews

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/applications/{id}/interviews` | List interview rounds for an application. |
| `POST` | `/applications/{id}/interviews` | Create an interview round. |
| `PATCH` | `/interviews/{id}` | Update an interview round. |
| `DELETE` | `/interviews/{id}` | Delete an interview round. |

Create/update request:

```json
{
  "round_type": "technical",
  "scheduled_at": "2026-05-27T15:00:00Z",
  "interviewer": "Grace Hopper",
  "notes": "Focus on service design",
  "outcome": "pending"
}
```

Round types:

```text
recruiter, online_assessment, technical, system_design, behavioral, final
```

Required fields: `round_type`.

## Reminders

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/reminders` | List reminders. |
| `POST` | `/reminders` | Create and schedule a reminder. |
| `GET` | `/reminders/due` | List due pending reminders. |
| `GET` | `/reminders/failed` | List failed reminder jobs. |
| `GET` | `/reminders/{id}` | Get one reminder. |
| `PATCH` | `/reminders/{id}` | Update and reschedule a reminder. |
| `DELETE` | `/reminders/{id}` | Delete and unschedule a reminder. |
| `POST` | `/reminders/{id}/cancel` | Cancel a pending reminder. |
| `POST` | `/reminders/{id}/retry` | Retry a failed reminder. |

Create/update request:

```json
{
  "application_id": "00000000-0000-4000-8000-000000000010",
  "contact_id": "00000000-0000-4000-8000-000000000030",
  "title": "Follow up with recruiter",
  "description": "Send a short note after technical screen",
  "due_at": "2026-05-28T09:00:00Z"
}
```

Response:

```json
{
  "id": "00000000-0000-4000-8000-000000000040",
  "application_id": "00000000-0000-4000-8000-000000000010",
  "contact_id": "00000000-0000-4000-8000-000000000030",
  "title": "Follow up with recruiter",
  "description": "Send a short note after technical screen",
  "due_at": "2026-05-28T09:00:00Z",
  "status": "pending",
  "idempotency_key": "generated-by-api",
  "retry_count": 0,
  "last_error": null,
  "delivered_at": null,
  "created_at": "2026-05-25T00:00:00Z",
  "updated_at": "2026-05-25T00:00:00Z"
}
```

Reminder statuses:

```text
pending, processing, sent, failed, cancelled
```

Required fields: `application_id`, `title`, `due_at`.

## Role Tracks

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/tracks` | List role tracks. |
| `POST` | `/tracks` | Create a role track. |

Create request:

```json
{
  "name": "platform"
}
```

Response:

```json
{
  "id": "00000000-0000-4000-8000-000000000050",
  "name": "platform",
  "created_at": "2026-05-25T00:00:00Z"
}
```

Required fields: `name`.

Note: `backend/internal/httpapi/openapi.yaml` currently describes `slug` and `label` for this endpoint, but the handler and frontend client use `name`.

<!-- TODO: update OpenAPI role track schema or align implementation. -->

## Search

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/search?q={query}` | Weighted PostgreSQL full-text search across applications and job descriptions. |

Example:

```http
GET /api/v1/search?q=postgres
```

Response:

```json
{
  "query": "postgres",
  "results": [
    {
      "type": "application",
      "id": "00000000-0000-4000-8000-000000000010",
      "title": "Backend Engineer",
      "company": "Example Corp",
      "rank": 0.5
    }
  ]
}
```

## Analytics

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/analytics/summary` | Top-line application and reminder counts. |
| `GET` | `/analytics/by-status` | Application counts grouped by status. |
| `GET` | `/analytics/by-role-track` | Application counts grouped by role track. |
| `GET` | `/analytics/by-resume-version` | Per-resume performance metrics. |
| `GET` | `/analytics/source-performance` | Response and offer rate by source. |
| `GET` | `/analytics/funnel` | Funnel counts by stage. |
| `GET` | `/analytics/upcoming` | Upcoming interviews and reminders. |

Summary response:

```json
{
  "total": 10,
  "active": 6,
  "responded": 3,
  "offers": 1,
  "response_rate": 30,
  "offer_rate": 10,
  "pending_reminders": 2
}
```

Grouped response example:

```json
[
  { "status": "applied", "count": 4 },
  { "status": "onsite", "count": 1 }
]
```

## Exports

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/exports/applications.csv` | Export applications as CSV. |
| `GET` | `/exports/contacts.csv` | Export contacts as CSV. |
| `GET` | `/exports/reminders.csv` | Export reminders as CSV. |

Responses are CSV files.
