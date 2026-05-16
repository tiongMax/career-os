-- name: CreateResumeVersion :one
INSERT INTO resume_versions (name, track, file_path, content_text, tags)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListResumeVersions :many
SELECT * FROM resume_versions
ORDER BY created_at DESC;

-- name: GetResumeVersion :one
SELECT * FROM resume_versions
WHERE id = $1;

-- name: UpdateResumeVersion :one
UPDATE resume_versions
SET
    name = COALESCE($2, name),
    track = COALESCE($3, track),
    file_path = COALESCE($4, file_path),
    content_text = COALESCE($5, content_text),
    tags = CASE WHEN $7 THEN $6 ELSE tags END,
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteResumeVersion :exec
DELETE FROM resume_versions
WHERE id = $1;
