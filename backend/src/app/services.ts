import {
  createCompaniesService,
  type CompaniesService,
} from "../domain/companies/company.js";
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
import type { Database } from "../infrastructure/postgres.js";
import { createCompaniesRepository } from "../persistence/postgres/companies-repository.js";
import { createApplicationsRepository } from "../persistence/postgres/applications-repository.js";
import { createRoleTracksRepository } from "../persistence/postgres/role-tracks-repository.js";
import { createResumeVersionsRepository } from "../persistence/postgres/resume-versions-repository.js";

export interface ApiServices {
  applications: ApplicationsService;
  companies: CompaniesService;
  roleTracks: RoleTracksService;
  resumeVersions: ResumeVersionsService;
}

export function createApiServices(database: Database): ApiServices {
  return {
    applications: createApplicationsService(
      createApplicationsRepository(database),
    ),
    companies: createCompaniesService(createCompaniesRepository(database)),
    roleTracks: createRoleTracksService(createRoleTracksRepository(database)),
    resumeVersions: createResumeVersionsService(
      createResumeVersionsRepository(database),
    ),
  };
}
