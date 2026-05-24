-- name: CreateResumeVersionSQL :one
INSERT INTO resume_versions (name, track, tags)
VALUES (sqlc.arg(name), sqlc.arg(track), sqlc.arg(tags))
RETURNING id::text, name, track, tags, (pdf_data IS NOT NULL) AS has_pdf, created_at, updated_at;

-- name: ListResumeVersionsSQL :many
SELECT id::text, name, track, tags, (pdf_data IS NOT NULL) AS has_pdf, created_at, updated_at
FROM resume_versions
ORDER BY created_at DESC;

-- name: GetResumeVersionSQL :one
SELECT id::text, name, track, tags, (pdf_data IS NOT NULL) AS has_pdf, created_at, updated_at
FROM resume_versions
WHERE id = sqlc.arg(id)::uuid;

-- name: UpdateResumeVersionSQL :one
UPDATE resume_versions
SET
    name = COALESCE(sqlc.narg(name), name),
    track = COALESCE(sqlc.narg(track), track),
    tags = CASE WHEN sqlc.arg(set_tags)::boolean THEN sqlc.arg(tags) ELSE tags END,
    updated_at = now()
WHERE id = sqlc.arg(id)::uuid
RETURNING id::text, name, track, tags, (pdf_data IS NOT NULL) AS has_pdf, created_at, updated_at;

-- name: DeleteResumeVersionRowCount :execrows
DELETE FROM resume_versions
WHERE id = $1::uuid;
