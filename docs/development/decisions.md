# Decisions

Use this as a lightweight engineering journal. Add a short entry when a choice
would otherwise have to be rediscovered from code.

## Decision: Keep Docs Split By Mental Model

Status: accepted

Why:

- One giant doc becomes hard to revisit.
- Root docs cover onboarding topics. The `docs/` folder keeps deeper notes for
  schema, backend internals, workflow, worker behavior, testing, and decisions.
- Generated code is easier to understand when each doc has one job.

## Decision: Use A Service Layer For Business Rules

Status: accepted

Why:

- Handlers should stay focused on HTTP parsing and JSON responses.
- Application status transitions, audit logging, and reminder rules are business
  logic.
- Keeping rules in services makes unit tests easier and prevents duplicated
  validation across endpoints.

## Decision: Keep Application Status Changes Transactional

Status: accepted

Why:

- A status change without a matching audit log makes application history
  unreliable.
- The application update and audit insert should commit together or roll back
  together.

## Decision: Use PostgreSQL Constraints For Domain Enums

Status: accepted

Why:

- The initial schema uses check constraints for role tracks, application
  statuses, reminder statuses, and interview round types.
- This gives the database a final line of defense even if application validation
  has a bug.

## Decision: Keep Search In PostgreSQL First

Status: accepted for MVP

Why:

- The schema already defines generated `tsvector` columns and GIN indexes for
  applications and job descriptions.
- PostgreSQL full-text search is enough for the MVP and avoids adding another
  infrastructure dependency too early.

## Decision: Build The Frontend As An Operational App

Status: accepted

Why:

- CareerOS is a repeated-use job search tool, so the first screen should be the
  dashboard and working navigation.
- UI code should call `frontend/lib/api.ts` instead of scattering raw API URLs
  through pages.
- Product screens should prioritize dense, scannable workflows over marketing
  copy.
