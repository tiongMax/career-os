import { sql } from "drizzle-orm";
import {
  integer,
  customType,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  website: text("website"),
  industry: text("industry"),
  location: text("location"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const roleTracks = pgTable("role_tracks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const resumeVersions = pgTable("resume_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  track: text("track").notNull(),
  filePath: text("file_path"),
  contentText: text("content_text"),
  tags: text("tags")
    .array()
    .default(sql`'{}'::text[]`)
    .notNull(),
  pdfData: bytea("pdf_data"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "restrict" }),
  resumeVersionId: uuid("resume_version_id").references(
    () => resumeVersions.id,
    { onDelete: "set null" },
  ),
  title: text("title").notNull(),
  roleTrack: text("role_track").notNull(),
  source: text("source"),
  status: text("status").default("applied").notNull(),
  location: text("location"),
  employmentType: text("employment_type"),
  jobUrl: text("job_url"),
  portalAccount: text("portal_account"),
  portalPassword: text("portal_password"),
  appliedAt: timestamp("applied_at", { withTimezone: true, mode: "date" }),
  deadlineAt: timestamp("deadline_at", { withTimezone: true, mode: "date" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const applicationRoleTracks = pgTable(
  "application_role_tracks",
  {
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    roleTrack: text("role_track")
      .notNull()
      .references(() => roleTracks.name),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.applicationId, table.roleTrack] })],
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  email: text("email"),
  linkedinUrl: text("linkedin_url"),
  relationship: text("relationship"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const interviewRounds = pgTable("interview_rounds", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  roundType: text("round_type").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true, mode: "date" }),
  interviewer: text("interviewer"),
  notes: text("notes"),
  outcome: text("outcome"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const jobDescriptions = pgTable("job_descriptions", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  rawText: text("raw_text").notNull(),
  extractedKeywords: text("extracted_keywords")
    .array()
    .default(sql`'{}'::text[]`)
    .notNull(),
  aiSummary: text("ai_summary"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const reminders = pgTable("reminders", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  contactId: uuid("contact_id").references(() => contacts.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at", { withTimezone: true, mode: "date" }).notNull(),
  status: text("status").default("pending").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  retryCount: integer("retry_count").default(0).notNull(),
  lastError: text("last_error"),
  deliveredAt: timestamp("delivered_at", {
    withTimezone: true,
    mode: "date",
  }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const reminderDeliveries = pgTable("reminder_deliveries", {
  id: uuid("id").defaultRandom().primaryKey(),
  reminderId: uuid("reminder_id")
    .notNull()
    .references(() => reminders.id, { onDelete: "cascade" }),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  deliveredAt: timestamp("delivered_at", {
    withTimezone: true,
    mode: "date",
  })
    .defaultNow()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const failedReminderJobs = pgTable("failed_reminder_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  reminderId: uuid("reminder_id").references(() => reminders.id, {
    onDelete: "set null",
  }),
  errorMessage: text("error_message").notNull(),
  retryCount: integer("retry_count").notNull(),
  payload: jsonb("payload").default({}).notNull(),
  failedAt: timestamp("failed_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export const analysisJobs = pgTable("analysis_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id")
    .notNull()
    .references(() => applications.id, { onDelete: "cascade" }),
  jobType: text("job_type").notNull(),
  status: text("status").default("queued").notNull(),
  inputSnapshot: jsonb("input_snapshot").default({}).notNull(),
  result: jsonb("result"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0).notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
    .defaultNow()
    .notNull(),
});

export type CompanyRow = typeof companies.$inferSelect;
export type RoleTrackRow = typeof roleTracks.$inferSelect;
export type ResumeVersionRow = typeof resumeVersions.$inferSelect;
export type ApplicationRow = typeof applications.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
export type ContactRow = typeof contacts.$inferSelect;
export type InterviewRoundRow = typeof interviewRounds.$inferSelect;
export type JobDescriptionRow = typeof jobDescriptions.$inferSelect;
export type ReminderRow = typeof reminders.$inferSelect;
