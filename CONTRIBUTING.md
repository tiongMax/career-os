# Contributing

## Development Setup

Install dependencies and prepare local infrastructure:

```sh
npm install
npm install --prefix frontend
cp .env.example .env
docker compose up -d postgres redis
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
go test ./...
```

Run coverage:

```sh
go test ./... -cover
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
go test ./backend/internal/services/applications
```

Run benchmarks, if k6 is installed:

```sh
make bench-search
make bench-mixed
```

## Code Style

Backend:

- Keep HTTP handlers thin. Put validation, workflow rules, transactions, and scheduling behavior in `backend/internal/services`.
- Keep SQL in `backend/internal/db/queries` or `backend/queries`.
- Use parameterized SQL and explicit column lists.
- Use `config.Load()` for runtime configuration instead of scattered environment lookups.
- Return JSON errors in the existing `{ "error": "..." }` shape.
- Run `gofmt` on changed Go files.

Frontend:

- Keep raw API calls in `frontend/lib/api.ts`.
- Keep shared domain labels and constants under `frontend/lib/domain`.
- Use existing UI primitives and Tailwind conventions before adding new component patterns.
- Prefer route-level data loading in App Router pages when data can be fetched server-side.
- Run `npm run lint --prefix frontend` after UI changes.

Database:

- Add schema changes as Goose migrations in `backend/migrations`.
- Keep generated/sqlc-style queries aligned with schema changes.
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
