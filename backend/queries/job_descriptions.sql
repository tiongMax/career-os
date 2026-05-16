-- name: CreateJobDescription :one
INSERT INTO job_descriptions (application_id, raw_text, extracted_keywords, ai_summary)
VALUES ($1, $2, COALESCE($3, '{}'), $4)
RETURNING *;

-- name: GetJobDescriptionByApplication :one
SELECT * FROM job_descriptions
WHERE application_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: UpdateJobDescription :one
UPDATE job_descriptions
SET
    raw_text = COALESCE($2, raw_text),
    extracted_keywords = CASE WHEN $4 THEN $3 ELSE extracted_keywords END,
    ai_summary = COALESCE($5, ai_summary),
    updated_at = now()
WHERE id = $1
RETURNING *;
