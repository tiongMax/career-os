import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiServices } from "../../services.js";
import {
  createContactsService,
  type Contact,
  type ContactsRepository,
  type ContactsService,
} from "./contact.service.js";
import {
  createInterviewsService,
  type InterviewRound,
  type InterviewsRepository,
  type InterviewsService,
} from "../interviews/interview.service.js";
import { buildApp } from "../../app.js";

const contactId = "00000000-0000-4000-8000-000000000006";
const companyId = "00000000-0000-4000-8000-000000000001";
const applicationId = "00000000-0000-4000-8000-000000000004";
const interviewId = "00000000-0000-4000-8000-000000000007";
const now = new Date("2026-08-01T01:02:03.000Z");

const contact: Contact = {
  id: contactId,
  companyId,
  name: "Ada Lovelace",
  role: "Recruiter",
  email: null,
  linkedinUrl: null,
  relationship: null,
  notes: null,
  createdAt: now,
  updatedAt: now,
};
const interview: InterviewRound = {
  id: interviewId,
  applicationId,
  roundType: "technical",
  scheduledAt: null,
  interviewer: "Grace",
  notes: null,
  outcome: null,
  createdAt: now,
  updatedAt: now,
};
const apps: Array<Awaited<ReturnType<typeof buildApp>>> = [];
afterEach(async () =>
  Promise.all(apps.splice(0).map(async (app) => app.close())),
);

function services(): ApiServices {
  const contacts = {
    create: vi.fn().mockResolvedValue(contact),
    list: vi.fn().mockResolvedValue([contact]),
    get: vi.fn().mockResolvedValue(contact),
    update: vi.fn().mockResolvedValue(contact),
    delete: vi.fn().mockResolvedValue(undefined),
  } satisfies ContactsService;
  const interviews = {
    create: vi.fn().mockResolvedValue(interview),
    listByApplication: vi.fn().mockResolvedValue([interview]),
    update: vi.fn().mockResolvedValue(interview),
    delete: vi.fn().mockResolvedValue(undefined),
  } satisfies InterviewsService;
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
    applications: {
      create: vi.fn(),
      list: vi.fn(),
      listPage: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      changeStatus: vi.fn(),
      listAuditLogs: vi.fn(),
      delete: vi.fn(),
    },
    companies: {
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    contacts,
    interviews,
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

describe("contact routes", () => {
  it("creates a contact and omits null fields", async () => {
    const response = await (
      await app()
    ).inject({
      method: "POST",
      url: "/api/v1/contacts",
      payload: {
        company_id: companyId,
        name: "Ada Lovelace",
        role: "Recruiter",
      },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: contactId,
      company_id: companyId,
      name: "Ada Lovelace",
      role: "Recruiter",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    });
  });

  it("returns contact validation and UUID errors", async () => {
    const api = services();
    api.contacts = createContactsService({
      ...api.contacts,
      create: vi.fn(),
    } satisfies ContactsRepository);
    const instance = await app(api);
    const blank = await instance.inject({
      method: "POST",
      url: "/api/v1/contacts",
      payload: { company_id: companyId },
    });
    const invalidId = await instance.inject({
      method: "GET",
      url: "/api/v1/contacts/nope",
    });
    expect(blank.json()).toEqual({ error: "contact name is required" });
    expect(invalidId.json()).toEqual({ error: "invalid contact id" });
  });
});

describe("interview routes", () => {
  it("creates and lists application interview rounds", async () => {
    const instance = await app();
    const created = await instance.inject({
      method: "POST",
      url: `/api/v1/applications/${applicationId}/interviews`,
      payload: { round_type: "technical", interviewer: "Grace" },
    });
    const listed = await instance.inject({
      method: "GET",
      url: `/api/v1/applications/${applicationId}/interviews`,
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      id: interviewId,
      application_id: applicationId,
      round_type: "technical",
      interviewer: "Grace",
    });
    expect(listed.json()).toHaveLength(1);
  });

  it("validates round types and route IDs", async () => {
    const api = services();
    api.interviews = createInterviewsService({
      ...api.interviews,
      create: vi.fn(),
    } satisfies InterviewsRepository);
    const instance = await app(api);
    const invalidType = await instance.inject({
      method: "POST",
      url: `/api/v1/applications/${applicationId}/interviews`,
      payload: { round_type: "coffee" },
    });
    const invalidId = await instance.inject({
      method: "PATCH",
      url: "/api/v1/interviews/nope",
      payload: {},
    });
    expect(invalidType.json()).toEqual({
      error:
        "interview round_type must be one of recruiter, online_assessment, technical, system_design, behavioral, final",
    });
    expect(invalidId.json()).toEqual({ error: "invalid interview id" });
  });

  it("documents contacts and interviews", async () => {
    const response = await (
      await app()
    ).inject({ method: "GET", url: "/api/v1/openapi.yaml" });
    expect(response.body).toContain("/api/v1/contacts");
    expect(response.body).toContain("/interviews");
  });
});
