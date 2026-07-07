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
            'withdrawn',
            'kiv'
        )
    );

-- +goose Down
UPDATE applications
SET status = 'withdrawn'
WHERE status = 'kiv';

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
            'withdrawn'
        )
    );
