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

export type CreateResumeVersionInput = z.infer<typeof createResumeVersionInputSchema>;
export type UpdateResumeVersionInput = z.infer<typeof updateResumeVersionInputSchema>;

export interface ResumeVersionsRepository {
  create: (input: CreateResumeVersionInput & { tags: string[] }) => Promise<ResumeVersion>;
  list: () => Promise<ResumeVersion[]>;
  get: (id: string) => Promise<ResumeVersion>;
  update: (id: string, input: UpdateResumeVersionInput) => Promise<ResumeVersion>;
  delete: (id: string) => Promise<void>;
  storePdf: (id: string, data: Buffer) => Promise<void>;
  getPdf: (id: string) => Promise<Buffer | null>;
}

export interface ResumeVersionsService {
  create: (input: CreateResumeVersionInput) => Promise<ResumeVersion>;
  list: () => Promise<ResumeVersion[]>;
  get: (id: string) => Promise<ResumeVersion>;
  update: (id: string, input: UpdateResumeVersionInput) => Promise<ResumeVersion>;
  delete: (id: string) => Promise<void>;
  storePdf: (id: string, data: Buffer) => Promise<void>;
  getPdf: (id: string) => Promise<Buffer | null>;
}

export class DefaultResumeVersionsService implements ResumeVersionsService {
  constructor(private readonly repository: ResumeVersionsRepository) {}

  async create(input: CreateResumeVersionInput): Promise<ResumeVersion> {
    requireName(input.name);
    requireTrack(input.track);
    return this.repository.create({ ...input, tags: input.tags ?? [] });
  }

  async list(): Promise<ResumeVersion[]> {
    return this.repository.list();
  }

  async get(id: string): Promise<ResumeVersion> {
    return this.repository.get(id);
  }

  async update(id: string, input: UpdateResumeVersionInput): Promise<ResumeVersion> {
    if (input.name != null) requireName(input.name);
    if (input.track != null) requireTrack(input.track);
    return this.repository.update(id, input);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  async storePdf(id: string, data: Buffer): Promise<void> {
    await this.repository.storePdf(id, data);
  }

  async getPdf(id: string): Promise<Buffer | null> {
    return this.repository.getPdf(id);
  }
}

function requireName(name: string): void {
  if (name.trim() === "") {
    throw new DomainValidationError("resume version name is required");
  }
}

function requireTrack(track: string): void {
  if (!allowedTracks.has(track)) {
    throw new DomainValidationError("resume track must be one of backend, ai, quant, general");
  }
}
