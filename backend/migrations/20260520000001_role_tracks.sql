-- +goose Up
CREATE TABLE role_tracks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO role_tracks (name) VALUES
    ('backend'),
    ('ai'),
    ('quant'),
    ('general'),
    ('fullstack'),
    ('platform');

ALTER TABLE applications
    DROP CONSTRAINT applications_role_track_check;

ALTER TABLE applications
    ADD CONSTRAINT applications_role_track_fk
    FOREIGN KEY (role_track) REFERENCES role_tracks(name);

-- +goose Down
ALTER TABLE applications DROP CONSTRAINT applications_role_track_fk;

ALTER TABLE applications
    ADD CONSTRAINT applications_role_track_check
    CHECK (role_track IN ('backend', 'ai', 'quant', 'general'));

DROP TABLE role_tracks;
