import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { createCompaniesService } from "../../domain/companies/company.js";
import { createContactsService } from "../../domain/contacts/contact.js";
import { createInterviewsService } from "../../domain/interviews/interview.js";
import { createJobDescriptionsService } from "../../domain/job-descriptions/job-description.js";
import { createApplicationsService } from "../../domain/applications/application.js";
import { createRoleTracksService } from "../../domain/role-tracks/role-track.js";
import { createResumeVersionsService } from "../../domain/resumes/resume-version.js";
import {
  createPostgres,
  type Postgres,
} from "../../infrastructure/postgres.js";
import { createCompaniesRepository } from "./companies-repository.js";
import { createContactsRepository } from "./contacts-repository.js";
import { createInterviewsRepository } from "./interviews-repository.js";
import { createJobDescriptionsRepository } from "./job-descriptions-repository.js";
import { createApplicationsRepository } from "./applications-repository.js";
import { EntityNotFoundError, hasPostgresCode } from "./errors.js";
import {
  applications,
  auditLogs,
  companies,
  contacts,
  interviewRounds,
  jobDescriptions,
  resumeVersions,
  roleTracks,
} from "./schema.js";
import { createRoleTracksRepository } from "./role-tracks-repository.js";
import { createResumeVersionsRepository } from "./resume-versions-repository.js";

const databaseUrl = process.env.CAREEROS_INTEGRATION_DATABASE_URL;
const runId = `${String(process.pid)}-${String(Date.now())}`;
const companyName = `TypeScript integration ${runId}`;
const roleTrackName = `typescript-integration-${runId}`;
const resumeName = `TypeScript resume integration ${runId}`;
const applicationCompanyName = `TypeScript application integration ${runId}`;
const relationshipCompanyName = `TypeScript relationships integration ${runId}`;
const jobDescriptionCompanyName = `TypeScript JD integration ${runId}`;
const jobDescriptionResumeName = `TypeScript JD resume ${runId}`;

let postgres: Postgres | undefined;

