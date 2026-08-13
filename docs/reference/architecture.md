# Architecture

CareerOS is split into a server-rendered Next.js frontend, a TypeScript Fastify API, PostgreSQL, and an optional AI-analysis worker process. The backend uses Zod HTTP contracts, functional domain services, repository interfaces, and Drizzle persistence.

## High-Level Structure

```text
career-os/
  backend/
    src/
      api/          Fastify server and route plugins
      app/          dependency composition
      commands/     API, worker, and migration entry points
      config/       Zod-validated environment configuration
      domain/       business rules and repository contracts
      infrastructure/ PostgreSQL, Gemini, and migrations
      persistence/  Drizzle repositories and schema mapping
      workers/      AI-analysis processor
    migrations/     database schema migrations
  frontend/
    app/            Next.js App Router pages
    components/     shared UI components
    lib/            API client, domain constants, utilities
  benchmarks/k6/    k6 load-test scripts
  docs/
    reference/     stable API, architecture, environment, and schema docs
    development/   implementation guides, workflow notes, and testing notes
    product/       PRD and roadmap material
```

## Runtime Components

| Component | Entry point | Responsibility |
| --- | --- | --- |
| Frontend | `frontend/app` | Server-rendered operational UI for dashboard, applications, contacts, resume versions, reminders, and analytics. |
| API | `backend/src/commands/api.ts` | Serves `/api/v1/*`, connects to PostgreSQL, and exposes Swagger/OpenAPI docs. |
| Worker | `backend/src/commands/worker.ts` | Optionally processes Gemini-backed AI analysis jobs. |
| Migrator | `backend/src/commands/migrate.ts` | Applies and rolls back the existing Goose-format SQL migrations. |
| PostgreSQL | `docker-compose.yml` | Stores companies, applications, resume versions, job descriptions, contacts, interviews, reminders, audit logs, and analytics source data. |

## Backend Layers

```text
HTTP request
  -> Fastify route and Zod schema
  -> domain service
  -> repository interface
  -> Drizzle repository
  -> PostgreSQL

Dashboard load
  -> existing analytics and entity APIs
  -> PostgreSQL reads
  -> frontend attention-rule calculation
```

Handlers own HTTP concerns: JSON decoding, path params, status codes, and response writing. Services own validation, status transitions, keyword extraction/scoring, analytics aggregation, and transaction-oriented behavior. Query packages own SQL and model mapping.

## Frontend Flow

```text
Next.js page or form
  -> frontend/lib/api.ts
  -> fetch http://localhost:8080/api/v1/*
  -> TypeScript API
  -> JSON response
  -> server-rendered or client-side UI
```

The frontend API base URL is `NEXT_PUBLIC_API_URL` when set, otherwise `http://localhost:8080/api/v1`.

## Data Flow Diagram

```mermaid
flowchart LR
  User[User] --> UI[Next.js Frontend]
  UI -->|REST JSON / multipart PDF| API[TypeScript Fastify API]
  API -->|Drizzle / node-postgres| DB[(PostgreSQL)]
  API -->|cache dashboard snapshot| Redis[(Redis)]
  API -->|queue analysis jobs| DB
  API -->|derive dashboard attention| Attention[Attention Rules]
  Attention -->|application-level items| UI
  Worker[AI Analysis Worker] -->|poll analysis jobs| DB
  Worker -->|optional Gemini calls| Gemini[Gemini API]
  API -->|OpenAPI YAML / Swagger UI| Docs[API Docs]
  Bench[k6 Benchmarks] --> API
```

## Domain Model

Core entities:

- `companies`: organization metadata.
- `resume_versions`: resume variants, tags, track, optional PDF data.
- `applications`: job opportunities with status, source, dates, role track, company, and optional resume version.
- `application_role_tracks`: optional multi-track labels for applications; `applications.role_track` remains the primary/backward-compatible track.
- `job_descriptions`: raw JD text, extracted keywords, optional summary.
- `contacts`: people associated with companies.
- `interview_rounds`: scheduled rounds and outcomes for an application.
- `reminders`: optional manually dated dashboard follow-ups.
- `audit_logs`: status transition history.
- `role_tracks`: configurable role track names.
- `reminder_deliveries` and `failed_reminder_jobs`: legacy compatibility records from the removed reminder worker.
- `analysis_jobs`: queued, processing, completed, or failed AI analysis results.

## External Services and Integrations

| Integration | Purpose | Required locally |
| --- | --- | --- |
| PostgreSQL | Primary data store and full-text search vectors. | Yes |
| Redis | Short-lived dashboard read cache; not a reminder queue. | Yes |
| Gemini API | Optional structured JD extraction, resume matching, prep briefs, and embeddings. | Only when `GEMINI_API_KEY` is set for the worker |
| Swagger UI CDN | Renders `/api/v1/docs`. | Only needed to view Swagger UI in a browser |
| k6 | Optional benchmark runner. | No |

No third-party authentication, email, notification, or calendar integration is currently wired in code. Dashboard attention is calculated only when the app is opened.

## Request Middleware

The API server uses:

- CORS with `Access-Control-Allow-Origin: *`
- Fastify request IDs and structured logging
- Zod request and response validation
- centralized error mapping

## Deployment Notes

The multi-stage Dockerfile builds a production Node 22 image containing the API,
worker, migration runner, and SQL files. In the `full` Compose profile, the API
container runs migrations before starting:

```sh
node dist/commands/migrate.js up && node dist/commands/api.js
```

The frontend is not included in the backend Dockerfile. Production frontend deployment needs separate hosting or a frontend container.

<!-- TODO: clarify production deployment topology with team -->
