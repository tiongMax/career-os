package queries

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

func (q *Queries) CreateFailedReminderJob(ctx context.Context, arg CreateFailedReminderJobParams) (FailedReminderJob, error) {
	row, err := q.CreateFailedReminderJobSQL(ctx, arg)
	return FailedReminderJob{ID: row.ID, ReminderID: ptrFromString(row.ReminderID), ErrorMessage: row.ErrorMessage, RetryCount: row.RetryCount, Payload: row.Payload, FailedAt: timeFrom(row.FailedAt)}, err
}

func (q *Queries) CreateRoleTrack(ctx context.Context, name string) (RoleTrack, error) {
	const sql = `INSERT INTO role_tracks (name) VALUES ($1) RETURNING id::text, name, created_at`
	var r RoleTrack
	var createdAt pgtype.Timestamptz
	err := q.db.QueryRow(ctx, sql, name).Scan(&r.ID, &r.Name, &createdAt)
	r.CreatedAt = timeFrom(createdAt)
	return r, err
}

func (q *Queries) ListRoleTracks(ctx context.Context) ([]RoleTrack, error) {
	const sql = `SELECT id::text, name, created_at FROM role_tracks ORDER BY name`
	rows, err := q.db.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tracks := make([]RoleTrack, 0)
	for rows.Next() {
		var r RoleTrack
		var createdAt pgtype.Timestamptz
		if err := rows.Scan(&r.ID, &r.Name, &createdAt); err != nil {
			return nil, err
		}
		r.CreatedAt = timeFrom(createdAt)
		tracks = append(tracks, r)
	}
	return tracks, rows.Err()
}
