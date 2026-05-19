-- name: CreateResumeVersionSQL :one
INSERT INTO resume_versions (name, track, file_path, content_text, tags)
VALUES (sqlc.arg(name), sqlc.arg(track), sqlc.narg(file_path), sqlc.narg(content_text), sqlc.arg(tags))
RETURNING id::text, name, track, file_path, content_text, tags, created_at, updated_at;

-- name: ListResumeVersionsSQL :many
SELECT id::text, name, track, file_path, content_text, tags, created_at, updated_at
FROM resume_versions
ORDER BY created_at DESC;

-- name: GetResumeVersionSQL :one
SELECT id::text, name, track, file_path, content_text, tags, created_at, updated_at
FROM resume_versions
WHERE id = sqlc.arg(id)::uuid;

-- name: UpdateResumeVersionSQL :one
UPDATE resume_versions
SET
    name = COALESCE(sqlc.narg(name), name),
    track = COALESCE(sqlc.narg(track), track),
    file_path = COALESCE(sqlc.narg(file_path), file_path),
    content_text = COALESCE(sqlc.narg(content_text), content_text),
    tags = CASE WHEN sqlc.arg(set_tags)::boolean THEN sqlc.arg(tags) ELSE tags END,
    updated_at = now()
WHERE id = sqlc.arg(id)::uuid
RETURNING id::text, name, track, file_path, content_text, tags, created_at, updated_at;

-- name: DeleteResumeVersionRowCount :execrows
DELETE FROM resume_versions
WHERE id = $1::uuid;
