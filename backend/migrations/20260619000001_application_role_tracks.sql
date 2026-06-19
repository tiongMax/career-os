-- +goose Up
CREATE TABLE application_role_tracks (
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    role_track     TEXT NOT NULL REFERENCES role_tracks(name),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (application_id, role_track)
);

INSERT INTO application_role_tracks (application_id, role_track)
SELECT id, role_track
FROM applications
ON CONFLICT DO NOTHING;

CREATE INDEX idx_application_role_tracks_role_track ON application_role_tracks(role_track);

-- +goose Down
DROP TABLE application_role_tracks;
