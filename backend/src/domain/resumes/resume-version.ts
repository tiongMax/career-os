import { z } from "zod";

import { DomainValidationError } from "../errors.js";

const allowedTracks = new Set(["backend", "ai", "quant", "general"]);

export interface ResumeVersion {
  id: string;
  name: string;
  track: string;
  contentText: string | null;
  hasPdf: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const createResumeVersionInputSchema = z.strictObject({
  name: z.string().default(""),
  track: z.string().default(""),
  content_text: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

export const updateResumeVersionInputSchema = z.strictObject({
  name: z.string().nullable().optional(),
  track: z.string().nullable().optional(),
  content_text: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

export type CreateResumeVersionInput = z.infer<
  typeof createResumeVersionInputSchema
>;
export type UpdateResumeVersionInput = z.infer<
  typeof updateResumeVersionInputSchema
>;

export interface ResumeVersionsRepository {
  create: (
    input: CreateResumeVersionInput & { tags: string[] },
  ) => Promise<ResumeVersion>;
  list: () => Promise<ResumeVersion[]>;
  get: (id: string) => Promise<ResumeVersion>;
  update: (
    id: string,
    input: UpdateResumeVersionInput,
  ) => Promise<ResumeVersion>;
  delete: (id: string) => Promise<void>;
  storePdf: (id: string, data: Buffer) => Promise<void>;
  getPdf: (id: string) => Promise<Buffer | null>;
}

export interface ResumeVersionsService {
  create: (input: CreateResumeVersionInput) => Promise<ResumeVersion>;
  list: () => Promise<ResumeVersion[]>;
  get: (id: string) => Promise<ResumeVersion>;
  update: (
    id: string,
    input: UpdateResumeVersionInput,
  ) => Promise<ResumeVersion>;
  delete: (id: string) => Promise<void>;
  storePdf: (id: string, data: Buffer) => Promise<void>;
  getPdf: (id: string) => Promise<Buffer | null>;
}

export function createResumeVersionsService(
  repository: ResumeVersionsRepository,
): ResumeVersionsService {
  return {
    async create(input) {
      requireName(input.name);
      requireTrack(input.track);
      return repository.create({ ...input, tags: input.tags ?? [] });
    },
    list: () => repository.list(),
    get: (id) => repository.get(id),
    async update(id, input) {
      if (input.name != null) requireName(input.name);
      if (input.track != null) requireTrack(input.track);
      return repository.update(id, input);
    },
    delete: (id) => repository.delete(id),
    storePdf: (id, data) => repository.storePdf(id, data),
    getPdf: (id) => repository.getPdf(id),
  };
}

function requireName(name: string): void {
  if (name.trim() === "") {
    throw new DomainValidationError("resume version name is required");
  }
}

function requireTrack(track: string): void {
  if (!allowedTracks.has(track)) {
    throw new DomainValidationError(
      "resume track must be one of backend, ai, quant, general",
    );
  }
}
