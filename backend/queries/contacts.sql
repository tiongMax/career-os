-- name: CreateContactSQL :one
INSERT INTO contacts (company_id, name, role, email, linkedin_url, relationship, notes)
VALUES (
    sqlc.arg(company_id)::uuid,
    sqlc.arg(name),
    sqlc.narg(role),
    sqlc.narg(email),
    sqlc.narg(linkedin_url),
    sqlc.narg(relationship),
    sqlc.narg(notes)
)
RETURNING id::text, company_id::text, name, role, email, linkedin_url, relationship, notes, created_at, updated_at;

-- name: ListContactsSQL :many
SELECT id::text, company_id::text, name, role, email, linkedin_url, relationship, notes, created_at, updated_at
FROM contacts
ORDER BY created_at DESC;

-- name: GetContactSQL :one
SELECT id::text, company_id::text, name, role, email, linkedin_url, relationship, notes, created_at, updated_at
FROM contacts
WHERE id = sqlc.arg(id)::uuid;

-- name: UpdateContactSQL :one
UPDATE contacts
SET
    company_id = COALESCE(sqlc.narg(company_id)::uuid, company_id),
    name = COALESCE(sqlc.narg(name), name),
    role = COALESCE(sqlc.narg(role), role),
    email = COALESCE(sqlc.narg(email), email),
    linkedin_url = COALESCE(sqlc.narg(linkedin_url), linkedin_url),
    relationship = COALESCE(sqlc.narg(relationship), relationship),
    notes = COALESCE(sqlc.narg(notes), notes),
    updated_at = now()
WHERE id = sqlc.arg(id)::uuid
RETURNING id::text, company_id::text, name, role, email, linkedin_url, relationship, notes, created_at, updated_at;

-- name: DeleteContactRowCount :execrows
DELETE FROM contacts
WHERE id = $1::uuid;
