# CareerOS TypeScript Backend

The TypeScript backend is being migrated incrementally alongside the existing
Go service. The Go API remains the default runtime until the final cutover.

## TypeScript backend commands

Install dependencies from the repository root:

```sh
npm install --prefix backend
```

Run the TypeScript API with the repository `.env` file:

```sh
npm run migrate:up
npm run dev:api:ts
```

Run the verification gates:

```sh
npm run typecheck:api:ts
npm run lint:api:ts
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

Resume PDF uploads use the multipart field name `file` and accept up to 32 MiB.
The PDF is stored in the existing PostgreSQL `resume_versions.pdf_data` column.

PostgreSQL migrations in `migrations/` remain the authoritative database
schema history. Do not use schema-push workflows during the migration.
