import { z } from "zod";

import { DomainValidationError } from "../../shared/domain-errors.js";

export const createJobDescriptionInputSchema = z.strictObject({
  raw_text: z.string().default(""),
});

export const updateJobDescriptionInputSchema = z.strictObject({
  raw_text: z.string().nullable().optional(),
});

export type CreateJobDescriptionInput = z.infer<
  typeof createJobDescriptionInputSchema
>;
export type UpdateJobDescriptionInput = z.infer<
  typeof updateJobDescriptionInputSchema
>;

export interface JobDescription {
  id: string;
  applicationId: string;
  rawText: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobDescriptionsRepository {
  create: (
    applicationId: string,
    input: CreateJobDescriptionInput,
  ) => Promise<JobDescription>;
  getByApplication: (applicationId: string) => Promise<JobDescription>;
  update: (
    id: string,
    input: UpdateJobDescriptionInput,
  ) => Promise<JobDescription>;
}

export type JobDescriptionsService = JobDescriptionsRepository;

export function createJobDescriptionsService(
  repository: JobDescriptionsRepository,
): JobDescriptionsService {
  return {
    async create(applicationId, input) {
      requireRawText(input.raw_text);
      return repository.create(applicationId, input);
    },
    getByApplication: (applicationId) =>
      repository.getByApplication(applicationId),
    async update(id, input) {
      if (input.raw_text != null) requireRawText(input.raw_text);
      return repository.update(id, input);
    },
  };
}

function requireRawText(rawText: string): void {
  if (rawText.trim() === "") {
    throw new DomainValidationError("job description raw_text is required");
  }
}
