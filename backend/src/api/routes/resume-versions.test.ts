import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiServices } from "../../app/services.js";
import {
  createResumeVersionsService,
  type ResumeVersion,
  type ResumeVersionsRepository,
  type ResumeVersionsService,
} from "../../domain/resumes/resume-version.js";
import { EntityNotFoundError } from "../../persistence/postgres/errors.js";
import { buildApp } from "../server.js";

const resumeId = "00000000-0000-4000-8000-000000000003";
const createdAt = new Date("2026-08-01T01:02:03.000Z");
const resume: ResumeVersion = {
  id: resumeId,
  name: "Backend v1",
  track: "backend",
  contentText: null,
  hasPdf: false,
  tags: ["TypeScript"],
  createdAt,
  updatedAt: createdAt,
};

const apps: Array<Awaited<ReturnType<typeof buildApp>>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

function fakeServices(): ApiServices {
  const resumeVersions = {
    create: vi.fn().mockResolvedValue(resume),
    list: vi.fn().mockResolvedValue([resume]),
    get: vi.fn().mockResolvedValue(resume),
    update: vi.fn().mockResolvedValue(resume),
    delete: vi.fn().mockResolvedValue(undefined),
    storePdf: vi.fn().mockResolvedValue(undefined),
    getPdf: vi.fn().mockResolvedValue(null),
  } satisfies ResumeVersionsService;

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
      list: vi.fn().mockResolvedValue([]),
      listPage: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      changeStatus: vi.fn(),
      listAuditLogs: vi.fn().mockResolvedValue([]),
      delete: vi.fn(),
    },
    companies: {
      create: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
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
    roleTracks: { create: vi.fn(), list: vi.fn().mockResolvedValue([]) },
    resumeVersions,
  };
}

async function createApp(services = fakeServices()) {
  const app = await buildApp({
    logger: false,
    services,
    healthChecks: {
      postgres: vi.fn().mockResolvedValue(undefined),
    },
  });
  apps.push(app);
  return app;
}

describe("resume-version routes", () => {
  it("creates a resume and omits null content_text", async () => {
    const services = fakeServices();
    const app = await createApp(services);
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/resume-versions",
      payload: { name: "Backend v1", track: "backend", tags: ["TypeScript"] },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: resumeId,
      name: "Backend v1",
      track: "backend",
      has_pdf: false,
      tags: ["TypeScript"],
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
    });
  });

  it("returns Go-compatible validation messages", async () => {
    const services = fakeServices();
    services.resumeVersions = createResumeVersionsService({
      create: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      storePdf: vi.fn(),
      getPdf: vi.fn(),
    } satisfies ResumeVersionsRepository);
    const app = await createApp(services);

    const missingName = await app.inject({
      method: "POST",
      url: "/api/v1/resume-versions",
      payload: { track: "backend" },
    });
    const invalidTrack = await app.inject({
      method: "POST",
      url: "/api/v1/resume-versions",
      payload: { name: "Mobile", track: "mobile" },
    });

    expect(missingName.json()).toEqual({
      error: "resume version name is required",
    });
    expect(invalidTrack.json()).toEqual({
      error: "resume track must be one of backend, ai, quant, general",
    });
  });

  it("keeps null patch values for preserve-current semantics", async () => {
    const services = fakeServices();
    const app = await createApp(services);
    const response = await app.inject({
      method: "PATCH",
      url: `/api/v1/resume-versions/${resumeId}`,
      payload: { name: null, content_text: "Updated resume text", tags: [] },
    });

    expect(response.statusCode).toBe(200);
    expect(services.resumeVersions.update).toHaveBeenCalledWith(resumeId, {
      name: null,
      content_text: "Updated resume text",
      tags: [],
    });
  });

  it("rejects invalid resume ids", async () => {
    const app = await createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/resume-versions/nope",
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "invalid resume version id" });
  });

  it("uploads and downloads PDF bytes", async () => {
    const services = fakeServices();
    const pdf = Buffer.from("%PDF-1.4\nTypeScript migration\n");
    vi.mocked(services.resumeVersions.getPdf).mockResolvedValue(pdf);
    const app = await createApp(services);

    const upload = await app.inject({
      method: "POST",
      url: `/api/v1/resume-versions/${resumeId}/pdf`,
      headers: { "content-type": "multipart/form-data; boundary=careeros" },
      payload: multipartBody("careeros", "file", pdf),
    });
    const download = await app.inject({
      method: "GET",
      url: `/api/v1/resume-versions/${resumeId}/pdf`,
    });

    expect(upload.statusCode).toBe(204);
    expect(services.resumeVersions.storePdf).toHaveBeenCalledWith(
      resumeId,
      pdf,
    );
    expect(download.statusCode).toBe(200);
    expect(download.headers["content-type"]).toContain("application/pdf");
    expect(download.rawPayload).toEqual(pdf);
  });

  it("distinguishes missing file, missing PDF, and missing resume", async () => {
    const services = fakeServices();
    const app = await createApp(services);
    const missingFile = await app.inject({
      method: "POST",
      url: `/api/v1/resume-versions/${resumeId}/pdf`,
      headers: { "content-type": "multipart/form-data; boundary=careeros" },
      payload: multipartBody("careeros", "other", Buffer.from("x")),
    });
    const noPdf = await app.inject({
      method: "GET",
      url: `/api/v1/resume-versions/${resumeId}/pdf`,
    });
    vi.mocked(services.resumeVersions.getPdf).mockRejectedValue(
      new EntityNotFoundError("resume"),
    );
    const noResume = await app.inject({
      method: "GET",
      url: `/api/v1/resume-versions/${resumeId}/pdf`,
    });

    expect(missingFile.json()).toEqual({ error: "missing file field" });
    expect(noPdf.json()).toEqual({ error: "no PDF attached" });
    expect(noResume.json()).toEqual({ error: "resume not found" });
  });

  it("includes resume routes in generated OpenAPI", async () => {
    const app = await createApp();
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/openapi.yaml",
    });
    expect(response.body).toContain("/api/v1/resume-versions");
  });
});

function multipartBody(
  boundary: string,
  fieldName: string,
  data: Buffer,
): Buffer {
  return Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="resume.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
    ),
    data,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
}
