-- name: CreateCompanySQL :one
INSERT INTO companies (name, website, industry, location, notes)
VALUES (
    sqlc.arg(name),
    sqlc.narg(website),
    sqlc.narg(industry),
    sqlc.narg(location),
    sqlc.narg(notes)
)
RETURNING id::text, name, website, industry, location, notes, created_at, updated_at;

-- name: ListCompaniesSQL :many
SELECT id::text, name, website, industry, location, notes, created_at, updated_at
FROM companies
ORDER BY created_at DESC
LIMIT 200;

-- name: GetCompanySQL :one
SELECT id::text, name, website, industry, location, notes, created_at, updated_at
FROM companies
WHERE id = sqlc.arg(id)::uuid;

-- name: UpdateCompanySQL :one
UPDATE companies
SET
    name = COALESCE(sqlc.narg(name), name),
    website = COALESCE(sqlc.narg(website), website),
    industry = COALESCE(sqlc.narg(industry), industry),
    location = COALESCE(sqlc.narg(location), location),
    notes = COALESCE(sqlc.narg(notes), notes),
    updated_at = now()
WHERE id = sqlc.arg(id)::uuid
RETURNING id::text, name, website, industry, location, notes, created_at, updated_at;

-- name: DeleteCompanyRowCount :execrows
DELETE FROM companies
WHERE id = sqlc.arg(id)::uuid;
