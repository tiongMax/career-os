# CareerOS Docs

Start at the repo root when setting up the app:

- [README](../README.md) - setup, commands, and basic usage.
- [Contributing](../CONTRIBUTING.md) - development workflow and conventions.

This folder keeps the reference, development, and product docs.

## Reference

- [Architecture](reference/architecture.md) - system structure and runtime flow.
- [API Reference](reference/api.md) - implemented endpoints and examples.
- [Database Schema](reference/database-schema.md) - tables, relationships, constraints,
  and delete behavior.

## Development

- [Backend Guide](development/backend-guide.md) - backend layout, layers, runtime wiring,
  migrations, and worker process.
- [Application Workflow](development/application-workflow.md) - application statuses,
  transition rules, and audit logging.
- [Reminder Worker](development/reminder-worker.md) - Redis scheduling, delivery,
  retries, and dead-lettering.
- [Testing Guide](development/testing-guide.md) - unit, HTTP, integration, worker, and
  manual testing notes.

## Product

- [Roadmap](product/roadmap.md)

## Documentation Rule

Keep docs practical and current. Put stable reference material in
`docs/reference/`, implementation guidance in `docs/development/`, and planning
material in `docs/product/`.
