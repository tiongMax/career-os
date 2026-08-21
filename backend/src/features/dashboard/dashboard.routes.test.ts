import Fastify, { type FastifyInstance } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DashboardService } from "./dashboard.service.js";
import { dashboardRoutes } from "./dashboard.routes.js";

const apps: FastifyInstance[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("GET /dashboard", () => {
  it("returns a bounded snapshot and exposes cache status", async () => {
    const service: DashboardService = {
      get: vi.fn().mockResolvedValue({
        cacheStatus: "HIT",
        snapshot: {
          generatedAt: "2026-08-02T10:00:00.000Z",
          summary: {
            total: 1,
            active: 1,
            responded: 0,
            interviewed: 0,
            offers: 0,
            rejected: 0,
          },
          attention: {
            overdueReminders: 0,
            dueTodayReminders: 0,
            staleApplications: 0,
            missingResumeVersion: 1,
            items: [
              {
                id: "missing-resume-11111111-1111-4111-8111-111111111111",
                applicationId: "11111111-1111-4111-8111-111111111111",
                applicationTitle: "Engineer",
                companyName: "Example",
                type: "missing_resume",
                title: null,
                actionAt: "2026-08-01T10:00:00.000Z",
              },
            ],
          },
          pipeline: { applied: 1 },
          reachedPipeline: { applied: 1 },
          recentApplications: [],
          upcoming: { interviews: [], reminders: [], deadlines: [] },
        },
      }),
    };
    const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    await app.register(dashboardRoutes(service));
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/dashboard" });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-cache"]).toBe("HIT");
    expect(response.json()).toMatchObject({
      generated_at: "2026-08-02T10:00:00.000Z",
      pipeline: { applied: 1 },
      pipeline_reached: { applied: 1 },
      attention: { missing_resume_version: 1 },
    });
  });
});
