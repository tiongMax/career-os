# Benchmarks

k6 load tests for the CareerOS API. They exercise the search, application, and
reminder paths against a running instance with seeded data.

## Prerequisites

1. [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) installed and on `PATH`.
2. The API running locally (`make api`) on `http://localhost:8080`.
3. Seed data loaded (`make seed`). The scripts pull real company and
   application IDs at start-up — an empty database will fail fast.

## Running

```sh
# Default base URL is http://localhost:8080
make bench-search
make bench-mixed

# Override the target
BASE_URL=http://localhost:8080 k6 run benchmarks/k6/create-application.js
k6 run benchmarks/k6/reminder-create.js
k6 run benchmarks/k6/status-update.js
```

## Scripts

| Script | What it exercises | p95 threshold |
|---|---|---|
| `search.js` | `GET /search?q=...` with weighted FTS queries | 100 ms |
| `create-application.js` | `POST /applications` against random seeded companies | 150 ms |
| `status-update.js` | `PATCH /applications/{id}/status` through the legal transitions | 100 ms |
| `reminder-create.js` | `POST /reminders` scheduled 1–10 minutes out | 150 ms |
| `mixed-workload.js` | Reads (search, list, analytics) interleaved with writes | per-tag |

Each script defines `thresholds` so a CI run fails when latency regresses.

## Targets

Targets are aspirational against the seeded data set described in
`docs/product/prd.md` §21:

| Area | Target |
|---|---|
| Search latency | p95 < 100 ms over 10,000 seeded records |
| Application creation | p95 < 150 ms |
| Status update | p95 < 100 ms |
| Reminder creation | p95 < 150 ms |

Record measured results in `docs/benchmark-results.md` (create as needed) before
quoting numbers in the README or résumé.
