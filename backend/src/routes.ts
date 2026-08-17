import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import type { ApiServices } from "./services.js";
import { analysisRoutes } from "./features/analysis/analysis.routes.js";
import { analyticsRoutes } from "./features/analytics/analytics.routes.js";
import { applicationRoutes } from "./features/applications/application.routes.js";
import { companyRoutes } from "./features/companies/company.routes.js";
import { contactRoutes } from "./features/contacts/contact.routes.js";
import { dashboardRoutes } from "./features/dashboard/dashboard.routes.js";
import { exportRoutes } from "./routes/exports.js";
import { healthRoutes, type HealthChecks } from "./routes/health.js";
import { interviewRoutes } from "./features/interviews/interview.routes.js";
import { jobDescriptionRoutes } from "./features/job-descriptions/job-description.routes.js";
import { openApiRoutes } from "./routes/openapi.js";
import { reminderRoutes } from "./features/reminders/reminder.routes.js";
import { resumeVersionRoutes } from "./features/resumes/resume-version.routes.js";
import { roleTrackRoutes } from "./features/role-tracks/role-track.routes.js";
import { searchRoutes } from "./features/search/search.routes.js";

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
    if (services.dashboard)
      await app.register(dashboardRoutes(services.dashboard));
    await app.register(interviewRoutes(services.interviews));
    await app.register(jobDescriptionRoutes(services.jobDescriptions));
    await app.register(reminderRoutes(services.reminders));
    await app.register(searchRoutes(services.search));
    await app.register(exportRoutes(services));
    await app.register(roleTrackRoutes(services.roleTracks));
    await app.register(resumeVersionRoutes(services.resumeVersions));
  };
}
