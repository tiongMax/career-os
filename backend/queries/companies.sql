-- name: CreateCompany :one
INSERT INTO companies (name, website, industry, location, notes)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: ListCompanies :many
SELECT * FROM companies
ORDER BY created_at DESC;

-- name: GetCompany :one
SELECT * FROM companies
WHERE id = $1;

-- name: UpdateCompany :one
UPDATE companies
SET
    name = COALESCE($2, name),
    website = COALESCE($3, website),
    industry = COALESCE($4, industry),
    location = COALESCE($5, location),
    notes = COALESCE($6, notes),
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteCompany :exec
DELETE FROM companies
WHERE id = $1;
