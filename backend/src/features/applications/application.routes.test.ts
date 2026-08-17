import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiServices } from "../../services.js";
import {
  createApplicationsService,
  type Application,
  type ApplicationsRepository,
  type ApplicationsService,
} from "./application.service.js";
import { buildApp } from "../../app.js";

const id = "00000000-0000-4000-8000-000000000004";
const companyId = "00000000-0000-4000-8000-000000000001";
const now = new Date("2026-08-01T01:02:03.000Z");
const application: Application = {
  id,
  companyId,
  resumeVersionId: null,
  title: "Backend Engineer",
  roleTrack: "backend",
  roleTracks: ["ai", "backend"],
  source: null,
  status: "saved",
  location: "Remote",
  employmentType: null,
  jobUrl: null,
  portalAccount: null,
  portalPassword: null,
  appliedAt: null,
  deadlineAt: null,
  notes: null,
  createdAt: now,
  updatedAt: now,
};
const apps: Array<Awaited<ReturnType<typeof buildApp>>> = [];
afterEach(async () =>
  Promise.all(apps.splice(0).map(async (app) => app.close())),
);

function services(): ApiServices {
  const applications = {
    create: vi.fn().mockResolvedValue(application),
    list: vi.fn().mockResolvedValue([application]),
    listPage: vi.fn().mockResolvedValue({
      items: [application],
      total: 1,
      limit: 25,
      offset: 0,
    }),
    get: vi.fn().mockResolvedValue(application),
    update: vi.fn().mockResolvedValue(application),
    changeStatus: vi
      .fn()
      .mockResolvedValue({ ...application, status: "applied" }),
    listAuditLogs: vi.fn().mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000005",
        entityType: "application",
        entityId: id,
        action: "status_changed",
        oldValue: { status: "saved" },
        newValue: { status: "applied" },
        createdAt: now,
      },
    ]),
    delete: vi.fn().mockResolvedValue(undefined),
  } satisfies ApplicationsService;
  return {
    analysis: {
      create: vi.fn(),
      list: vi.fn(),
      listByApplication: vi.fn(),
      get: vi.fn(),
    },
    analytics: {
      summary: vi.fn(),
      byStatus: vi.fn(),
      byTrack: vi.fn(),
      byResume: vi.fn(),
      sources: vi.fn(),
      funnel: vi.fn(),
      upcoming: vi.fn(),
    },
    search: { search: vi.fn() },
    applications,
    companies: {
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contacts: {
      create: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    interviews: {
      create: vi.fn(),
      listByApplication: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      delete: vi.fn(),
    },
    jobDescriptions: {
      create: vi.fn(),
      getByApplication: vi.fn(),
      update: vi.fn(),
      extractKeywords: vi.fn(),
      compareResume: vi.fn(),
      recommendedResume: vi.fn(),
      prepContext: vi.fn(),
      generatePrepBrief: vi.fn(),
    },
    reminders: {
      create: vi.fn(),
      list: vi.fn(),
      listDue: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      cancel: vi.fn(),
      delete: vi.fn(),
      listFailed: vi.fn(),
      retry: vi.fn(),
    },
    roleTracks: { create: vi.fn(), list: vi.fn() },
    resumeVersions: {
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      storePdf: vi.fn(),
      getPdf: vi.fn(),
    },
  };
}

async function app(apiServices = services()) {
  const instance = await buildApp({
    logger: false,
    services: apiServices,
    healthChecks: {
      postgres: vi.fn().mockResolvedValue(undefined),
      redis: vi.fn().mockResolvedValue(undefined),
    },
  });
  apps.push(instance);
  return instance;
}

describe("application routes", () => {
  it("creates and serializes omitted nullable fields", async () => {
    const api = services();
    const instance = await app(api);
    const response = await instance.inject({
      method: "POST",
      url: "/api/v1/applications",
      payload: {
        company_id: companyId,
        title: "Backend Engineer",
        role_track: "backend",
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      id,
      company_id: companyId,
      role_tracks: ["ai", "backend"],
      status: "saved",
      location: "Remote",
    });
    expect(response.json()).not.toHaveProperty("resume_version_id");
  });

  it("returns array or paginated response based on query presence", async () => {
    const api = services();
    const instance = await app(api);
    expect(
      (
        await instance.inject({ method: "GET", url: "/api/v1/applications" })
      ).json(),
    ).toHaveLength(1);
    const page = await instance.inject({
      method: "GET",
      url: "/api/v1/applications?offset=-3&limit=500",
    });
    expect(page.json()).toMatchObject({ total: 1, limit: 25, offset: 0 });
    expect(api.applications.listPage).toHaveBeenCalledWith(500, -3);
  });

  it("rejects malformed pagination", async () => {
    const response = await (
      await app()
    ).inject({ method: "GET", url: "/api/v1/applications?limit=nope" });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "invalid limit" });
  });

  it("maps invalid transitions to conflict", async () => {
    const api = services();
    api.applications = createApplicationsService({
      ...({} as ApplicationsRepository),
      get: vi.fn().mockResolvedValue(application),
    });
    const response = await (
      await app(api)
    ).inject({
      method: "PATCH",
      url: `/api/v1/applications/${id}/status`,
      payload: { status: "onsite" },
    });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "invalid application status transition: saved -> onsite",
    });
  });

  it("returns application audit logs", async () => {
    const response = await (
      await app()
    ).inject({ method: "GET", url: `/api/v1/applications/${id}/audit-logs` });
    const body = response.json<Array<Record<string, unknown>>>();
    expect(body.at(0)).toMatchObject({
      entity_type: "application",
      action: "status_changed",
      old_value: { status: "saved" },
    });
  });

  it("includes application routes in OpenAPI", async () => {
    const response = await (
      await app()
    ).inject({ method: "GET", url: "/api/v1/openapi.yaml" });
    expect(response.body).toContain("/api/v1/applications");
    expect(response.body).toContain("/status");
    expect(response.body).toContain("/audit-logs");
  });
});
