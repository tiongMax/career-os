# CareerOS

CareerOS is a single-user job application operating system for tracking companies, applications, resume versions, job descriptions, contacts, interviews, reminders, search, and analytics.

The project includes a Go REST API, a Next.js frontend, PostgreSQL persistence, Redis-backed reminder scheduling, database migrations, and k6 benchmark scripts.

## Tech Stack

| Area | Technology |
| --- | --- |
| Backend | Go 1.24, Chi, pgx, Goose, go-redis, zerolog |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, lucide-react |
| Database | PostgreSQL 16 |
| Queue/cache | Redis 7 |
| Tooling | Docker Compose, Make, sqlc layout, k6 benchmarks |

## Prerequisites

- Go 1.24 or newer
- Node.js and npm
- Docker Desktop or compatible Docker Compose runtime
- Make, optional but recommended
- k6, optional for benchmark scripts

## Setup

```sh
npm install
npm install --prefix frontend
cp .env.example .env
docker compose up -d postgres redis
make migrate-up
```

The default `.env.example` connects the API to PostgreSQL on `localhost:5433` and Redis on `localhost:6379`.

## Run Locally

Run the backend and frontend together:

```sh
npm run build:api
npm run dev
```

This starts Docker infrastructure, loads `.env`, runs the compiled API, and starts the Next.js dev server.

Run processes separately:

```sh
make api
make worker
npm run dev --prefix frontend
```

Default URLs:

- Frontend: `http://localhost:3000`
- API: `http://localhost:8080/api/v1`
- Swagger UI: `http://localhost:8080/api/v1/docs`
- OpenAPI spec: `http://localhost:8080/api/v1/openapi.yaml`

Run the full Docker Compose API/worker stack:

```sh
docker compose --profile full up --build
```

## Common Commands

```sh
make migrate-up       # Apply database migrations
make migrate-down     # Roll back one migration
make seed             # Run seed command
make test             # Run Go tests
npm run lint --prefix frontend
npm run build --prefix frontend
make bench-search     # Run k6 search benchmark
make bench-mixed      # Run k6 mixed workload benchmark
```

## Basic Usage

Check service health:

```sh
curl http://localhost:8080/api/v1/health
```

Create a company:

```sh
curl -X POST http://localhost:8080/api/v1/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Example Corp",
    "website": "https://example.com",
    "industry": "Software"
  }'
```

Create an application after you have a company ID:

```sh
curl -X POST http://localhost:8080/api/v1/applications \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "00000000-0000-4000-8000-000000000000",
    "title": "Backend Engineer",
    "role_track": "backend",
    "source": "company_site",
    "status": "saved"
  }'
```

## Documentation

- [Documentation Index](docs/README.md)
- [Architecture](docs/reference/architecture.md)
- [API Reference](docs/reference/api.md)
- [AI Analysis Jobs](docs/development/ai-analysis.md)
- [Environment Variables](docs/reference/environment.md)
- [Contributing](CONTRIBUTING.md)
