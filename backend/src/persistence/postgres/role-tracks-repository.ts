import { asc } from "drizzle-orm";

import type { RoleTracksRepository } from "../../domain/role-tracks/role-track.js";
import type { Database } from "../../infrastructure/postgres.js";
import { roleTracks } from "./schema.js";

export function createRoleTracksRepository(
  database: Database,
): RoleTracksRepository {
  return {
    async create(name) {
      const [roleTrack] = await database
        .insert(roleTracks)
        .values({ name })
        .returning();

      if (roleTrack === undefined) {
        throw new Error("role track insert returned no row");
      }
      return roleTrack;
    },

    list: () =>
      database.select().from(roleTracks).orderBy(asc(roleTracks.name)),
  };
}
