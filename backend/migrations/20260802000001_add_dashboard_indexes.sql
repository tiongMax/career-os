-- +goose Up
CREATE INDEX IF NOT EXISTS applications_updated_at_idx
    ON applications (updated_at DESC);

CREATE INDEX IF NOT EXISTS applications_deadline_active_idx
    ON applications (deadline_at)
    WHERE deadline_at IS NOT NULL
      AND status NOT IN ('offer', 'rejected', 'withdrawn', 'kiv');

CREATE INDEX IF NOT EXISTS reminders_pending_due_at_idx
    ON reminders (due_at)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS interview_rounds_scheduled_at_idx
    ON interview_rounds (scheduled_at)
    WHERE scheduled_at IS NOT NULL;

-- +goose Down
DROP INDEX IF EXISTS interview_rounds_scheduled_at_idx;
DROP INDEX IF EXISTS reminders_pending_due_at_idx;
DROP INDEX IF EXISTS applications_deadline_active_idx;
DROP INDEX IF EXISTS applications_updated_at_idx;
