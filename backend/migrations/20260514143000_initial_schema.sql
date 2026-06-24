-- +goose Up
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    website TEXT,
    industry TEXT,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resume_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    track TEXT NOT NULL CHECK (track IN ('backend', 'ai', 'quant', 'general')),
    file_path TEXT,
    content_text TEXT,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    resume_version_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    role_track TEXT NOT NULL CHECK (role_track IN ('backend', 'ai', 'quant', 'general')),
    source TEXT,
    status TEXT NOT NULL DEFAULT 'saved' CHECK (
        status IN (
            'saved',
            'applied',
            'online_assessment',
            'recruiter_screen',
            'technical_screen',
            'technical_screen_2',
            'technical_screen_3',
            'technical_screen_4',
            'onsite',
            'offer',
            'rejected',
            'withdrawn'
        )
    ),
    location TEXT,
    employment_type TEXT,
    job_url TEXT,
    applied_at TIMESTAMPTZ,
    deadline_at TIMESTAMPTZ,
    notes TEXT,
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector(
            'english',
            coalesce(title, '') || ' ' ||
            coalesce(role_track, '') || ' ' ||
            coalesce(source, '') || ' ' ||
            coalesce(location, '') || ' ' ||
            coalesce(employment_type, '') || ' ' ||
            coalesce(notes, '')
        )
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE job_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    extracted_keywords TEXT[] NOT NULL DEFAULT '{}',
    ai_summary TEXT,
    search_vector TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(raw_text, ''))
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    email TEXT,
    linkedin_url TEXT,
    relationship TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE interview_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    round_type TEXT NOT NULL CHECK (
        round_type IN (
            'recruiter',
            'online_assessment',
            'technical',
            'system_design',
            'behavioral',
            'final'
        )
    ),
    scheduled_at TIMESTAMPTZ,
    interviewer TEXT,
    notes TEXT,
    outcome TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')
    ),
    idempotency_key TEXT NOT NULL UNIQUE,
    retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    last_error TEXT,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reminder_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL UNIQUE,
    delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE failed_reminder_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reminder_id UUID REFERENCES reminders(id) ON DELETE SET NULL,
    error_message TEXT NOT NULL,
    retry_count INTEGER NOT NULL CHECK (retry_count >= 0),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    failed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_role_track ON applications(role_track);
CREATE INDEX idx_applications_company_id ON applications(company_id);
CREATE INDEX idx_applications_resume_version_id ON applications(resume_version_id);
CREATE INDEX idx_applications_search_vector ON applications USING GIN(search_vector);

CREATE INDEX idx_job_descriptions_application_id ON job_descriptions(application_id);
CREATE INDEX idx_job_descriptions_search_vector ON job_descriptions USING GIN(search_vector);

CREATE INDEX idx_contacts_company_id ON contacts(company_id);
CREATE INDEX idx_interview_rounds_application_id ON interview_rounds(application_id);

CREATE INDEX idx_reminders_application_id ON reminders(application_id);
CREATE INDEX idx_reminders_contact_id ON reminders(contact_id);
CREATE INDEX idx_reminders_status ON reminders(status);
CREATE INDEX idx_reminders_due_at ON reminders(due_at);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_reminder_deliveries_reminder_id ON reminder_deliveries(reminder_id);
CREATE INDEX idx_failed_reminder_jobs_reminder_id ON failed_reminder_jobs(reminder_id);

-- +goose Down
DROP TABLE IF EXISTS failed_reminder_jobs;
DROP TABLE IF EXISTS reminder_deliveries;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS interview_rounds;
DROP TABLE IF EXISTS contacts;
DROP TABLE IF EXISTS job_descriptions;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS resume_versions;
DROP TABLE IF EXISTS companies;

DROP EXTENSION IF EXISTS pgcrypto;
