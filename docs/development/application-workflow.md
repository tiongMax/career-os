# Application Workflow

Applications are the center of CareerOS. This doc explains the implemented
status lifecycle and where the code enforces it.

## Implementation

Application status rules are implemented in:

- `backend/internal/services/applications/status.go`
- `backend/internal/services/applications/service.go`
- `backend/internal/db/queries/applications.sql.go`
- `backend/internal/httpapi/applications.go`

## Status Values

| Status | Meaning |
| --- | --- |
| `saved` | The opportunity is tracked but not applied to yet. |
| `applied` | Application was submitted. |
| `online_assessment` | Online assessment is active. |
| `recruiter_screen` | Recruiter or initial screen is active. |
| `technical_screen` | First technical screen is active. |
| `technical_screen_2` | Second technical screen is active. |
| `technical_screen_3` | Third technical screen is active. |
| `technical_screen_4` | Fourth technical screen is active. |
| `onsite` | Final or multi-round interview stage is active. |
| `offer` | Offer received. |
| `rejected` | Company rejected or process ended negatively. |
| `withdrawn` | You withdrew or decided not to continue. |

Terminal statuses in the current state machine:

- `withdrawn`

`offer` is not terminal because the code allows it to move to `rejected` or
`withdrawn`.

## Transition Rules

| From | Allowed next statuses |
| --- | --- |
| `saved` | `applied`, `withdrawn` |
| `applied` | `online_assessment`, `recruiter_screen`, `technical_screen`, `rejected`, `withdrawn` |
| `online_assessment` | `recruiter_screen`, `technical_screen`, `rejected`, `withdrawn` |
| `recruiter_screen` | `online_assessment`, `technical_screen`, `rejected`, `withdrawn` |
| `technical_screen` | `technical_screen_2`, `onsite`, `rejected`, `withdrawn` |
| `technical_screen_2` | `technical_screen_3`, `onsite`, `rejected`, `withdrawn` |
| `technical_screen_3` | `technical_screen_4`, `onsite`, `rejected`, `withdrawn` |
| `technical_screen_4` | `onsite`, `rejected`, `withdrawn` |
| `onsite` | `offer`, `rejected`, `withdrawn` |
| `offer` | `withdrawn`, `rejected` |
| `rejected` | `saved`, `applied`, `online_assessment`, `recruiter_screen`, `technical_screen`, `technical_screen_2`, `technical_screen_3`, `technical_screen_4`, `onsite`, `offer`, `withdrawn` |
| `withdrawn` | none |

Invalid transitions return HTTP `409` from `PATCH /api/v1/applications/{id}/status`.

## Transactional Update Rule

Status changes should be all-or-nothing:

```text
begin transaction
  load current application status
  validate requested transition
  update applications.status and timestamps
  insert audit_logs row with old/new status
commit transaction
```

If any step fails, the query layer rolls back. A status change without an audit
log would make the history unreliable.

## Audit Log Shape

For status changes, use a predictable audit event:

```json
{
  "entity_type": "application",
  "entity_id": "<application uuid>",
  "action": "status_changed",
  "old_value": {
    "status": "applied"
  },
  "new_value": {
    "status": "technical_screen",
    "received_at": "2026-06-23T00:00:00Z",
    "completed_at": "2026-06-25T00:00:00Z"
  }
}
```

`received_at` is optional for company-response statuses such as
`online_assessment`, `recruiter_screen`, `technical_screen*`, `onsite`, `offer`,
and `rejected`. `completed_at` is optional for completable stages such as
`online_assessment`, `technical_screen*`, and `onsite`. Recording allowed dates
for the current status without changing the status writes a
`status_dates_recorded` audit event with the same `new_value` shape.

The `audit_logs` table is intentionally generic, so consistency in
`entity_type` and `action` strings matters.

## Layering

Keep the workflow split like this:

```text
backend/internal/services/applications/status.go
backend/internal/services/applications/service.go
backend/internal/httpapi/applications.go
backend/queries/applications.sql
```

Keep validation in the service. The HTTP handler should parse input and return
the service result.

## Test Checklist

Coverage should include:

- Valid forward transitions.
- Invalid skipped transitions.
- Terminal statuses reject further changes.
- Rejected applications can be reopened while still writing audit history.
- Audit log is written on success.
- No audit log is written when transition validation fails.
- Transaction rolls back if audit insert fails.
