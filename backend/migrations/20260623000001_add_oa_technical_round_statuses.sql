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
            'withdrawn'
        )
    );

-- +goose Down
UPDATE applications
SET status = 'technical_screen'
WHERE status IN ('technical_screen_2', 'technical_screen_3', 'technical_screen_4');

UPDATE applications
SET status = 'applied'
WHERE status = 'online_assessment';

ALTER TABLE applications
    DROP CONSTRAINT IF EXISTS applications_status_check,
    ADD CONSTRAINT applications_status_check CHECK (
        status IN (
            'saved',
            'applied',
            'recruiter_screen',
            'technical_screen',
            'onsite',
            'offer',
            'rejected',
            'withdrawn'
        )
    );
