# Testing Guide

The TypeScript backend uses Vitest for unit and repository integration tests,
plus TypeScript, ESLint, Prettier, and production compilation as required gates.

## Standard Verification

From the repository root:

```sh
npm run format:check:api:ts
npm run typecheck:api:ts
npm run lint:api:ts
npm run test:api:ts
npm run build:api
```

`make test` runs the backend Vitest suite. `make test-go` remains available as
a temporary compatibility check until the legacy source is deleted.

## Unit Tests

Unit tests live beside their modules and use plain object fakes. They cover:

- Zod configuration and request validation.
- Domain validation and application status transitions.
- Route status codes and JSON contracts through Fastify injection.
- Reminder retry, idempotency, and dead-letter behavior.
- AI-analysis retry, embedding ranking, and JD extraction persistence.
- Goose-format migration parsing.

Run one file with:

```sh
npm run test --prefix backend -- analysis-worker.test.ts
```

## PostgreSQL Integration Tests

Real Drizzle repository tests are opt-in through
`CAREEROS_INTEGRATION_DATABASE_URL` so the default suite stays fast:

```sh
CAREEROS_INTEGRATION_DATABASE_URL=postgres://postgres:postgres@localhost:5433/careeros?sslmode=disable \
  npm run test --prefix backend -- repositories.integration.test.ts
```

On PowerShell, set the variable for the command session before running Vitest.
Integration tests create uniquely named records and remove them in `finally`
blocks.

## Migration Tests

Parser behavior is covered by unit tests. Before changing migration execution,
also verify `up`, `status`, `down`, and `up` against a fresh disposable database.
Never test `down` against a database containing user data.

## Runtime Smoke Tests

After a production build, start the compiled API or the Compose `full` profile
and verify at least:

- `/api/v1/health` reports PostgreSQL and Redis as healthy.
- A representative create/get/delete workflow reaches PostgreSQL.
- The worker starts and shuts down without leaving jobs processing.
- The API container applies pending migrations before listening.

## Test Design

- Test domain behavior without a database when possible.
- Use Fastify injection for HTTP contracts.
- Use real PostgreSQL for SQL, transactions, constraints, and row mapping.
- Keep time, providers, queues, and external AI calls injectable.
- Assert observable outcomes instead of private implementation details.
