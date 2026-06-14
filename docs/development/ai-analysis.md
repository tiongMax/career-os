# AI Analysis Jobs

CareerOS can run Gemini-backed analysis jobs for an application. The feature is
designed as an async worker flow instead of a direct request/response call, so
the UI stays responsive while Gemini generates the result.

## What It Does

The application page has an AI Analysis panel with three job types:

| Job type | Purpose | Output |
| --- | --- | --- |
| `resume_match` | Compares the job description with saved resume versions. | Recommended resume, match score, matched skills, missing skills, resume feedback, interview focus, and semantic embedding matches. |
| `jd_extract` | Extracts useful structure from a raw job description. | Keywords, core requirements, responsibilities, seniority, and summary. Keywords and summary are written back to the job description. |
| `prep_brief` | Generates interview preparation material. | Prep plan, talking points, suggested questions, matched skills, missing skills, and interview focus. |

## How It Works

1. The frontend calls `POST /api/v1/applications/{id}/ai-analysis-jobs`.
2. The API stores a row in `analysis_jobs` with status `queued`.
3. The worker polls for queued jobs.
4. The worker gathers the application, company, job description, and resume
   versions needed for the job.
5. Gemini generates structured JSON output. For resume matching, Gemini
   embeddings are also used to compare resume text against the job description.
6. The worker stores the JSON result and marks the job `completed`.
7. The frontend refreshes the application page and displays the result.

If Gemini fails, the worker retries the job up to `AI_ANALYSIS_MAX_RETRIES`.
After the final failure, the job is marked `failed` with the last error message.

## Configuration

Copy `.env.example` to `.env`, then set:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
GEMINI_TIMEOUT_MS=90000
AI_ANALYSIS_WORKER_POLL_INTERVAL_MS=1000
AI_ANALYSIS_MAX_RETRIES=3
```

If `GEMINI_API_KEY` is empty, the API still starts, but the worker skips AI
analysis processing.

## Run Locally

From the repo root:

```sh
npm run build:api
npm run dev
```

This starts PostgreSQL, Redis, migrations, the API, the worker, and the frontend.

Open:

```text
http://localhost:3000/applications
```

Then open an application detail page and use the AI Analysis panel.

## Manual Test Checklist

1. Create or open a resume version with meaningful `content_text`.
2. Create or open an application with a job description.
3. Open the application detail page.
4. Click `Resume Match`.
5. Wait for the job status to become `completed`.
6. Confirm the result shows a recommended resume, match score, matched skills,
   missing skills, feedback, and interview focus.
7. Click `JD Extract` and confirm keywords/summary are returned.
8. Click `Prep Brief` and confirm talking points and questions are returned.

## Automated Testing Notes

Normal automated tests do not call the real Gemini API. They use local/mocked
behavior so test runs stay fast, deterministic, and free from quota or network
failures.

Use real Gemini calls through the app for manual verification, or add an
explicit opt-in integration test that only runs when `GEMINI_API_KEY` is set.
