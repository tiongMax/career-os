import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../../app.js";
import { jobDescriptionRoutes } from "./job-description.routes.js";
import {
  createJobDescriptionsService,
  type JobDescriptionsRepository,
} from "./job-description.service.js";
import { EntityNotFoundError } from "../../database/errors.js";

const applicationId = "00000000-0000-4000-8000-000000000001";
const descriptionId = "00000000-0000-4000-8000-000000000002";
const date = new Date("2026-08-01T01:02:03.000Z");
const description = {
  id: descriptionId,
  applicationId,
  rawText: "Backend role",
  createdAt: date,
  updatedAt: date,
  extractedKeywords: ["legacy keyword"],
  aiSummary: "legacy analysis",
};
const apps: Array<Awaited<ReturnType<typeof buildApp>>> = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});
async function createApp() {
  const repository = {
    create: vi.fn().mockResolvedValue(description),
    getByApplication: vi.fn().mockResolvedValue(description),
    update: vi.fn().mockResolvedValue(description),
  } satisfies JobDescriptionsRepository;
  const app = await buildApp({
    logger: false,
    healthChecks: { postgres: async () => {}, redis: async () => {} },
  });
  await app.register(
    jobDescriptionRoutes(createJobDescriptionsService(repository)),
    { prefix: "/api/v1" },
  );
  apps.push(app);
  return { app, repository };
}
describe("job description routes", () => {
  it("keeps create, read, and update endpoints with text-only responses", async () => {
    const { app, repository } = await createApp();
    for (const [method, url] of [
      ["POST", "/api/v1/applications/" + applicationId + "/job-description"],
      ["GET", "/api/v1/applications/" + applicationId + "/job-description"],
      ["PATCH", "/api/v1/job-descriptions/" + descriptionId],
    ] as const) {
      const response = await app.inject({
        method,
        url,
        ...(method === "GET" ? {} : { payload: { raw_text: "Backend role" } }),
      });
      expect(response.statusCode).toBe(method === "POST" ? 201 : 200);
      expect(response.json()).toEqual({
        id: descriptionId,
        application_id: applicationId,
        raw_text: "Backend role",
        created_at: date.toISOString(),
        updated_at: date.toISOString(),
      });
    }
    expect(repository.create).toHaveBeenCalledWith(applicationId, {
      raw_text: "Backend role",
    });
    expect(repository.update).toHaveBeenCalledWith(descriptionId, {
      raw_text: "Backend role",
    });
  });
  it("rejects removed analysis fields and invalid text without writes", async () => {
    const { app, repository } = await createApp();
    for (const payload of [
      { raw_text: " " },
      { raw_text: "Backend role", extracted_keywords: [] },
      { raw_text: "Backend role", ai_summary: "summary" },
    ]) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/applications/" + applicationId + "/job-description",
        payload,
      });
      expect(response.statusCode).toBe(400);
    }
    expect(repository.create).not.toHaveBeenCalled();
  });
  it("preserves not-found behavior", async () => {
    const { app, repository } = await createApp();
    repository.getByApplication.mockRejectedValue(
      new EntityNotFoundError("job description"),
    );
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/applications/" + applicationId + "/job-description",
    });
    expect(response.statusCode).toBe(404);
  });
  it("removes analysis endpoints and their OpenAPI contracts", async () => {
    const { app } = await createApp();
    const removed = [
      ["POST", "/job-descriptions/" + descriptionId + "/extract-keywords"],
      [
        "POST",
        "/job-descriptions/" +
          descriptionId +
          "/compare-resume/" +
          applicationId,
      ],
      ["GET", "/applications/" + applicationId + "/recommended-resume"],
      ["GET", "/applications/" + applicationId + "/prep-context"],
      ["POST", "/applications/" + applicationId + "/generate-prep-brief"],
      ["POST", "/applications/" + applicationId + "/ai-analysis-jobs"],
      ["GET", "/ai-analysis-jobs"],
    ] as const;
    for (const [method, path] of removed) {
      expect(
        (await app.inject({ method, url: "/api/v1" + path })).statusCode,
      ).toBe(404);
    }
    const docs = await app.inject({
      method: "GET",
      url: "/api/v1/openapi.yaml",
    });
    expect(docs.body).toContain("/api/v1/applications/{id}/job-description");
    expect(docs.body).not.toMatch(
      /extract-keywords|compare-resume|recommended-resume|prep-context|generate-prep-brief|ai-analysis-jobs/,
    );
  });
});
