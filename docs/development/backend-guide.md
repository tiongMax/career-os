# Backend Guide

The backend is a TypeScript service built with Fastify, Zod, Drizzle ORM,
PostgreSQL and functional dependency injection. It contains an HTTP API, an
AI-analysis worker, and a Goose-compatible migration runner.

## Directory Map

```text
backend/
  src/
    api/             Fastify server, errors, and route plugins
    app/             dependency composition
    commands/        API, worker, and migration entry points
    config/          Zod-validated environment configuration
    domain/          schemas, interfaces, and business rules
    infrastructure/  PostgreSQL, Gemini, and migrations
    persistence/     Drizzle repositories and schema mapping
    workers/         AI-analysis processor
  migrations/        authoritative SQL migration history
```

## Local Commands

From the repository root:

```sh
npm install --prefix backend
npm run migrate:up
npm run dev:api
npm run dev:worker
```

Verification:

```sh
npm run format:check:api:ts
npm run typecheck:api:ts
npm run lint:api:ts
npm run test:api:ts
npm run build:api
```

## API Startup

Entry point: `backend/src/commands/api.ts`.

Startup loads and validates configuration, opens PostgreSQL, composes
repositories and domain services, builds the Fastify server, and installs
graceful shutdown handlers. `API_HOST` and `API_PORT` control the listener.

Routes are Fastify plugins under `backend/src/api/routes`. Request bodies,
parameters, queries, and responses use Zod schemas through the Fastify Zod type
provider. The generated OpenAPI document and Swagger UI are served at
`/api/v1/openapi.yaml` and `/api/v1/docs`.

## Backend Layers

```text
HTTP request
  -> Fastify route + Zod contract
  -> domain service
  -> repository interface
  -> Drizzle repository
  -> PostgreSQL
```

- Routes own HTTP parsing, response mapping, and status codes.
- Domain factories own validation and business rules.
- Repository interfaces keep domain code independent from persistence.
- Drizzle repositories own queries, transactions, and row mapping.
- Infrastructure adapters own PostgreSQL and Gemini clients.

Prefer factory functions and plain objects for services and repositories.
Classes are reserved for errors or behavior that genuinely needs instance
identity or inheritance.

## Configuration

`backend/src/config/config.ts` validates environment variables with Zod and
applies local defaults. Do not read `process.env` throughout the application;
load configuration once at a command boundary and inject values into adapters.

## Migrations

Entry point: `backend/src/commands/migrate.ts`.

```sh
npm run migrate:up
npm run migrate:down
npm run migrate:status
```

Migration files remain in `backend/migrations` and retain the existing
`-- +goose Up` and `-- +goose Down` format. The TypeScript runner uses the
existing `goose_db_version` table, a PostgreSQL advisory lock, and one
transaction per migration, so databases previously migrated by Go Goose remain
compatible.

Do not use schema-push commands. Add a forward and reverse SQL section whenever
the persistent schema changes, then update the Drizzle schema mapping.

## Worker

Entry point: `backend/src/commands/worker.ts`.

When `GEMINI_API_KEY` is configured, the worker runs the AI-analysis processor.
AI analysis supports structured Gemini output, resume embedding ranking, JD
extraction persistence, retry handling, and graceful shutdown. Reminder and
follow-up attention is derived when the dashboard loads and does not use a
background worker.

Processor logic is kept independent from long-running loops so it can be tested
with plain fakes. Unit tests live beside worker modules; real repository coverage
is in `backend/src/persistence/postgres/repositories.integration.test.ts`.

## Deployment

`backend/Dockerfile` is a multi-stage Node 22 build. The production image
contains compiled JavaScript, production dependencies, and SQL migrations. In
the Compose `full` profile, the API container applies migrations before starting
the server, while the worker uses the same image with a different command.

The frontend is deployed separately from the backend image.
