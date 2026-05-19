-- name: CreateApplicationSQL :one
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
VALUES (
    sqlc.arg(company_id)::uuid,
    sqlc.narg(resume_version_id)::uuid,
    sqlc.arg(title),
    sqlc.arg(role_track),
    sqlc.narg(source),
    COALESCE(sqlc.narg(status), 'saved'),
    sqlc.narg(location),
    sqlc.narg(employment_type),
    sqlc.narg(job_url),
    sqlc.narg(applied_at),
    sqlc.narg(deadline_at),
    sqlc.narg(notes)
)
RETURNING id::text, company_id::text, COALESCE(resume_version_id::text, '') AS resume_version_id, title, role_track, source,
    status, location, employment_type, job_url, applied_at, deadline_at, notes, created_at, updated_at;

-- name: ListApplicationsSQL :many
SELECT id::text, company_id::text, COALESCE(resume_version_id::text, '') AS resume_version_id, title, role_track, source,
    status, location, employment_type, job_url, applied_at, deadline_at, notes, created_at, updated_at
FROM applications
ORDER BY created_at DESC;

-- name: GetApplicationSQL :one
SELECT id::text, company_id::text, COALESCE(resume_version_id::text, '') AS resume_version_id, title, role_track, source,
    status, location, employment_type, job_url, applied_at, deadline_at, notes, created_at, updated_at
FROM applications
WHERE id = sqlc.arg(id)::uuid;

-- name: UpdateApplicationSQL :one
UPDATE applications
SET
    company_id = COALESCE(sqlc.narg(company_id)::uuid, company_id),
    resume_version_id = COALESCE(sqlc.narg(resume_version_id)::uuid, resume_version_id),
    title = COALESCE(sqlc.narg(title), title),
    role_track = COALESCE(sqlc.narg(role_track), role_track),
    source = COALESCE(sqlc.narg(source), source),
    location = COALESCE(sqlc.narg(location), location),
    employment_type = COALESCE(sqlc.narg(employment_type), employment_type),
    job_url = COALESCE(sqlc.narg(job_url), job_url),
    applied_at = COALESCE(sqlc.narg(applied_at), applied_at),
    deadline_at = COALESCE(sqlc.narg(deadline_at), deadline_at),
    notes = COALESCE(sqlc.narg(notes), notes),
    updated_at = now()
WHERE id = sqlc.arg(id)::uuid
RETURNING id::text, company_id::text, COALESCE(resume_version_id::text, '') AS resume_version_id, title, role_track, source,
    status, location, employment_type, job_url, applied_at, deadline_at, notes, created_at, updated_at;

-- name: UpdateApplicationStatusSQL :one
UPDATE applications
SET status = sqlc.arg(status), updated_at = now()
WHERE id = sqlc.arg(id)::uuid
RETURNING id::text, company_id::text, COALESCE(resume_version_id::text, '') AS resume_version_id, title, role_track, source,
    status, location, employment_type, job_url, applied_at, deadline_at, notes, created_at, updated_at;

-- name: DeleteApplicationRowCount :execrows
DELETE FROM applications
WHERE id = $1::uuid;
