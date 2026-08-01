import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { createCompaniesService } from "../../domain/companies/company.js";
import { createApplicationsService } from "../../domain/applications/application.js";
import { createRoleTracksService } from "../../domain/role-tracks/role-track.js";
import { createResumeVersionsService } from "../../domain/resumes/resume-version.js";
import {
  createPostgres,
  type Postgres,
} from "../../infrastructure/postgres.js";
import { createCompaniesRepository } from "./companies-repository.js";
import { createApplicationsRepository } from "./applications-repository.js";
import { EntityNotFoundError, hasPostgresCode } from "./errors.js";
import {
  applications,
  auditLogs,
  companies,
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
      .delete(resumeVersions)
      .where(eq(resumeVersions.name, resumeName));
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
