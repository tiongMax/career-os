-- name: CreateAuditLog :one
INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value)
VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
RETURNING *;

-- name: ListAuditLogsForEntity :many
SELECT * FROM audit_logs
WHERE entity_type = $1 AND entity_id = $2
ORDER BY created_at DESC;
