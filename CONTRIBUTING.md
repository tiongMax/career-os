# Contributing

## Development Setup

Install dependencies and prepare local infrastructure:

```sh
npm install
npm install --prefix backend
npm install --prefix frontend
cp .env.example .env
docker compose up -d postgres
make migrate-up
```

Run the application:

```sh
npm run build:api
npm run dev
```

Or run each process separately:

```sh
make api
make worker
npm run dev --prefix frontend
```

## Branching and PR Conventions

Existing branch names use short prefixes:

- `feat/...` for new features.
- `fix/...` for bug fixes.
- `refactor/...` for internal restructuring.
- `docs/...` for documentation.

Recent commit messages mostly follow conventional style, for example:

```text
feat: add OpenAPI 3.1 spec and Swagger UI at /api/v1/docs
refactor frontend shared UI primitives
fix/source-location-combobox
```

Recommended convention:

```text
feat: add application filters
fix: handle missing resume PDF
docs: update API examples
refactor: split HTTP handlers
```

Open PRs from a focused branch into `main`. Keep PRs scoped to one feature, fix, or refactor, and include tests or a manual verification note when behavior changes.

<!-- TODO: clarify required PR reviewers, CI checks, and merge strategy with team. -->

## Tests

Run backend tests:

```sh
make test
```

Equivalent command:

```sh
npm run test --prefix backend
```

Run frontend lint:

```sh
npm run lint --prefix frontend
```

Run frontend build:

```sh
npm run build --prefix frontend
```

Run integration tests that require PostgreSQL:

```sh
$env:CAREEROS_INTEGRATION_DATABASE_URL="postgres://postgres:postgres@localhost:5433/careeros?sslmode=disable"
npm run test --prefix backend -- repositories.integration.test.ts
```

Run benchmarks, if k6 is installed:

```sh
make bench-search
make bench-mixed
```

## Code Style

Backend:

- Keep Fastify routes thin. Put validation and workflow rules in `backend/src/domain` and persistence behavior in repositories.
- Define request and response contracts with Zod and keep route plugins under `backend/src/api/routes`.
- Use Drizzle queries, transactions, and explicit schema mappings in `backend/src/persistence`.
- Load configuration through `loadConfig()` instead of scattered environment lookups.
- Return JSON errors in the existing `{ "error": "..." }` shape.
- Run format, typecheck, lint, tests, and the production build before opening a PR.

Frontend:

- Keep raw API calls in `frontend/lib/api.ts`.
- Keep shared domain labels and constants under `frontend/lib/domain`.
- Use existing UI primitives and Tailwind conventions before adding new component patterns.
- Prefer route-level data loading in App Router pages when data can be fetched server-side.
- Run `npm run lint --prefix frontend` after UI changes.

Database:

- Add schema changes as versioned, Goose-compatible SQL migrations in
  `backend/migrations`.
- Keep the Drizzle schema mapping aligned with SQL migrations.
- Prefer backward-compatible migrations when possible.

## Documentation

Update the relevant docs when behavior changes:

- `README.md` for setup and common workflows.
- `docs/reference/architecture.md` for structural changes.
- `docs/reference/api.md` for endpoint or schema changes.
- `docs/reference/environment.md` for configuration changes.
- `docs/reference/database-schema.md` for database changes.
- `docs/development/*` for implementation workflow and testing notes.

Additional detailed notes can live under `docs/`.
