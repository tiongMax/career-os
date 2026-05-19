-- name: CreateJobDescriptionSQL :one
INSERT INTO job_descriptions (application_id, raw_text, extracted_keywords, ai_summary)
VALUES (
    sqlc.arg(application_id)::uuid,
    sqlc.arg(raw_text),
    COALESCE(sqlc.arg(extracted_keywords), '{}'),
    sqlc.narg(ai_summary)
)
RETURNING id::text, application_id::text, raw_text, extracted_keywords, ai_summary, created_at, updated_at;

-- name: GetJobDescriptionByApplicationSQL :one
SELECT id::text, application_id::text, raw_text, extracted_keywords, ai_summary, created_at, updated_at
FROM job_descriptions
WHERE application_id = sqlc.arg(application_id)::uuid
ORDER BY created_at DESC
LIMIT 1;

-- name: UpdateJobDescriptionSQL :one
UPDATE job_descriptions
SET
    raw_text = COALESCE(sqlc.narg(raw_text), raw_text),
    extracted_keywords = CASE WHEN sqlc.arg(set_keywords)::boolean THEN sqlc.arg(extracted_keywords) ELSE extracted_keywords END,
    ai_summary = COALESCE(sqlc.narg(ai_summary), ai_summary),
    updated_at = now()
WHERE id = sqlc.arg(id)::uuid
RETURNING id::text, application_id::text, raw_text, extracted_keywords, ai_summary, created_at, updated_at;
