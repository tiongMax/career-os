# Application Workflow

Applications are the center of CareerOS. This doc explains the intended status
lifecycle and where the code should enforce it.

## Current Implementation Status

The database already constrains application status values, but the service-layer
state machine is not implemented yet.

Implemented now:

- `applications.status` column.
- Status check constraint.
- `audit_logs` table.

Planned:

- Application service layer.
- Allowed status transition validation.
- Transactional status update plus audit log insert.
- Tests for valid and invalid transitions.

## Status Values

| Status | Meaning |
| --- | --- |
| `saved` | The opportunity is tracked but not applied to yet. |
| `applied` | Application was submitted. |
| `recruiter_screen` | Recruiter or initial screen is active. |
| `technical_screen` | Technical phone screen or assessment is active. |
| `onsite` | Final or multi-round interview stage is active. |
| `offer` | Offer received. |
| `rejected` | Company rejected or process ended negatively. |
| `withdrawn` | You withdrew or decided not to continue. |

Terminal statuses:

- `offer`
- `rejected`
- `withdrawn`

## Recommended Transition Rules

Use these as the starting service rules unless the product direction changes:

| From | Allowed next statuses |
| --- | --- |
| `saved` | `applied`, `withdrawn` |
| `applied` | `recruiter_screen`, `technical_screen`, `rejected`, `withdrawn` |
| `recruiter_screen` | `technical_screen`, `onsite`, `rejected`, `withdrawn` |
| `technical_screen` | `onsite`, `offer`, `rejected`, `withdrawn` |
| `onsite` | `offer`, `rejected`, `withdrawn` |
| `offer` | none |
| `rejected` | none |
| `withdrawn` | none |

If you later want to reopen terminal applications, add that deliberately as a
new decision in `decisions.md`.

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

If any step fails, roll back. A status change without an audit log would make the
history unreliable.

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
    "status": "technical_screen"
  }
}
```

The `audit_logs` table is intentionally generic, so consistency in
`entity_type` and `action` strings matters.

## Where This Should Live

Recommended future layout:

```text
backend/internal/services/applications.go
backend/internal/http/applications.go
backend/queries/applications.sql
```

Keep validation in the service. The HTTP handler should parse input and return
the service result.

## Test Checklist

When implemented, test at least:

- Valid forward transitions.
- Invalid skipped transitions.
- Terminal statuses reject further changes.
- Audit log is written on success.
- No audit log is written when transition validation fails.
- Transaction rolls back if audit insert fails.
