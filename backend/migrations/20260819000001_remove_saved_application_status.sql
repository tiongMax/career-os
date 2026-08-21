-- +goose Up
UPDATE applications
SET status = 'applied',
    applied_at = COALESCE(applied_at, created_at),
    updated_at = now()
WHERE status = 'saved';

ALTER TABLE applications
    ALTER COLUMN status SET DEFAULT 'applied',
    DROP CONSTRAINT IF EXISTS applications_status_check,
    ADD CONSTRAINT applications_status_check CHECK (
        status IN (
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

-- +goose Down
ALTER TABLE applications
    ALTER COLUMN status SET DEFAULT 'saved',
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
