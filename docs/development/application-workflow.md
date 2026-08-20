# Application Workflow

Applications are the center of CareerOS. This doc explains the implemented
status lifecycle and where the code enforces it.

## Implementation

Application status rules are implemented in:

- `backend/src/features/applications/application.service.ts`
- `backend/src/features/applications/application.repository.ts`
- `backend/src/features/applications/application.routes.ts`

## Status Values

| Status | Meaning |
| --- | --- |
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
| `ghosted` | The company stopped responding before the process formally ended. |
| `withdrawn` | You withdrew or decided not to continue. |
| `kiv` | Application is paused indefinitely but may resume later. |

Terminal statuses in the current state machine:

- `withdrawn`

`offer`, `rejected`, `ghosted`, and `kiv` are not terminal because the workflow
allows an application to resume or move to another final state.

## Transition Rules

| From | Allowed next statuses |
| --- | --- |
| `applied` | `online_assessment`, `recruiter_screen`, `technical_screen`, `rejected`, `ghosted`, `withdrawn`, `kiv` |
| `online_assessment` | `recruiter_screen`, `technical_screen`, `rejected`, `ghosted`, `withdrawn`, `kiv` |
| `recruiter_screen` | `online_assessment`, `technical_screen`, `rejected`, `ghosted`, `withdrawn`, `kiv` |
| `technical_screen` | `technical_screen_2`, `onsite`, `rejected`, `ghosted`, `withdrawn`, `kiv` |
| `technical_screen_2` | `technical_screen_3`, `onsite`, `rejected`, `ghosted`, `withdrawn`, `kiv` |
| `technical_screen_3` | `technical_screen_4`, `onsite`, `rejected`, `ghosted`, `withdrawn`, `kiv` |
| `technical_screen_4` | `onsite`, `rejected`, `ghosted`, `withdrawn`, `kiv` |
| `onsite` | `offer`, `rejected`, `ghosted`, `withdrawn`, `kiv` |
| `offer` | `withdrawn`, `rejected`, `ghosted`, `kiv` |
| `rejected` | `applied`, `online_assessment`, `recruiter_screen`, `technical_screen`, `technical_screen_2`, `technical_screen_3`, `technical_screen_4`, `onsite`, `offer`, `ghosted`, `withdrawn`, `kiv` |
| `ghosted` | `applied`, `online_assessment`, `recruiter_screen`, `technical_screen`, `technical_screen_2`, `technical_screen_3`, `technical_screen_4`, `onsite`, `offer`, `rejected`, `withdrawn`, `kiv` |
| `kiv` | `applied`, `online_assessment`, `recruiter_screen`, `technical_screen`, `technical_screen_2`, `technical_screen_3`, `technical_screen_4`, `onsite`, `offer`, `rejected`, `ghosted`, `withdrawn` |
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
backend/src/features/applications/application.service.ts
backend/src/features/applications/application.repository.ts
backend/src/features/applications/application.routes.ts
backend/src/database/schema.ts
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
