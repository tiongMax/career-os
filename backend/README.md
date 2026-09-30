# CareerOS TypeScript Backend

The CareerOS API, worker, and migration runner are implemented in TypeScript
with Fastify, Zod, Drizzle, and PostgreSQL.

## TypeScript backend commands

Install dependencies from the repository root:

```sh
npm install --prefix backend
```

Run the TypeScript API with the repository `.env` file:

```sh
npm run migrate:up
npm run dev:api
```

Run the verification gates:

```sh
npm run typecheck:api
npm run lint:api
npm run format:check:api
npm run test:api
npm run build:api
```

The TypeScript API currently exposes:

- `GET /api/v1/health`
- `GET /api/v1/openapi.yaml`
- `GET /api/v1/docs`
- `GET /api/v1/dashboard`
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
- `GET, POST /api/v1/contacts` (GET accepts optional `company_id`)
- `GET, PATCH, DELETE /api/v1/contacts/{id}`
- `GET, POST /api/v1/applications/{id}/interviews`
- `PATCH, DELETE /api/v1/interviews/{id}`
- `GET, POST /api/v1/applications/{id}/job-description`
- `PATCH /api/v1/job-descriptions/{id}`
- `GET, POST /api/v1/reminders`
- `GET /api/v1/reminders/due`
- `GET /api/v1/reminders/failed`
- `GET, PATCH, DELETE /api/v1/reminders/{id}`
- `POST /api/v1/reminders/{id}/cancel`
- `POST /api/v1/reminders/{id}/retry`
- `GET /api/v1/search?q={query}`
- `GET /api/v1/analytics/{summary,by-status,by-role-track,by-resume-version,source-performance,funnel,upcoming}`
- `GET /api/v1/exports/{applications,contacts,reminders}.csv`

Resume PDF uploads use the multipart field name `file` and accept up to 32 MiB.
The PDF is stored in the existing PostgreSQL `resume_versions.pdf_data` column.

PostgreSQL migrations in `migrations/` remain the authoritative database
schema history. Do not use schema-push workflows; add a versioned migration
instead.

Job descriptions store raw text for reference. Keyword extraction, resume
matching, generated preparation briefs, and AI analysis have been removed.
Historical analysis tables and derived job-description columns remain in the
database; no cleanup migration is applied. Dashboard reminders remain pending
PostgreSQL records until the user handles or cancels them.