describe.skipIf(databaseUrl === undefined)("Drizzle repositories", () => {
  beforeAll(() => {
    postgres = createPostgres(requireDatabaseUrl());
  });

  afterAll(async () => {
    if (postgres === undefined) return;

    await postgres.db.delete(companies).where(eq(companies.name, companyName));
    await postgres.db
      .delete(companies)
      .where(eq(companies.name, applicationCompanyName));
    await postgres.db
      .delete(companies)
      .where(eq(companies.name, relationshipCompanyName));
    await postgres.db
      .delete(companies)
      .where(eq(companies.name, jobDescriptionCompanyName));
    await postgres.db
      .delete(resumeVersions)
      .where(eq(resumeVersions.name, resumeName));
    await postgres.db
      .delete(resumeVersions)
      .where(eq(resumeVersions.name, jobDescriptionResumeName));
    await postgres.db
      .delete(roleTracks)
      .where(eq(roleTracks.name, roleTrackName));
    await postgres.close();
  });

  it("persists the company CRUD lifecycle with Go-compatible patch semantics", async () => {
    const service = createCompaniesService(
      createCompaniesRepository(requirePostgres().db),
    );

    const created = await service.create({
      name: companyName,
      website: "https://example.com",
      industry: "Software",
    });
    const fetched = await service.get(created.id);
    const updated = await service.update(created.id, {
      website: null,
      notes: "Migrated through Drizzle",
    });

    expect(fetched.name).toBe(companyName);
    expect(updated.website).toBe("https://example.com");
    expect(updated.notes).toBe("Migrated through Drizzle");
    expect((await service.list()).some((item) => item.id === created.id)).toBe(
      true,
    );

    await service.delete(created.id);
    await expect(service.get(created.id)).rejects.toMatchObject({
      name: "EntityNotFoundError",
    });
  });

  it("normalizes, orders, and uniquely constrains role tracks", async () => {
    const service = createRoleTracksService(
      createRoleTracksRepository(requirePostgres().db),
    );

    const created = await service.create({
      name: `  ${roleTrackName.toUpperCase()}  `,
    });
    const listed = await service.list();

    expect(created.name).toBe(roleTrackName);
    expect(listed.map((track) => track.name)).toEqual(
      [...listed.map((track) => track.name)].sort(),
    );
    let duplicateError: unknown;
    try {
      await service.create({ name: roleTrackName });
    } catch (error) {
      duplicateError = error;
    }
    expect(hasPostgresCode(duplicateError, "23505")).toBe(true);
  });

  it("persists resume metadata and PDF bytes", async () => {
    const service = createResumeVersionsService(
      createResumeVersionsRepository(requirePostgres().db),
    );
    const pdf = Buffer.from("%PDF-1.4\nDrizzle integration\n");
    const created = await service.create({
      name: resumeName,
      track: "backend",
      content_text: "TypeScript and Fastify",
    });
    expect(created.tags).toEqual([]);
    expect(created.hasPdf).toBe(false);

    await service.storePdf(created.id, pdf);
    expect(await service.getPdf(created.id)).toEqual(pdf);
    expect((await service.get(created.id)).hasPdf).toBe(true);

    const updated = await service.update(created.id, {
      name: null,
      content_text: "Updated TypeScript resume",
      tags: ["TypeScript"],
    });
    expect(updated.name).toBe(resumeName);
    expect(updated.contentText).toBe("Updated TypeScript resume");
    expect(updated.tags).toEqual(["TypeScript"]);

    await service.delete(created.id);
    await expect(service.get(created.id)).rejects.toBeInstanceOf(
      EntityNotFoundError,
    );
  });

  it("keeps application tracks and status audit writes transactional", async () => {
    const database = requirePostgres().db;
    const companyService = createCompaniesService(
      createCompaniesRepository(database),
    );
    const repository = createApplicationsRepository(database);
    const service = createApplicationsService(repository);
    const company = await companyService.create({
      name: applicationCompanyName,
    });
    const created = await service.create({
      company_id: company.id,
      title: "TypeScript Platform Engineer",
      role_track: "backend",
      role_tracks: [" Backend ", "ai", "backend"],
    });

    try {
      expect(created.roleTrack).toBe("backend");
      expect(created.roleTracks).toEqual(["backend", "ai"]);
      expect((await service.listPage(1, 0)).total).toBeGreaterThanOrEqual(1);

      await expect(
        repository.updateStatusWithAudit(created.id, "applied", {
          entityType: "application",
          entityId: "not-a-uuid",
          action: "status_changed",
        }),
      ).rejects.toBeDefined();
      expect((await service.get(created.id)).status).toBe("saved");

      const updated = await service.changeStatus(created.id, {
        status: "applied",
      });
      expect(updated.status).toBe("applied");
      expect(await service.listAuditLogs(created.id)).toEqual([
        expect.objectContaining({
          entityType: "application",
          entityId: created.id,
          action: "status_changed",
          oldValue: { status: "saved" },
          newValue: { status: "applied" },
        }),
      ]);
    } finally {
      await database
        .delete(applications)
        .where(eq(applications.id, created.id));
      await database
        .delete(auditLogs)
        .where(eq(auditLogs.entityId, created.id));
      await companyService.delete(company.id);
    }
  });

  it("persists contacts and ordered application interviews", async () => {
    const database = requirePostgres().db;
    const companyService = createCompaniesService(
      createCompaniesRepository(database),
    );
    const applicationService = createApplicationsService(
      createApplicationsRepository(database),
    );
    const contactService = createContactsService(
      createContactsRepository(database),
    );
    const interviewService = createInterviewsService(
      createInterviewsRepository(database),
    );
    const company = await companyService.create({
      name: relationshipCompanyName,
    });
    const application = await applicationService.create({
      company_id: company.id,
      title: "Relationship Integration Engineer",
      role_track: "backend",
    });
    const contact = await contactService.create({
      company_id: company.id,
      name: "Ada Lovelace",
      role: "Recruiter",
    });
    const scheduledAt = new Date("2026-09-01T03:00:00.000Z");
    const interview = await interviewService.create(application.id, {
      round_type: "technical",
      scheduled_at: scheduledAt,
      interviewer: "Grace Hopper",
    });

    try {
      const updatedContact = await contactService.update(contact.id, {
        role: null,
        notes: "Follow up after interview",
      });
      expect(updatedContact.role).toBe("Recruiter");
      expect(updatedContact.notes).toBe("Follow up after interview");

      const updatedInterview = await interviewService.update(interview.id, {
        outcome: "advanced",
      });
      expect(updatedInterview.outcome).toBe("advanced");
      expect(await interviewService.listByApplication(application.id)).toEqual([
        expect.objectContaining({ id: interview.id, scheduledAt }),
      ]);

      await contactService.delete(contact.id);
      await interviewService.delete(interview.id);
      await expect(contactService.get(contact.id)).rejects.toBeInstanceOf(
        EntityNotFoundError,
      );
      expect(await interviewService.listByApplication(application.id)).toEqual(
        [],
      );
    } finally {
      await database
        .delete(interviewRounds)
        .where(eq(interviewRounds.applicationId, application.id));
      await database.delete(contacts).where(eq(contacts.companyId, company.id));
      await database
        .delete(applications)
        .where(eq(applications.id, application.id));
      await companyService.delete(company.id).catch(() => undefined);
    }
  });

  it("persists job descriptions and builds complete prep data", async () => {
    const database = requirePostgres().db;
    const companyService = createCompaniesService(
      createCompaniesRepository(database),
    );
    const applicationService = createApplicationsService(
      createApplicationsRepository(database),
    );
    const resumeService = createResumeVersionsService(
      createResumeVersionsRepository(database),
    );
    const service = createJobDescriptionsService(
      createJobDescriptionsRepository(database),
    );
    const company = await companyService.create({
      name: jobDescriptionCompanyName,
    });
    const resume = await resumeService.create({
      name: jobDescriptionResumeName,
      track: "backend",
      content_text: "TypeScript, Redis and Fastify platform work",
    });
    const application = await applicationService.create({
      company_id: company.id,
      resume_version_id: resume.id,
      title: "Platform Engineer",
      role_track: "backend",
      location: "Remote",
    });

    try {
      const created = await service.create(application.id, {
        raw_text: "We need TypeScript, Redis and Kubernetes experience.",
      });
      const extracted = await service.extractKeywords(created.id);
      const compared = await service.compareResume(created.id, resume.id);
      const recommended = await service.recommendedResume(application.id);
      const context = await service.prepContext(application.id);
      const brief = await service.generatePrepBrief(application.id);

      expect(extracted.extractedKeywords).toEqual([
        "TypeScript",
        "R",
        "Redis",
        "Kubernetes",
      ]);
      expect(compared.matched).toEqual(["TypeScript", "R", "Redis"]);
      expect(recommended.resumeVersion.id).toBe(resume.id);
      expect(context).toMatchObject({
        application: { id: application.id },
        company: { id: company.id },
        jobDescription: { id: created.id },
        resume: { id: resume.id },
        interviews: [],
        contacts: [],
      });
      expect(brief.roleSummary).toBe(
        "Platform Engineer at " + company.name + " · Remote",
      );
      expect(brief.keyGaps).toEqual(["Kubernetes"]);
    } finally {
      await database
        .delete(jobDescriptions)
        .where(eq(jobDescriptions.applicationId, application.id));
      await database
        .delete(applications)
        .where(eq(applications.id, application.id));
      await resumeService.delete(resume.id).catch(() => undefined);
      await companyService.delete(company.id).catch(() => undefined);
    }
  });
});

function requireDatabaseUrl(): string {
  if (databaseUrl === undefined) {
    throw new Error("CAREEROS_INTEGRATION_DATABASE_URL is required");
  }
  return databaseUrl;
}

function requirePostgres(): Postgres {
  if (postgres === undefined) {
    throw new Error("PostgreSQL test connection is not initialized");
  }
  return postgres;
}
