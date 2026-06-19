package postgres

import (
	"context"
	"strings"
)

func (q *Queries) listApplicationTracks(ctx context.Context, applicationID, fallback string) ([]string, error) {
	const sql = `SELECT role_track FROM application_role_tracks WHERE application_id = $1::uuid ORDER BY role_track`
	rows, err := q.db.Query(ctx, sql, applicationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	tracks := make([]string, 0)
	for rows.Next() {
		var track string
		if err := rows.Scan(&track); err != nil {
			return nil, err
		}
		tracks = append(tracks, track)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(tracks) == 0 {
		tracks = normalizeApplicationTracks(fallback, nil)
	}
	return tracks, nil
}

func (q *Queries) replaceApplicationTracks(ctx context.Context, applicationID string, tracks []string) error {
	if _, err := q.db.Exec(ctx, `DELETE FROM application_role_tracks WHERE application_id = $1::uuid`, applicationID); err != nil {
		return err
	}
	for _, track := range tracks {
		if _, err := q.db.Exec(ctx, `INSERT INTO application_role_tracks (application_id, role_track) VALUES ($1::uuid, $2)`, applicationID, track); err != nil {
			return err
		}
	}
	return nil
}

func normalizeApplicationTracks(primary string, tracks []string) []string {
	seen := make(map[string]struct{}, len(tracks)+1)
	normalized := make([]string, 0, len(tracks)+1)
	add := func(track string) {
		track = strings.TrimSpace(strings.ToLower(track))
		if track == "" {
			return
		}
		if _, ok := seen[track]; ok {
			return
		}
		seen[track] = struct{}{}
		normalized = append(normalized, track)
	}
	for _, track := range tracks {
		add(track)
	}
	if len(normalized) == 0 {
		add(primary)
	}
	return normalized
}
