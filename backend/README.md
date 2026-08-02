# CareerOS TypeScript Backend

The CareerOS API, worker, and migration runner are implemented in TypeScript
with Fastify, Zod, Drizzle, PostgreSQL, and Redis.

## TypeScript backend commands

Install dependencies from the repository root:

```sh
npm install --prefix backend
```

Run the TypeScript API with the repository `.env` file:

```sh
npm run migrate:up
npm run dev:api
npm run dev:worker
```

Run the verification gates:

```sh
npm run typecheck:api:ts
npm run lint:api:ts
npm run format:check:api:ts
npm run test:api:ts
npm run build:api:ts
```

The TypeScript API currently exposes:

- `GET /api/v1/health`
- `GET /api/v1/openapi.yaml`
- `GET /api/v1/docs`
- `GET, POST /api/v1/tracks`
- `GET, POST /api/v1/companies`
- `GET, PATCH, DELETE /api/v1/companies/{id}`
- `GET, POST /api/v1/resume-versions`
- `GET, PATCH, DELETE /api/v1/resume-versions/{id}`
- `GET, POST /api/v1/resume-versions/{id}/pdf`
- `GET, POST /api/v1/applications`
- `GET, PATCH, DELETE /api/v1/applications/{id}`
- `PATCH /api/v1/applications/{id}/status`
- `GET /api/v1/applications/{id}/audit-logs`
- `GET, POST /api/v1/contacts`
- `GET, PATCH, DELETE /api/v1/contacts/{id}`
- `GET, POST /api/v1/applications/{id}/interviews`
- `PATCH, DELETE /api/v1/interviews/{id}`
- `GET, POST /api/v1/applications/{id}/job-description`
- `PATCH /api/v1/job-descriptions/{id}`
- `POST /api/v1/job-descriptions/{id}/extract-keywords`
- `POST /api/v1/job-descriptions/{id}/compare-resume/{resumeVersionId}`
- `GET /api/v1/applications/{id}/recommended-resume`
- `GET /api/v1/applications/{id}/prep-context`
- `POST /api/v1/applications/{id}/generate-prep-brief`
- `GET, POST /api/v1/reminders`
- `GET /api/v1/reminders/due`
- `GET /api/v1/reminders/failed`
- `GET, PATCH, DELETE /api/v1/reminders/{id}`
- `POST /api/v1/reminders/{id}/cancel`
- `POST /api/v1/reminders/{id}/retry`
- `GET /api/v1/search?q={query}`
- `GET /api/v1/analytics/{summary,by-status,by-role-track,by-resume-version,source-performance,funnel,upcoming}`
- `GET /api/v1/exports/{applications,contacts,reminders}.csv`
- `GET, POST /api/v1/applications/{id}/ai-analysis-jobs`
- `GET /api/v1/ai-analysis-jobs`
- `GET /api/v1/ai-analysis-jobs/{id}`

Resume PDF uploads use the multipart field name `file` and accept up to 32 MiB.
The PDF is stored in the existing PostgreSQL `resume_versions.pdf_data` column.

PostgreSQL migrations in `migrations/` remain the authoritative database
schema history. Do not use schema-push workflows; add a versioned migration
instead.

The TypeScript worker processes reminders and, when `GEMINI_API_KEY` is set,
AI analysis jobs. Resume matching uses Gemini embeddings; JD extraction stores
the generated summary and keywords back on the job description.
