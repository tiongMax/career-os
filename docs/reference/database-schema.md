# Database Schema

The source of truth is `backend/migrations/`. This doc explains the tables in
plain English so you can understand the domain before reading SQL.

## Mental Model

```text
companies
  -> applications
       -> job_descriptions
       -> interview_rounds
       -> reminders
       -> audit_logs by entity_type/entity_id

companies
  -> contacts
       -> reminders

resume_versions
  -> applications

role_tracks
  -> applications

reminders
  -> reminder_deliveries
  -> failed_reminder_jobs
```

## Tables

### `companies`

Stores organizations you may apply to.

Important fields:

- `name` is required.
- `website`, `industry`, `location`, and `notes` are optional descriptive
  metadata.
- `created_at` and `updated_at` exist on all main domain tables.

Relationships:

- One company can have many applications.
- One company can have many contacts.

Delete behavior:

- Applications use `ON DELETE RESTRICT`, so a company cannot be deleted while it
  still has applications.
- Contacts use `ON DELETE CASCADE`, so deleting a company deletes its contacts.

### `resume_versions`

Stores versions of your resume.

Important fields:

- `name` labels the resume version.
- `track` must be one of `backend`, `ai`, `quant`, or `general`.
- `tags` is a text array for flexible labels.
- `pdf_data` stores an optional uploaded resume PDF.

Relationships:

- One resume version can be attached to many applications.

Delete behavior:

- Applications use `ON DELETE SET NULL`, so removing a resume version preserves
  the application record.

### `applications`

The core table. Each row is one job opportunity or application.

Important fields:

- `company_id` is required.
- `resume_version_id` is optional.
- `title` is required.
- `role_track` references `role_tracks.name`.
- `status` defaults to `saved`.
- `portal_account` and `portal_password` optionally store the account details
  used for an application portal. Treat these as sensitive local data.
- `applied_at` and `deadline_at` track key dates.
- `search_vector` is a generated PostgreSQL full-text search column.

Allowed statuses:

- `saved`
- `applied`
- `recruiter_screen`
- `technical_screen`
- `onsite`
- `offer`
- `rejected`
- `withdrawn`

Delete behavior:

- Deleting an application cascades to job descriptions, interview rounds, and
  reminders.

### `role_tracks`

Stores role track names available to applications.

Important fields:

- `name` is required and unique.
- Default seed rows include `backend`, `ai`, `quant`, `general`, `fullstack`,
  and `platform`.

Relationships:

- `applications.role_track` references `role_tracks.name`.

### `job_descriptions`

Stores the job description text for an application.

Important fields:

- `application_id` is required.
- `raw_text` stores the original JD.
- `extracted_keywords` stores deterministic or AI-assisted keywords.
- `ai_summary` stores a later summary.
- `search_vector` enables full-text search over the raw JD.

Delete behavior:

- Deleted automatically when the application is deleted.

### `contacts`

Stores people connected to a company.

Important fields:

- `company_id` is required.
- `name` is required.
- `role`, `email`, `linkedin_url`, `relationship`, and `notes` are optional.

Relationships:

- A reminder can optionally point to a contact.

Delete behavior:

- Deleted automatically when the company is deleted.
- Reminders use `ON DELETE SET NULL` for `contact_id`, so deleting a contact
  keeps the reminder.

### `interview_rounds`

Stores interview or assessment rounds for an application.

Important fields:

- `application_id` is required.
- `round_type` must be one of `recruiter`, `online_assessment`, `technical`,
  `system_design`, `behavioral`, or `final`.
- `scheduled_at`, `interviewer`, `notes`, and `outcome` are optional.

Delete behavior:

- Deleted automatically when the application is deleted.

### `reminders`

Stores scheduled follow-ups, deadlines, and reminder tasks.

Important fields:

- `application_id` is required.
- `contact_id` is optional.
- `title` and `due_at` are required.
- `status` defaults to `pending`.
- `idempotency_key` is required and unique.
- `retry_count`, `last_error`, and `delivered_at` support worker reliability.

Allowed statuses:

- `pending`
- `processing`
- `sent`
- `failed`
- `cancelled`

Delete behavior:

- Deleted automatically when the application is deleted.
- Keeps existing reminder rows if the optional contact is deleted.

### `audit_logs`

Stores history events for important entity changes.

Important fields:

- `entity_type` identifies the table or domain entity.
- `entity_id` points to the changed row.
- `action` names the change.
- `old_value` and `new_value` store JSON snapshots.

Important note:

- There is no foreign key from audit logs to every possible entity table.
  Instead, lookup uses `(entity_type, entity_id)`.

### `reminder_deliveries`

Records successful reminder deliveries.

Important fields:

- `reminder_id` is required.
- `idempotency_key` is required and unique.
- `delivered_at` records when delivery happened.

Delete behavior:

- Deleted automatically when the reminder is deleted.

### `failed_reminder_jobs`

Stores failed reminder delivery attempts for debugging and retry analysis.

Important fields:

- `reminder_id` is optional because it uses `ON DELETE SET NULL`.
- `error_message` is required.
- `retry_count` records how many attempts had happened.
- `payload` stores JSON context about the failure.
- `failed_at` records when the failure was written.

## Indexes

High-signal indexes:

- `idx_applications_status` for filtering by workflow state.
- `idx_applications_role_track` for track dashboards.
- `idx_applications_company_id` and `idx_applications_resume_version_id` for
  joins.
- `idx_applications_search_vector` for full-text application search.
- `idx_job_descriptions_search_vector` for full-text JD search.
- `idx_reminders_status` and `idx_reminders_due_at` for worker polling.
- `idx_audit_logs_entity` for entity history lookup.

## Schema Design Notes

- UUID primary keys are generated with `pgcrypto` and `gen_random_uuid()`.
- Main tables keep `created_at` and `updated_at`, but the migration does not yet
  define automatic `updated_at` triggers.
- Search vectors are generated columns, which keeps search data consistent with
  row content.
- Application role tracks are configurable through `role_tracks`; other enum-like
  values still use PostgreSQL check constraints.
