package queries

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
)

// GetAnalyticsSummary returns aggregate counts and rates for the dashboard summary.
func (q *Queries) GetAnalyticsSummary(ctx context.Context) (AnalyticsSummary, error) {
	const sql = `
		SELECT
			COUNT(*)                                                                                                     AS total,
			COUNT(*) FILTER (WHERE status IN ('applied','recruiter_screen','technical_screen','onsite','offer'))         AS active,
			COUNT(*) FILTER (WHERE status IN ('recruiter_screen','technical_screen','onsite','offer','rejected'))        AS responded,
			COUNT(*) FILTER (WHERE status = 'offer')                                                                     AS offers
		FROM applications`

	var total, active, responded, offers int64
	err := q.db.QueryRow(ctx, sql).Scan(&total, &active, &responded, &offers)
	if err != nil {
		return AnalyticsSummary{}, err
	}

	var pendingReminders int64
	err = q.db.QueryRow(ctx, `SELECT COUNT(*) FROM reminders WHERE status = 'pending'`).Scan(&pendingReminders)
	if err != nil {
		return AnalyticsSummary{}, err
	}

	var responseRate, offerRate float64
	if total > 0 {
		responseRate = float64(responded) / float64(total) * 100
		offerRate = float64(offers) / float64(total) * 100
	}

	return AnalyticsSummary{
		Total:            total,
		Active:           active,
		Responded:        responded,
		Offers:           offers,
		ResponseRate:     responseRate,
		OfferRate:        offerRate,
		PendingReminders: pendingReminders,
	}, nil
}

