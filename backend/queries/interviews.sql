-- name: CreateInterviewRoundSQL :one
INSERT INTO interview_rounds (application_id, round_type, scheduled_at, interviewer, notes, outcome)
VALUES (
    sqlc.arg(application_id)::uuid,
    sqlc.arg(round_type),
    sqlc.narg(scheduled_at),
    sqlc.narg(interviewer),
    sqlc.narg(notes),
    sqlc.narg(outcome)
)
RETURNING id::text, application_id::text, round_type, scheduled_at, interviewer, notes, outcome, created_at, updated_at;

-- name: ListInterviewRoundsByApplicationSQL :many
SELECT id::text, application_id::text, round_type, scheduled_at, interviewer, notes, outcome, created_at, updated_at
FROM interview_rounds
WHERE application_id = sqlc.arg(application_id)::uuid
ORDER BY scheduled_at NULLS LAST, created_at DESC;

-- name: UpdateInterviewRoundSQL :one
UPDATE interview_rounds
SET
    round_type = COALESCE(sqlc.narg(round_type), round_type),
    scheduled_at = COALESCE(sqlc.narg(scheduled_at), scheduled_at),
    interviewer = COALESCE(sqlc.narg(interviewer), interviewer),
    notes = COALESCE(sqlc.narg(notes), notes),
    outcome = COALESCE(sqlc.narg(outcome), outcome),
    updated_at = now()
WHERE id = sqlc.arg(id)::uuid
RETURNING id::text, application_id::text, round_type, scheduled_at, interviewer, notes, outcome, created_at, updated_at;

-- name: DeleteInterviewRoundRowCount :execrows
DELETE FROM interview_rounds
WHERE id = $1::uuid;
