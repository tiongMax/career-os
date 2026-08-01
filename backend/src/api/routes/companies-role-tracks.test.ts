import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiServices } from "../../app/services.js";
import {
  DefaultCompaniesService,
  type CompaniesRepository,
  type CompaniesService,
  type Company,
} from "../../domain/companies/company.js";
import {
  DefaultRoleTracksService,
  type RoleTracksRepository,
  type RoleTracksService,
} from "../../domain/role-tracks/role-track.js";
import { EntityNotFoundError } from "../../persistence/postgres/errors.js";
import { buildApp } from "../server.js";

const companyId = "00000000-0000-4000-8000-000000000001";
const createdAt = new Date("2026-07-01T01:02:03.000Z");

const company: Company = {
  id: companyId,
  name: "Acme",
  website: null,
  industry: "Software",
  location: null,
  notes: null,
  createdAt,
  updatedAt: createdAt,
};

const apps: Array<Awaited<ReturnType<typeof buildApp>>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

function fakeServices(): ApiServices {
  const applications = {
    create: vi.fn(), list: vi.fn().mockResolvedValue([]), listPage: vi.fn(), get: vi.fn(),
    update: vi.fn(), changeStatus: vi.fn(), listAuditLogs: vi.fn().mockResolvedValue([]), delete: vi.fn(),
  };
  const companies = {
    create: vi.fn().mockResolvedValue(company),
    list: vi.fn().mockResolvedValue([company]),
    get: vi.fn().mockResolvedValue(company),
    update: vi.fn().mockResolvedValue(company),
    delete: vi.fn().mockResolvedValue(undefined),
  } satisfies CompaniesService;

  const roleTracks = {
    create: vi.fn().mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000002",
      name: "platform",
      createdAt,
    }),
    list: vi.fn().mockResolvedValue([]),
  } satisfies RoleTracksService;

  const resumeVersions = {
    create: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    storePdf: vi.fn(),
    getPdf: vi.fn(),
  };

  return { applications, companies, roleTracks, resumeVersions };
}

async function createApp(services = fakeServices()) {
  const app = await buildApp({
    logger: false,
    services,
    healthChecks: {
      postgres: vi.fn().mockResolvedValue(undefined),
      redis: vi.fn().mockResolvedValue(undefined),
    },
  });
  apps.push(app);
  return app;
}

describe("company routes", () => {
  it("creates a company and omits null response fields", async () => {
    const services = fakeServices();
    const app = await createApp(services);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/companies",
      payload: { name: "Acme", industry: "Software" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: companyId,
      name: "Acme",
      industry: "Software",
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
    });
    expect(services.companies.create).toHaveBeenCalledWith({
      name: "Acme",
      industry: "Software",
    });
  });

  it("accepts collection routes with and without a trailing slash", async () => {
    const app = await createApp();

    const withoutSlash = await app.inject({ method: "GET", url: "/api/v1/companies" });
    const withSlash = await app.inject({ method: "GET", url: "/api/v1/companies/" });

    expect(withoutSlash.statusCode).toBe(200);
    expect(withSlash.statusCode).toBe(200);
  });

  it("uses the path id for updates and supports partial bodies", async () => {
    const services = fakeServices();
    const app = await createApp(services);

    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/companies/${companyId}`,
      payload: { notes: "Follow up" },
    });

    expect(response.statusCode).toBe(200);
    expect(services.companies.update).toHaveBeenCalledWith(companyId, {
      notes: "Follow up",
    });
  });

  it("rejects unknown JSON fields", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/companies",
      payload: { name: "Acme", surprise: true },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "invalid JSON body" });
  });

  it("returns the domain validation error when the name is missing", async () => {
    const services = fakeServices();
    services.companies = new DefaultCompaniesService({
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } satisfies CompaniesRepository);
    const app = await createApp(services);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/companies",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "company name is required" });
  });

  it("rejects an invalid company UUID", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/companies/not-a-uuid",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "invalid company id" });
  });

  it("maps missing companies to 404", async () => {
    const services = fakeServices();
    vi.mocked(services.companies.get).mockRejectedValue(new EntityNotFoundError("company"));
    const app = await createApp(services);

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/companies/${companyId}`,
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "not found" });
  });

  it("deletes an existing company without a response body", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "DELETE",
      url: `/api/v1/companies/${companyId}`,
    });

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe("");
  });
});

describe("role-track routes", () => {
  it("creates a role track", async () => {
    const services = fakeServices();
    const app = await createApp(services);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tracks",
      payload: { name: "Platform" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: "00000000-0000-4000-8000-000000000002",
      name: "platform",
      created_at: createdAt.toISOString(),
    });
  });

  it("maps unique constraint violations to conflict", async () => {
    const services = fakeServices();
    vi.mocked(services.roleTracks.create).mockRejectedValue({ code: "23505" });
    const app = await createApp(services);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tracks",
      payload: { name: "backend" },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: "already exists" });
  });

  it("returns the domain validation error when the name is missing", async () => {
    const services = fakeServices();
    services.roleTracks = new DefaultRoleTracksService({
      create: vi.fn(),
      list: vi.fn(),
    } satisfies RoleTracksRepository);
    const app = await createApp(services);

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/tracks",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "role track name is required" });
  });
});

describe("generated API documentation", () => {
  it("includes the company and role-track route groups", async () => {
    const app = await createApp();

    const response = await app.inject({
      method: "GET",
      url: "/api/v1/openapi.yaml",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("/api/v1/companies");
    expect(response.body).toContain("/api/v1/tracks");
  });
});
