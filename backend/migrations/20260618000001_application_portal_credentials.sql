-- +goose Up
ALTER TABLE applications
    ADD COLUMN portal_account TEXT,
    ADD COLUMN portal_password TEXT;

-- +goose Down
ALTER TABLE applications
    DROP COLUMN IF EXISTS portal_password,
    DROP COLUMN IF EXISTS portal_account;
