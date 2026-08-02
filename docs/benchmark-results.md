# Dashboard benchmark results

## 2026-08-02 local production benchmark — 1,000 requests

These measurements compare the former dashboard API fan-out with the consolidated,
Redis-backed dashboard endpoint. They are evidence for this repository, not a claim
that every deployment will have identical latency.

### Conditions

- Windows development machine
- Node.js 24.11.1
- Local PostgreSQL 16 and Redis 7 Docker containers
- 52 applications in the local database
- One warm-up request followed by 1,000 sequential measured requests per path
- Next.js production build for the page measurement
- Command: `node benchmarks/dashboard.mjs`

### Results

| Path                                  | Average |  Median |      p95 |     Min |      Max |
| ------------------------------------- | ------: | ------: | -------: | ------: | -------: |
| Legacy five-API fan-out               | 5.56 ms | 5.20 ms |  7.25 ms | 3.92 ms | 36.85 ms |
| Consolidated dashboard API, Redis hit | 0.96 ms | 0.93 ms |  1.25 ms | 0.72 ms |  8.53 ms |
| Server-rendered dashboard page        | 9.68 ms | 8.96 ms | 14.09 ms | 7.34 ms | 29.02 ms |

The cached API path was 82.7% faster on average than the legacy API fan-out in this
run. The endpoint also reduced the dashboard from five HTTP requests to one and
returned `X-Cache: HIT` for all 1,000 measured optimized API requests.

The previously proposed resume figures of 1.8 seconds and 90 milliseconds were not
observed and should not be quoted. A defensible bullet from this run is:

> Reduced average dashboard data-fetch latency by 82.7% (5.56 ms to 0.96 ms across
> 1,000 benchmark requests) by consolidating five API calls into an indexed dashboard
> read model and adding Redis caching.

For a stronger production claim, rerun the same script against a production-like
deployment and representative dataset, then append those results here.
