# CareerOS Docs

This folder is the orientation layer for CareerOS. Use it when the generated
code starts feeling like a maze and you need a fast mental model before editing.

## Start Here

1. [Architecture](architecture.md) - the big picture: processes, dependencies,
   and request flow.
2. [Database Schema](database-schema.md) - tables, relationships, constraints,
   and delete behavior.
3. [Backend Guide](backend-guide.md) - how the Go backend is laid out and how
   runtime wiring works.
4. [Application Workflow](application-workflow.md) - status lifecycle and audit
   logging rules.

## Reference Docs

- [API Reference](api-reference.md) - endpoints that exist now, plus planned API
  groups from the PRD.
- [Frontend Guide](frontend-guide.md) - current frontend status and the intended
  shape once implementation starts.
- [Testing Guide](testing-guide.md) - how to think about unit, HTTP,
  integration, worker, and manual tests.
- [Decisions](decisions.md) - lightweight engineering journal for choices that
  should not get rediscovered later.

## Product Planning Docs

- [CareerOS Detailed PRD](CareerOS_Detailed_PRD.md)
- [CareerOS 1-Week Roadmap](CareerOS_1_Week_Roadmap.md)

## Documentation Rule

Keep these docs practical and truthful. If a feature is not implemented yet,
label it as planned instead of describing it as live behavior.
