import { afterEach, describe, expect, it, vi } from "vitest";

import { buildApp } from "../server.js";
import type { HealthChecks } from "./health.js";

const apps: Array<Awaited<ReturnType<typeof buildApp>>> = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

async function createApp(healthChecks: HealthChecks) {
  const app = await buildApp({ healthChecks, logger: false });
  apps.push(app);
  return app;
}

describe("GET /api/v1/health", () => {
  it("returns ok when PostgreSQL and Redis are healthy", async () => {
    const app = await createApp({
      postgres: vi.fn().mockResolvedValue(undefined),
      redis: vi.fn().mockResolvedValue(undefined),
    });

    const response = await app.inject({ method: "GET", url: "/api/v1/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok", postgres: "ok", redis: "ok" });
  });

  it("returns degraded and identifies failed dependencies", async () => {
    const app = await createApp({
      postgres: vi.fn().mockRejectedValue(new Error("postgres unavailable")),
      redis: vi.fn().mockResolvedValue(undefined),
    });

    const response = await app.inject({ method: "GET", url: "/api/v1/health" });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ status: "degraded", postgres: "error", redis: "ok" });
  });
});

describe("API documentation", () => {
  it("serves generated OpenAPI and Swagger UI", async () => {
    const app = await createApp({
      postgres: vi.fn().mockResolvedValue(undefined),
      redis: vi.fn().mockResolvedValue(undefined),
    });

    const spec = await app.inject({ method: "GET", url: "/api/v1/openapi.yaml" });
    const docs = await app.inject({ method: "GET", url: "/api/v1/docs/" });

    expect(spec.statusCode).toBe(200);
    expect(spec.headers["content-type"]).toContain("application/yaml");
    expect(spec.body).toContain("/api/v1/health");
    expect(docs.statusCode).toBe(200);
    expect(docs.body).toContain("Swagger UI");
  });
});
