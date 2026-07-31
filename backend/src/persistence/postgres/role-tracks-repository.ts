import { asc } from "drizzle-orm";

import type { RoleTrack } from "../../domain/role-tracks/role-track.js";
import type { Database } from "../../infrastructure/postgres.js";
import { roleTracks } from "./schema.js";

export class DrizzleRoleTracksRepository {
  constructor(private readonly database: Database) {}

  async create(name: string): Promise<RoleTrack> {
    const [roleTrack] = await this.database
      .insert(roleTracks)
      .values({ name })
      .returning();

    if (roleTrack === undefined) {
      throw new Error("role track insert returned no row");
    }
    return roleTrack;
  }

  async list(): Promise<RoleTrack[]> {
    return this.database.select().from(roleTracks).orderBy(asc(roleTracks.name));
  }
}
