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
import type { Database } from "../infrastructure/postgres.js";
import { createCompaniesRepository } from "../persistence/postgres/companies-repository.js";
import { createContactsRepository } from "../persistence/postgres/contacts-repository.js";
import { createInterviewsRepository } from "../persistence/postgres/interviews-repository.js";
import { createJobDescriptionsRepository } from "../persistence/postgres/job-descriptions-repository.js";
import { createApplicationsRepository } from "../persistence/postgres/applications-repository.js";
import { createRoleTracksRepository } from "../persistence/postgres/role-tracks-repository.js";
import { createResumeVersionsRepository } from "../persistence/postgres/resume-versions-repository.js";

export interface ApiServices {
  applications: ApplicationsService;
  companies: CompaniesService;
  contacts: ContactsService;
  interviews: InterviewsService;
  jobDescriptions: JobDescriptionsService;
  roleTracks: RoleTracksService;
  resumeVersions: ResumeVersionsService;
}

export function createApiServices(database: Database): ApiServices {
  return {
    applications: createApplicationsService(
      createApplicationsRepository(database),
    ),
    companies: createCompaniesService(createCompaniesRepository(database)),
    contacts: createContactsService(createContactsRepository(database)),
    interviews: createInterviewsService(createInterviewsRepository(database)),
    jobDescriptions: createJobDescriptionsService(
      createJobDescriptionsRepository(database),
    ),
    roleTracks: createRoleTracksService(createRoleTracksRepository(database)),
    resumeVersions: createResumeVersionsService(
      createResumeVersionsRepository(database),
    ),
  };
}
