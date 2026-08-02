import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import type { ApiServices } from "../../app/services.js";
import { analysisRoutes } from "./analysis.js";
import { analyticsRoutes } from "./analytics.js";
import { applicationRoutes } from "./applications.js";
import { companyRoutes } from "./companies.js";
import { contactRoutes } from "./contacts.js";
import { exportRoutes } from "./exports.js";
import { healthRoutes, type HealthChecks } from "./health.js";
import { interviewRoutes } from "./interviews.js";
import { jobDescriptionRoutes } from "./job-descriptions.js";
import { openApiRoutes } from "./openapi.js";
import { reminderRoutes } from "./reminders.js";
import { resumeVersionRoutes } from "./resume-versions.js";
import { roleTrackRoutes } from "./role-tracks.js";
import { searchRoutes } from "./search.js";

interface ApiRoutesOptions {
  healthChecks: HealthChecks;
  services?: ApiServices;
}

export function apiRoutes(options: ApiRoutesOptions): FastifyPluginAsyncZod {
  return async function registerApiRoutes(app) {
    await app.register(healthRoutes(options.healthChecks));
    await app.register(openApiRoutes);

    const services = options.services;
    if (!services) return;

    await app.register(analysisRoutes(services.analysis));
    await app.register(analyticsRoutes(services.analytics));
    await app.register(applicationRoutes(services.applications));
    await app.register(companyRoutes(services.companies));
    await app.register(contactRoutes(services.contacts));
    await app.register(interviewRoutes(services.interviews));
    await app.register(jobDescriptionRoutes(services.jobDescriptions));
    await app.register(reminderRoutes(services.reminders));
    await app.register(searchRoutes(services.search));
    await app.register(exportRoutes(services));
    await app.register(roleTrackRoutes(services.roleTracks));
    await app.register(resumeVersionRoutes(services.resumeVersions));
  };
}
