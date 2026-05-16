-- name: CreateApplication :one
INSERT INTO applications (
    company_id,
    resume_version_id,
    title,
    role_track,
    source,
    status,
    location,
    employment_type,
    job_url,
    applied_at,
    deadline_at,
    notes
)
VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'saved'), $7, $8, $9, $10, $11, $12)
RETURNING *;

-- name: ListApplications :many
SELECT * FROM applications
ORDER BY created_at DESC;

-- name: GetApplication :one
SELECT * FROM applications
WHERE id = $1;

-- name: UpdateApplication :one
UPDATE applications
SET
    company_id = COALESCE($2, company_id),
    resume_version_id = COALESCE($3, resume_version_id),
    title = COALESCE($4, title),
    role_track = COALESCE($5, role_track),
    source = COALESCE($6, source),
    location = COALESCE($7, location),
    employment_type = COALESCE($8, employment_type),
    job_url = COALESCE($9, job_url),
    applied_at = COALESCE($10, applied_at),
    deadline_at = COALESCE($11, deadline_at),
    notes = COALESCE($12, notes),
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateApplicationStatus :one
UPDATE applications
SET status = $2, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteApplication :exec
DELETE FROM applications
WHERE id = $1;
