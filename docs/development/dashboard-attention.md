# Dashboard Attention

CareerOS surfaces work when the dashboard loads. It does not need a scheduling
queue or notification worker for this workflow: the frontend fetches the
consolidated dashboard API, which derives the current attention list from
PostgreSQL and caches the bounded snapshot briefly in Redis.

## Rules

Applications are ranked using these signals:

1. Overdue manual reminders and overdue deadlines.
2. Upcoming deadlines and interviews.
3. Applications in `applied` for at least 7 days without a response status.
4. Active applications unchanged for at least 14 days.
5. Active applications without a linked resume version.

Only the highest-priority reason is shown for each application. Final statuses
(`offer`, `rejected`, `withdrawn`, and `kiv`) and saved applications are excluded
from follow-up and stale rules.

## Manual Reminders

Manual reminders are stored in PostgreSQL. A pending reminder remains pending
and appears on the dashboard when due; opening the application does not mutate
the reminder. Cancelling a reminder removes it from attention calculations.

Existing delivery and failed-job tables remain in the schema for compatibility
with databases created by earlier versions, but no runtime worker writes to
them.

## Runtime

The dashboard runtime uses PostgreSQL plus Redis for its short-lived read cache.
Redis is not a reminder queue; the background worker is reserved for optional
Gemini-backed AI analysis jobs.
