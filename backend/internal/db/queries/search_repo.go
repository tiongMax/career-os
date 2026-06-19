package queries

import (
	"context"
)

func (q *Queries) Search(ctx context.Context, query string) ([]SearchResult, error) {
	const sql = `
		SELECT 'application' AS type,
		       a.id::text    AS id,
		       a.title       AS title,
		       c.name        AS company,
		       ts_rank(a.search_vector, plainto_tsquery('english', $1)) AS rank
		FROM applications a
		JOIN companies c ON c.id = a.company_id
		WHERE a.search_vector @@ plainto_tsquery('english', $1)
		UNION ALL
		SELECT 'job_description' AS type,
		       a.id::text        AS id,
		       a.title           AS title,
		       c.name            AS company,
		       ts_rank(jd.search_vector, plainto_tsquery('english', $1)) AS rank
		FROM job_descriptions jd
		JOIN applications a ON a.id = jd.application_id
		JOIN companies c ON c.id = a.company_id
		WHERE jd.search_vector @@ plainto_tsquery('english', $1)
		ORDER BY rank DESC
		LIMIT 30`

	rows, err := q.db.Query(ctx, sql, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]SearchResult, 0)
	for rows.Next() {
		var typ, id, title, company string
		var rank float64
		if err := rows.Scan(&typ, &id, &title, &company, &rank); err != nil {
			return nil, err
		}
		r := SearchResult{Type: typ, ID: id, Title: title, Rank: rank}
		if company != "" {
			r.Company = &company
		}
		results = append(results, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}
