package queries

import "context"

type CreateAuditLogParams struct {
	EntityType string `json:"entity_type"`
	EntityID   string `json:"entity_id"`
	Action     string `json:"action"`
	OldValue   []byte `json:"old_value"`
	NewValue   []byte `json:"new_value"`
}

func (q *Queries) CreateAuditLog(ctx context.Context, arg CreateAuditLogParams) (AuditLog, error) {
	row := q.db.QueryRow(ctx, `
		INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value)
		VALUES ($1, $2::uuid, $3, $4::jsonb, $5::jsonb)
		RETURNING id::text, entity_type, entity_id::text, action, old_value, new_value, created_at
	`, arg.EntityType, arg.EntityID, arg.Action, arg.OldValue, arg.NewValue)
	return scanAuditLog(row)
}

func (q *Queries) ListAuditLogsForEntity(ctx context.Context, entityType string, entityID string) ([]AuditLog, error) {
	rows, err := q.db.Query(ctx, `
		SELECT id::text, entity_type, entity_id::text, action, old_value, new_value, created_at
		FROM audit_logs
		WHERE entity_type = $1 AND entity_id = $2::uuid
		ORDER BY created_at DESC
	`, entityType, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []AuditLog
	for rows.Next() {
		log, err := scanAuditLog(rows)
		if err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}
	return logs, rows.Err()
}

type auditLogScanner interface {
	Scan(dest ...any) error
}

func scanAuditLog(row auditLogScanner) (AuditLog, error) {
	var log AuditLog
	err := row.Scan(
		&log.ID,
		&log.EntityType,
		&log.EntityID,
		&log.Action,
		&log.OldValue,
		&log.NewValue,
		&log.CreatedAt,
	)
	return log, err
}
