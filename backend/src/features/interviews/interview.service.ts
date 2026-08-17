import { z } from "zod";

import { DomainValidationError } from "../../shared/domain-errors.js";

export const interviewRoundTypes = [
  "recruiter",
  "online_assessment",
  "technical",
  "system_design",
  "behavioral",
  "final",
] as const;

const roundTypeSet: ReadonlySet<string> = new Set(interviewRoundTypes);
const nullableString = z.string().nullable().optional();
const nullableDate = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .nullable()
  .optional();

export const createInterviewInputSchema = z.strictObject({
  round_type: z.string().default(""),
  scheduled_at: nullableDate,
  interviewer: nullableString,
  notes: nullableString,
  outcome: nullableString,
});

export const updateInterviewInputSchema = z.strictObject({
  round_type: nullableString,
  scheduled_at: nullableDate,
  interviewer: nullableString,
  notes: nullableString,
  outcome: nullableString,
});

export type CreateInterviewInput = z.infer<typeof createInterviewInputSchema>;
export type UpdateInterviewInput = z.infer<typeof updateInterviewInputSchema>;

export interface InterviewRound {
  id: string;
  applicationId: string;
  roundType: string;
  scheduledAt: Date | null;
  interviewer: string | null;
  notes: string | null;
  outcome: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterviewsRepository {
  create: (
    applicationId: string,
    input: CreateInterviewInput,
  ) => Promise<InterviewRound>;
  listByApplication: (applicationId: string) => Promise<InterviewRound[]>;
  update: (id: string, input: UpdateInterviewInput) => Promise<InterviewRound>;
  delete: (id: string) => Promise<void>;
}

export type InterviewsService = InterviewsRepository;

export function createInterviewsService(
  repository: InterviewsRepository,
): InterviewsService {
  return {
    async create(applicationId, input) {
      requireRoundType(input.round_type);
      return repository.create(applicationId, input);
    },
    listByApplication: (applicationId) =>
      repository.listByApplication(applicationId),
    async update(id, input) {
      if (input.round_type != null) requireRoundType(input.round_type);
      return repository.update(id, input);
    },
    delete: (id) => repository.delete(id),
  };
}

function requireRoundType(roundType: string): void {
  if (!roundTypeSet.has(roundType)) {
    throw new DomainValidationError(
      "interview round_type must be one of recruiter, online_assessment, technical, system_design, behavioral, final",
    );
  }
}
