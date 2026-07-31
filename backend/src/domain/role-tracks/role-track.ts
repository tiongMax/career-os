import { z } from "zod";

import { DomainValidationError } from "../errors.js";

export interface RoleTrack {
  id: string;
  name: string;
  createdAt: Date;
}

export const createRoleTrackInputSchema = z.strictObject({
  name: z.string().default(""),
});

export type CreateRoleTrackInput = z.infer<typeof createRoleTrackInputSchema>;

export interface RoleTracksRepository {
  create: (name: string) => Promise<RoleTrack>;
  list: () => Promise<RoleTrack[]>;
}

export interface RoleTracksService {
  create: (input: CreateRoleTrackInput) => Promise<RoleTrack>;
  list: () => Promise<RoleTrack[]>;
}

export class DefaultRoleTracksService implements RoleTracksService {
  constructor(private readonly repository: RoleTracksRepository) {}

  async create(input: CreateRoleTrackInput): Promise<RoleTrack> {
    const name = input.name.trim().toLowerCase();
    if (name === "") {
      throw new DomainValidationError("role track name is required");
    }
    return this.repository.create(name);
  }

  async list(): Promise<RoleTrack[]> {
    return this.repository.list();
  }
}
