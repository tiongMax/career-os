import { and, asc, desc, eq, sql } from "drizzle-orm";

import type { Application } from "../../domain/applications/application.js";
import type {
  JobDescriptionsRepository,
  PrepContext,
} from "../../domain/job-descriptions/job-description.js";
import type { Database } from "../../infrastructure/postgres.js";
import { EntityNotFoundError } from "./errors.js";
import {
  applicationRoleTracks,
  applications,
  auditLogs,
  companies,
  contacts,
  interviewRounds,
  jobDescriptions,
  resumeVersions,
} from "./schema.js";

const resumeSelection = {
  id: resumeVersions.id,
  name: resumeVersions.name,
  track: resumeVersions.track,
  contentText: resumeVersions.contentText,
  hasPdf: sql<boolean>`${resumeVersions.pdfData} IS NOT NULL`,
  tags: resumeVersions.tags,
  createdAt: resumeVersions.createdAt,
  updatedAt: resumeVersions.updatedAt,
};

export function createJobDescriptionsRepository(
  database: Database,
): JobDescriptionsRepository {
  return {
    async create(applicationId, input) {
      const [description] = await database
        .insert(jobDescriptions)
        .values({
          applicationId,
          rawText: input.raw_text,
          extractedKeywords: input.extracted_keywords ?? [],
          aiSummary: input.ai_summary ?? null,
        })
        .returning();
      if (description === undefined)
        throw new Error("job description insert returned no row");
      return description;
    },
    async getByApplication(applicationId) {
      const [description] = await database
        .select()
        .from(jobDescriptions)
        .where(eq(jobDescriptions.applicationId, applicationId))
        .orderBy(desc(jobDescriptions.createdAt))
        .limit(1);
      if (description === undefined)
        throw new EntityNotFoundError("job description");
      return description;
    },
    async get(id) {
      const [description] = await database
        .select()
        .from(jobDescriptions)
        .where(eq(jobDescriptions.id, id))
        .limit(1);
      if (description === undefined)
        throw new EntityNotFoundError("job description");
      return description;
    },
    async update(id, input) {
      const values: Partial<typeof jobDescriptions.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.raw_text != null) values.rawText = input.raw_text;
      if (input.extracted_keywords != null)
        values.extractedKeywords = input.extracted_keywords;
      if (input.ai_summary != null) values.aiSummary = input.ai_summary;
      const [description] = await database
        .update(jobDescriptions)
        .set(values)
        .where(eq(jobDescriptions.id, id))
        .returning();
      if (description === undefined)
        throw new EntityNotFoundError("job description");
      return description;
    },
    listResumes: () =>
      database
        .select(resumeSelection)
        .from(resumeVersions)
        .orderBy(desc(resumeVersions.createdAt))
        .limit(200),
    async getResume(id) {
      const [resume] = await database
        .select(resumeSelection)
        .from(resumeVersions)
        .where(eq(resumeVersions.id, id))
        .limit(1);
      if (resume === undefined) throw new EntityNotFoundError("resume version");
      return resume;
    },
    getPrepContext: (applicationId) => getPrepContext(database, applicationId),
  };
}

async function getPrepContext(
  database: Database,
  applicationId: string,
): Promise<PrepContext> {
  const [applicationRow] = await database
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (applicationRow === undefined)
    throw new EntityNotFoundError("application");

  const [company] = await database
    .select()
    .from(companies)
    .where(eq(companies.id, applicationRow.companyId))
    .limit(1);
  if (company === undefined) throw new EntityNotFoundError("company");

  const [trackRows, descriptions, resumes, interviews, companyContacts, logs] =
    await Promise.all([
      database
        .select({ roleTrack: applicationRoleTracks.roleTrack })
        .from(applicationRoleTracks)
        .where(eq(applicationRoleTracks.applicationId, applicationId))
        .orderBy(applicationRoleTracks.roleTrack),
      database
        .select()
        .from(jobDescriptions)
        .where(eq(jobDescriptions.applicationId, applicationId))
        .orderBy(desc(jobDescriptions.createdAt))
        .limit(1),
      applicationRow.resumeVersionId === null
        ? Promise.resolve([])
        : database
            .select(resumeSelection)
            .from(resumeVersions)
            .where(eq(resumeVersions.id, applicationRow.resumeVersionId))
            .limit(1),
      database
        .select()
        .from(interviewRounds)
        .where(eq(interviewRounds.applicationId, applicationId))
        .orderBy(
          asc(interviewRounds.scheduledAt),
          desc(interviewRounds.createdAt),
        ),
      database
        .select()
        .from(contacts)
        .where(eq(contacts.companyId, applicationRow.companyId))
        .orderBy(desc(contacts.createdAt)),
      database
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.entityType, "application"),
            eq(auditLogs.entityId, applicationId),
          ),
        )
        .orderBy(desc(auditLogs.createdAt)),
    ]);

  const application: Application = {
    ...applicationRow,
    roleTracks:
      trackRows.length === 0
        ? [applicationRow.roleTrack]
        : trackRows.map((row) => row.roleTrack),
  };
  return {
    application,
    company,
    jobDescription: descriptions[0] ?? null,
    resume: resumes[0] ?? null,
    interviews,
    contacts: companyContacts,
    auditLogs: logs,
  };
}
