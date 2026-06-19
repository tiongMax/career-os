package queries

import (
	"context"
)

func (q *Queries) CreateAuditLog(ctx context.Context, arg CreateAuditLogParams) (AuditLog, error) {
	row, err := q.CreateAuditLogSQL(ctx, arg)
	return auditLogFrom(row.ID, row.EntityType, row.EntityID, row.Action, row.OldValue, row.NewValue, row.CreatedAt), err
}

func (q *Queries) ListAuditLogsForEntity(ctx context.Context, entityType string, entityID string) ([]AuditLog, error) {
	rows, err := q.ListAuditLogsForEntitySQL(ctx, ListAuditLogsForEntitySQLParams{EntityType: entityType, EntityID: entityID})
	if err != nil {
		return nil, err
	}
	logs := make([]AuditLog, 0, len(rows))
	for _, row := range rows {
		logs = append(logs, auditLogFrom(row.ID, row.EntityType, row.EntityID, row.Action, row.OldValue, row.NewValue, row.CreatedAt))
	}
	return logs, nil
}
