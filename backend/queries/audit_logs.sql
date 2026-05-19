-- name: CreateAuditLogSQL :one
INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value)
VALUES (
    sqlc.arg(entity_type),
    sqlc.arg(entity_id)::uuid,
    sqlc.arg(action),
    sqlc.narg(old_value)::jsonb,
    sqlc.narg(new_value)::jsonb
)
RETURNING id::text, entity_type, entity_id::text, action, old_value, new_value, created_at;

-- name: ListAuditLogsForEntitySQL :many
SELECT id::text, entity_type, entity_id::text, action, old_value, new_value, created_at
FROM audit_logs
WHERE entity_type = sqlc.arg(entity_type) AND entity_id = sqlc.arg(entity_id)::uuid
ORDER BY created_at DESC;
