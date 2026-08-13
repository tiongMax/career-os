import {
  createCompaniesService,
  type CompaniesService,
} from "../domain/companies/company.js";
import {
  createContactsService,
  type ContactsService,
} from "../domain/contacts/contact.js";
import {
  createInterviewsService,
  type InterviewsService,
} from "../domain/interviews/interview.js";
import {
  createJobDescriptionsService,
  type JobDescriptionsService,
} from "../domain/job-descriptions/job-description.js";
import {
  createApplicationsService,
  type ApplicationsService,
} from "../domain/applications/application.js";
import {
  createRoleTracksService,
  type RoleTracksService,
} from "../domain/role-tracks/role-track.js";
import {
  createResumeVersionsService,
  type ResumeVersionsService,
} from "../domain/resumes/resume-version.js";
import {
  createRemindersService,
  type RemindersService,
} from "../domain/reminders/reminder.js";
import type { Database } from "../infrastructure/postgres.js";
import {
  createAnalyticsService,
  type AnalyticsService,
} from "../domain/analytics/analytics.js";
import {
  createSearchService,
  type SearchService,
} from "../domain/search/search.js";
import { createAnalyticsRepository } from "../persistence/postgres/analytics-repository.js";
import { createSearchRepository } from "../persistence/postgres/search-repository.js";
import {
  createAnalysisService,
  type AnalysisService,
} from "../domain/analysis/analysis.js";
import { createAnalysisRepository } from "../persistence/postgres/analysis-repository.js";
import { createCompaniesRepository } from "../persistence/postgres/companies-repository.js";
import { createContactsRepository } from "../persistence/postgres/contacts-repository.js";
import { createInterviewsRepository } from "../persistence/postgres/interviews-repository.js";
import { createJobDescriptionsRepository } from "../persistence/postgres/job-descriptions-repository.js";
import { createApplicationsRepository } from "../persistence/postgres/applications-repository.js";
import { createRoleTracksRepository } from "../persistence/postgres/role-tracks-repository.js";
import { createResumeVersionsRepository } from "../persistence/postgres/resume-versions-repository.js";
import { createRemindersRepository } from "../persistence/postgres/reminders-repository.js";
import {
  createDashboardService,
  type DashboardCache,
  type DashboardService,
} from "../domain/dashboard/dashboard.js";
import { createDashboardRepository } from "../persistence/postgres/dashboard-repository.js";

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
