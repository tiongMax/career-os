import { sql } from "drizzle-orm";
import { customType, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const roleTracks = pgTable("role_tracks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const resumeVersions = pgTable("resume_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  track: text("track").notNull(),
  filePath: text("file_path"),
  contentText: text("content_text"),
  tags: text("tags").array().default(sql`'{}'::text[]`).notNull(),
  pdfData: bytea("pdf_data"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "restrict" }),
  resumeVersionId: uuid("resume_version_id").references(() => resumeVersions.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  roleTrack: text("role_track").notNull(),
  source: text("source"),
  status: text("status").default("saved").notNull(),
  location: text("location"),
  employmentType: text("employment_type"),
  jobUrl: text("job_url"),
  portalAccount: text("portal_account"),
  portalPassword: text("portal_password"),
  appliedAt: timestamp("applied_at", { withTimezone: true, mode: "date" }),
  deadlineAt: timestamp("deadline_at", { withTimezone: true, mode: "date" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export const applicationRoleTracks = pgTable(
  "application_role_tracks",
  {
    applicationId: uuid("application_id").notNull().references(() => applications.id, { onDelete: "cascade" }),
    roleTrack: text("role_track").notNull().references(() => roleTracks.name),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
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
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
});

export type CompanyRow = typeof companies.$inferSelect;
export type RoleTrackRow = typeof roleTracks.$inferSelect;
export type ResumeVersionRow = typeof resumeVersions.$inferSelect;
export type ApplicationRow = typeof applications.$inferSelect;
export type AuditLogRow = typeof auditLogs.$inferSelect;
