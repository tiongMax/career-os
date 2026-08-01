import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { DefaultCompaniesService } from "../../domain/companies/company.js";
import { DefaultRoleTracksService } from "../../domain/role-tracks/role-track.js";
import { DefaultResumeVersionsService } from "../../domain/resumes/resume-version.js";
import { createPostgres, type Postgres } from "../../infrastructure/postgres.js";
import { DrizzleCompaniesRepository } from "./companies-repository.js";
import { EntityNotFoundError, hasPostgresCode } from "./errors.js";
import { companies, resumeVersions, roleTracks } from "./schema.js";
import { DrizzleRoleTracksRepository } from "./role-tracks-repository.js";
import { DrizzleResumeVersionsRepository } from "./resume-versions-repository.js";

const databaseUrl = process.env.CAREEROS_INTEGRATION_DATABASE_URL;
const runId = `${String(process.pid)}-${String(Date.now())}`;
const companyName = `TypeScript integration ${runId}`;
const roleTrackName = `typescript-integration-${runId}`;
const resumeName = `TypeScript resume integration ${runId}`;

let postgres: Postgres | undefined;

describe.skipIf(databaseUrl === undefined)("Drizzle repositories", () => {
  beforeAll(() => {
    postgres = createPostgres(requireDatabaseUrl());
  });

  afterAll(async () => {
    if (postgres === undefined) return;

    await postgres.db.delete(companies).where(eq(companies.name, companyName));
    await postgres.db.delete(resumeVersions).where(eq(resumeVersions.name, resumeName));
    await postgres.db.delete(roleTracks).where(eq(roleTracks.name, roleTrackName));
    await postgres.close();
  });

  it("persists the company CRUD lifecycle with Go-compatible patch semantics", async () => {
    const service = new DefaultCompaniesService(
      new DrizzleCompaniesRepository(requirePostgres().db),
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
    expect((await service.list()).some((item) => item.id === created.id)).toBe(true);

    await service.delete(created.id);
    await expect(service.get(created.id)).rejects.toMatchObject({
      name: "EntityNotFoundError",
    });
  });

  it("normalizes, orders, and uniquely constrains role tracks", async () => {
    const service = new DefaultRoleTracksService(
      new DrizzleRoleTracksRepository(requirePostgres().db),
    );

    const created = await service.create({ name: `  ${roleTrackName.toUpperCase()}  ` });
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
    const service = new DefaultResumeVersionsService(
      new DrizzleResumeVersionsRepository(requirePostgres().db),
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
    await expect(service.get(created.id)).rejects.toBeInstanceOf(EntityNotFoundError);
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
