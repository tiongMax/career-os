# Improvements Plan

Roadmap for hardening CareerOS as a backend-engineering portfolio piece. Items are ranked by **interview-conversation-value per hour of work** — what unlocks new technical talking points under questioning, not what adds product features.

The bones are good: clean handler -> service -> queries layering, idempotent reminder worker with retries and dead-lettering, transactional status state machine with audit logging, weighted PostgreSQL FTS, OpenAPI 3.1 spec, k6 thresholds. What's missing is the polish that signals "shipped to production" rather than "portfolio project."

## Tier 1 - Biggest gaps, do these first

### 1. Auth + multi-tenancy

**Effort:** 3-5 days. **Blast radius:** wide.

The API docs explicitly state "no authentication or authorization is currently implemented." This is the single most conspicuous hole in the codebase.

Scope:
- `users` table + signup/login endpoints
- Password hashing (argon2id or bcrypt)
- JWT or session-based auth middleware
- `user_id` foreign key on every domain entity (`companies`, `applications`, `resume_versions`, `job_descriptions`, `contacts`, `interview_rounds`, `reminders`, `role_tracks`)
- Migration that backfills existing rows under a default user
- Every query scoped by `user_id`
- Frontend login/signup flow

Interview surface this unlocks:
- Password hashing trade-offs (argon2id memory cost, bcrypt cost factor)
- JWT vs session, refresh tokens, revocation
- CSRF for sessions, not JWT
- Row-level access patterns vs Postgres RLS
- Tenant isolation testing

### 2. GitHub Actions CI

**Effort:** half a day. **Blast radius:** none.

A repo without CI in 2026 reads as "personal project." With CI, it reads as "engineer." Cheapest credibility you can buy.

Scope:
- `.github/workflows/ci.yml` running on PR + push to main
- Jobs: `go test ./... -race -cover`, `golangci-lint`, frontend `npm run build` + `npm run lint`
- Optional integration job spinning up Postgres + Redis services for `CAREEROS_INTEGRATION_DATABASE_URL` tests
- Coverage report uploaded as artifact
- Status badge in README

### 3. Run benchmarks, commit measured results

**Effort:** half a day.

The benchmarks README literally says "Record measured results in `docs/benchmark-results.md` (create as needed) before quoting numbers in the README or resume." So do it.

Scope:
- Seed 10K records via `make seed`
- Run all 5 k6 scripts against a local API
- Capture p50/p95/p99 latency per script
- Commit `docs/benchmark-results.md` with hardware spec, dataset size, dates, and raw output

Resume payoff: "enforces p95 thresholds" -> "sustained p95 of Xms at Y RPS over a 10K-record dataset."

## Tier 2 - High payoff for system-design conversations

### 4. Prometheus metrics

**Effort:** 1 day.

Expose `/metrics` and instrument:
- `http_request_duration_seconds` histogram (labels: route, method, status)
- `reminders_queue_depth` gauge (via `ZCARD reminders:scheduled` on tick)
- `reminders_retries_total` counter
- `reminders_dead_letters_total` counter
- `reminders_processed_total` counter (labels: outcome)
- pgx pool stats (in-use, idle, max)

Commit a Grafana dashboard JSON.

Unlocks: SLO talk pairs naturally with k6 thresholds, RED/USE method, queue depth as leading indicator vs DLQ as paging signal.

### 5. Test coverage to ~60%+ on services

**Effort:** 2-3 days.

Currently 10 test files for 62 Go files. Most interviewers grep that ratio. Focus on the services layer with table-driven tests:
- Status machine: every legal transition + every illegal one (the matrix in `docs/development/application-workflow.md`)
- Reminder retry/backoff math (the 30s -> 2m -> 5m schedule, DLQ at max retries)
- JD keyword scoring edge cases
- Reminder cancellation while in-flight

The existing worker tests are the model to copy.

### 6. Real email delivery in the reminder worker

**Effort:** 1 day.

The worker currently calls a "simulated delivery function." Your idempotency story is theoretical until there's a real side effect that duplicate delivery would create.

Scope:
- Postmark or Resend free-tier client
- Pluggable `Notifier` interface so tests still inject fakes
- Template for follow-up reminders
- Unsubscribe / opt-out token
- Config: `REMINDER_EMAIL_FROM`, `REMINDER_NOTIFIER_PROVIDER`

## Tier 3 - Polish that signals seniority

### 7. OpenTelemetry tracing

**Effort:** 1 day. One end-to-end trace: HTTP middleware -> service span -> pgx span -> Redis span. Even stdout exporter is fine. Unlocks request-correlation talk.

### 8. Rate limiting middleware

**Effort:** half a day. Per-user token bucket (Redis-backed since Redis is already in the stack). Pairs with auth from Tier 1.

### 9. Database indexing pass + EXPLAIN ANALYZE notes

**Effort:** half a day. Review every `WHERE` clause, run `EXPLAIN ANALYZE` against the 10K seeded dataset, document indexes + reasoning in `docs/development/database-notes.md`. Catch any sequential scans on hot paths.

### 10. Clean up TODO markers

**Effort:** 1 hour. Resolve or delete the `<!-- TODO -->` comments in `docs/reference/architecture.md` and `docs/reference/api.md`. They scream "unfinished" to a code reviewer.

## Tier 4 - README upgrade

**Effort:** 1-2 hours, parallel with everything else.

The README leads with "single-user job application operating system" - accurate but undersells the engineering. Rewrite so the first thing a reviewer sees is:

1. One-paragraph architecture summary emphasizing the engineering patterns
2. Architecture diagram (surface the mermaid diagram from `docs/reference/architecture.md`)
3. **Measured** benchmark numbers (after Tier 1.3)
4. "What this demonstrates" section with file links to the interesting bits (state machine, idempotent worker, audit logs, FTS)
5. CI badge

Recruiters spend ~30 seconds on a GitHub repo. Lead with the engineering.

## Recommended order (~2 weeks)

```
Week 1: Auth + multi-tenancy -> CI -> measured benchmarks -> README rewrite
Week 2: Prometheus + Grafana -> test coverage push -> real email -> indexing pass
```

After that, marginal resume gain per hour drops sharply. Tracing, rate limiting, etc. are diminishing returns once Tier 1+2 are done.

## Out of scope

Things deliberately **not** on this list:

- New domain features or endpoints. The project already covers plenty of surface area. Every additional CRUD route is wasted effort against the items above.
- Frontend polish. The frontend is sufficient to demonstrate full-stack range; making it pretty doesn't change the engineering conversation.
- Mobile responsive / native apps.
- AI / LLM features. Not relevant for a backend portfolio piece, and the deterministic keyword scoring is honest about what's there.
