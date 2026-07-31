import { DefaultCompaniesService, type CompaniesService } from "../domain/companies/company.js";
import { DefaultRoleTracksService, type RoleTracksService } from "../domain/role-tracks/role-track.js";
import type { Database } from "../infrastructure/postgres.js";
import { DrizzleCompaniesRepository } from "../persistence/postgres/companies-repository.js";
import { DrizzleRoleTracksRepository } from "../persistence/postgres/role-tracks-repository.js";

export interface ApiServices {
  companies: CompaniesService;
  roleTracks: RoleTracksService;
}

export function createApiServices(database: Database): ApiServices {
  return {
    companies: new DefaultCompaniesService(new DrizzleCompaniesRepository(database)),
    roleTracks: new DefaultRoleTracksService(new DrizzleRoleTracksRepository(database)),
  };
}
