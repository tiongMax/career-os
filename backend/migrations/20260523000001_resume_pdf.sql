-- +goose Up
ALTER TABLE resume_versions ADD COLUMN IF NOT EXISTS pdf_data BYTEA;

-- +goose Down
ALTER TABLE resume_versions DROP COLUMN IF EXISTS pdf_data;
