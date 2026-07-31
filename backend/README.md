# CareerOS TypeScript Backend

The TypeScript backend is being migrated incrementally alongside the existing
Go service. The Go API remains the default runtime until the final cutover.

## Foundation commands

Install dependencies from the repository root:

```sh
npm install --prefix backend
```

Run the TypeScript API with the repository `.env` file:

```sh
npm run dev:api:ts
```

Run the verification gates:

```sh
npm run typecheck:api:ts
npm run lint:api:ts
npm run test:api:ts
npm run build:api:ts
```

The TypeScript API currently exposes the foundation endpoints:

- `GET /api/v1/health`
- `GET /api/v1/openapi.yaml`
- `GET /api/v1/docs`

PostgreSQL migrations in `migrations/` remain the authoritative database
schema history. Do not use schema-push workflows during the migration.
