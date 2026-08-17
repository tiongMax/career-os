import {
  createCompaniesService,
  type CompaniesService,
} from "./features/companies/company.service.js";
import {
  createContactsService,
  type ContactsService,
} from "./features/contacts/contact.service.js";
import {
  createInterviewsService,
  type InterviewsService,
} from "./features/interviews/interview.service.js";
import {
  createJobDescriptionsService,
  type JobDescriptionsService,
} from "./features/job-descriptions/job-description.service.js";
import {
  createApplicationsService,
  type ApplicationsService,
} from "./features/applications/application.service.js";
import {
  createRoleTracksService,
  type RoleTracksService,
} from "./features/role-tracks/role-track.service.js";
import {
  createResumeVersionsService,
  type ResumeVersionsService,
} from "./features/resumes/resume-version.service.js";
import {
  createRemindersService,
  type RemindersService,
} from "./features/reminders/reminder.service.js";
import type { Database } from "./database/client.js";
import {
  createAnalyticsService,
  type AnalyticsService,
} from "./features/analytics/analytics.service.js";
import {
  createSearchService,
  type SearchService,
} from "./features/search/search.service.js";
import { createAnalyticsRepository } from "./features/analytics/analytics.repository.js";
import { createSearchRepository } from "./features/search/search.repository.js";
import {
  createAnalysisService,
  type AnalysisService,
} from "./features/analysis/analysis.service.js";
import { createAnalysisRepository } from "./features/analysis/analysis.repository.js";
import { createCompaniesRepository } from "./features/companies/company.repository.js";
import { createContactsRepository } from "./features/contacts/contact.repository.js";
import { createInterviewsRepository } from "./features/interviews/interview.repository.js";
import { createJobDescriptionsRepository } from "./features/job-descriptions/job-description.repository.js";
import { createApplicationsRepository } from "./features/applications/application.repository.js";
import { createRoleTracksRepository } from "./features/role-tracks/role-track.repository.js";
import { createResumeVersionsRepository } from "./features/resumes/resume-version.repository.js";
import { createRemindersRepository } from "./features/reminders/reminder.repository.js";
import {
  createDashboardService,
  type DashboardCache,
  type DashboardService,
} from "./features/dashboard/dashboard.service.js";
import { createDashboardRepository } from "./features/dashboard/dashboard.repository.js";

export interface ApiServices {
  analysis: AnalysisService;
  analytics: AnalyticsService;
  applications: ApplicationsService;
  companies: CompaniesService;
  contacts: ContactsService;
  dashboard?: DashboardService;
  interviews: InterviewsService;
  jobDescriptions: JobDescriptionsService;
  reminders: RemindersService;
  search: SearchService;
  roleTracks: RoleTracksService;
  resumeVersions: ResumeVersionsService;
}

export interface ApiServiceDependencies {
  dashboardCache?: DashboardCache;
}

export function createApiServices(
  database: Database,
  dependencies: ApiServiceDependencies = {},
): ApiServices {
  const applications = withInvalidation(
    createApplicationsService(createApplicationsRepository(database)),
    dependencies.dashboardCache,
    ["create", "update", "changeStatus", "delete"],
  );
  const companies = withInvalidation(
    createCompaniesService(createCompaniesRepository(database)),
    dependencies.dashboardCache,
    ["create", "update", "delete"],
  );
  const interviews = withInvalidation(
    createInterviewsService(createInterviewsRepository(database)),
    dependencies.dashboardCache,
    ["create", "update", "delete"],
  );
  const reminders = withInvalidation(
    createRemindersService(createRemindersRepository(database)),
    dependencies.dashboardCache,
    ["create", "update", "cancel", "delete", "retry"],
  );

  return {
    analysis: createAnalysisService(createAnalysisRepository(database)),
    analytics: createAnalyticsService(createAnalyticsRepository(database)),
    applications,
    companies,
    contacts: createContactsService(createContactsRepository(database)),
    dashboard: createDashboardService(
      createDashboardRepository(database),
      dependencies.dashboardCache,
    ),
    interviews,
    jobDescriptions: createJobDescriptionsService(
      createJobDescriptionsRepository(database),
    ),
    reminders,
    search: createSearchService(createSearchRepository(database)),
    roleTracks: createRoleTracksService(createRoleTracksRepository(database)),
    resumeVersions: createResumeVersionsService(
      createResumeVersionsRepository(database),
    ),
  };
}

type AsyncMethod = (...args: never[]) => Promise<unknown>;

export function withInvalidation<T extends object>(
  service: T,
  cache: DashboardCache | undefined,
  methods: readonly (keyof T)[],
): T {
  if (cache === undefined) return service;
  const decorated = { ...service };
  for (const method of methods) {
    const original = service[method];
    if (typeof original !== "function") continue;
    decorated[method] = (async (...args: never[]) => {
      const result = await (original as AsyncMethod)(...args);
      await cache.invalidate();
      return result;
    }) as T[keyof T];
  }
  return decorated;
}