// GetApplicationCountByStatus returns application counts grouped by status.
func (q *Queries) GetApplicationCountByStatus(ctx context.Context) ([]StatusCount, error) {
	const sql = `
		SELECT status, COUNT(*) AS count
		FROM applications
		GROUP BY status
		ORDER BY count DESC`

	rows, err := q.db.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]StatusCount, 0)
	for rows.Next() {
		var sc StatusCount
		if err := rows.Scan(&sc.Status, &sc.Count); err != nil {
			return nil, err
		}
		results = append(results, sc)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

// GetApplicationCountByTrack returns application counts grouped by role track.
func (q *Queries) GetApplicationCountByTrack(ctx context.Context) ([]TrackCount, error) {
	const sql = `
		SELECT role_track, COUNT(*) AS count
		FROM applications
		GROUP BY role_track
		ORDER BY count DESC`

	rows, err := q.db.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]TrackCount, 0)
	for rows.Next() {
		var tc TrackCount
		if err := rows.Scan(&tc.Track, &tc.Count); err != nil {
			return nil, err
		}
		results = append(results, tc)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

// GetResumeVersionPerformance returns per-resume-version application and interview metrics.
func (q *Queries) GetResumeVersionPerformance(ctx context.Context) ([]ResumeVersionPerformance, error) {
	const sql = `
		SELECT
			rv.id::text                                                                                                    AS id,
			rv.name                                                                                                        AS name,
			rv.track                                                                                                       AS track,
			COUNT(DISTINCT a.id)                                                                                           AS applications,
			COUNT(DISTINCT a.id) FILTER (WHERE a.status IN ('recruiter_screen','technical_screen','onsite','offer','rejected')) AS responses,
			COUNT(DISTINCT ir.id)                                                                                          AS interviews,
			COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'offer')                                                         AS offers
		FROM resume_versions rv
		LEFT JOIN applications a ON a.resume_version_id = rv.id
		LEFT JOIN interview_rounds ir ON ir.application_id = a.id
		GROUP BY rv.id, rv.name, rv.track
		ORDER BY applications DESC`

	rows, err := q.db.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]ResumeVersionPerformance, 0)
	for rows.Next() {
		var rvp ResumeVersionPerformance
		if err := rows.Scan(&rvp.ID, &rvp.Name, &rvp.Track, &rvp.Applications, &rvp.Responses, &rvp.Interviews, &rvp.Offers); err != nil {
			return nil, err
		}
		if rvp.Applications > 0 {
			rvp.ResponseRate = float64(rvp.Responses) / float64(rvp.Applications) * 100
			rvp.OfferRate = float64(rvp.Offers) / float64(rvp.Applications) * 100
		}
		results = append(results, rvp)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

// GetSourcePerformance returns application and response metrics grouped by source.
func (q *Queries) GetSourcePerformance(ctx context.Context) ([]SourcePerformance, error) {
	const sql = `
		SELECT
			COALESCE(source, 'unknown')                                                                                    AS source,
			COUNT(*)                                                                                                       AS applications,
			COUNT(*) FILTER (WHERE status IN ('recruiter_screen','technical_screen','onsite','offer','rejected'))          AS responses,
			COUNT(*) FILTER (WHERE status = 'offer')                                                                       AS offers
		FROM applications
		GROUP BY COALESCE(source, 'unknown')
		ORDER BY applications DESC`

	rows, err := q.db.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]SourcePerformance, 0)
	for rows.Next() {
		var sp SourcePerformance
		if err := rows.Scan(&sp.Source, &sp.Applications, &sp.Responses, &sp.Offers); err != nil {
			return nil, err
		}
		if sp.Applications > 0 {
			sp.ResponseRate = float64(sp.Responses) / float64(sp.Applications) * 100
		}
		results = append(results, sp)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

// GetApplicationFunnel returns ordered counts for each status stage.
func (q *Queries) GetApplicationFunnel(ctx context.Context) ([]FunnelStep, error) {
	const sql = `
		SELECT
			COUNT(*) FILTER (WHERE status = 'saved')             AS saved,
			COUNT(*) FILTER (WHERE status = 'applied')           AS applied,
			COUNT(*) FILTER (WHERE status = 'recruiter_screen')  AS recruiter_screen,
			COUNT(*) FILTER (WHERE status = 'technical_screen')  AS technical_screen,
			COUNT(*) FILTER (WHERE status = 'onsite')            AS onsite,
			COUNT(*) FILTER (WHERE status = 'offer')             AS offer
		FROM applications`

	var saved, applied, recruiterScreen, technicalScreen, onsite, offer int64
	err := q.db.QueryRow(ctx, sql).Scan(&saved, &applied, &recruiterScreen, &technicalScreen, &onsite, &offer)
	if err != nil {
		return nil, err
	}

	return []FunnelStep{
		{Stage: "saved", Count: saved},
		{Stage: "applied", Count: applied},
		{Stage: "recruiter_screen", Count: recruiterScreen},
		{Stage: "technical_screen", Count: technicalScreen},
		{Stage: "onsite", Count: onsite},
		{Stage: "offer", Count: offer},
	}, nil
}

// GetUpcomingInterviews returns the next 10 future interview rounds with application and company info.
func (q *Queries) GetUpcomingInterviews(ctx context.Context) ([]UpcomingInterview, error) {
	const sql = `
		SELECT
			ir.id::text          AS id,
			ir.round_type        AS round_type,
			ir.scheduled_at      AS scheduled_at,
			a.title              AS application_title,
			c.name               AS company_name
		FROM interview_rounds ir
		JOIN applications a ON a.id = ir.application_id
		JOIN companies c ON c.id = a.company_id
		WHERE ir.scheduled_at > now()
		ORDER BY ir.scheduled_at ASC
		LIMIT 10`

	rows, err := q.db.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]UpcomingInterview, 0)
	for rows.Next() {
		var ui UpcomingInterview
		var scheduledAt pgtype.Timestamptz
		if err := rows.Scan(&ui.ID, &ui.RoundType, &scheduledAt, &ui.ApplicationTitle, &ui.CompanyName); err != nil {
			return nil, err
		}
		if scheduledAt.Valid {
			t := scheduledAt.Time
			ui.ScheduledAt = &t
		}
		results = append(results, ui)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

// GetUpcomingPendingReminders returns the next 10 pending future reminders with application title.
func (q *Queries) GetUpcomingPendingReminders(ctx context.Context) ([]UpcomingReminder, error) {
	const sql = `
		SELECT
			r.id::text   AS id,
			r.title      AS title,
			r.due_at     AS due_at,
			a.title      AS application_title
		FROM reminders r
		JOIN applications a ON a.id = r.application_id
		WHERE r.status = 'pending' AND r.due_at > now()
		ORDER BY r.due_at ASC
		LIMIT 10`

	rows, err := q.db.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	results := make([]UpcomingReminder, 0)
	for rows.Next() {
		var ur UpcomingReminder
		var dueAt pgtype.Timestamptz
		if err := rows.Scan(&ur.ID, &ur.Title, &dueAt, &ur.ApplicationTitle); err != nil {
			return nil, err
		}
		ur.DueAt = dueAt.Time
		results = append(results, ur)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return results, nil
}

