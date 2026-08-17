-- +goose Up
ALTER TABLE applications
    DROP CONSTRAINT IF EXISTS applications_status_check,
    ADD CONSTRAINT applications_status_check CHECK (
        status IN (
            'saved',
            'applied',
            'online_assessment',
            'recruiter_screen',
            'technical_screen',
            'technical_screen_2',
            'technical_screen_3',
            'technical_screen_4',
            'onsite',
            'offer',
            'rejected',
            'ghosted',
            'withdrawn',
            'kiv'
        )
    );

DROP INDEX IF EXISTS applications_deadline_active_idx;
CREATE INDEX applications_deadline_active_idx
    ON applications (deadline_at)
    WHERE deadline_at IS NOT NULL
      AND status NOT IN ('offer', 'rejected', 'ghosted', 'withdrawn', 'kiv');

-- +goose Down
UPDATE applications
SET status = 'rejected'
WHERE status = 'ghosted';

ALTER TABLE applications
    DROP CONSTRAINT IF EXISTS applications_status_check,
    ADD CONSTRAINT applications_status_check CHECK (
        status IN (
            'saved',
            'applied',
            'online_assessment',
            'recruiter_screen',
            'technical_screen',
            'technical_screen_2',
            'technical_screen_3',
            'technical_screen_4',
            'onsite',
            'offer',
            'rejected',
            'withdrawn',
            'kiv'
        )
    );

DROP INDEX IF EXISTS applications_deadline_active_idx;
CREATE INDEX applications_deadline_active_idx
    ON applications (deadline_at)
    WHERE deadline_at IS NOT NULL
      AND status NOT IN ('offer', 'rejected', 'withdrawn', 'kiv');
