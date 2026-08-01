import { sql } from "drizzle-orm";
import { customType, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

export type CompanyRow = typeof companies.$inferSelect;
export type RoleTrackRow = typeof roleTracks.$inferSelect;
export type ResumeVersionRow = typeof resumeVersions.$inferSelect;
