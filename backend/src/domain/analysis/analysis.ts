import { randomBytes } from "node:crypto";
import { z } from "zod";
import { DomainValidationError } from "../errors.js";

export const jobTypes = ["resume_match", "jd_extract", "prep_brief"] as const;
export const createAnalysisJobInputSchema = z.strictObject({
  job_type: z.string().default(""),
});
export type AnalysisJobType = (typeof jobTypes)[number];
export interface AnalysisJob {
  id: string;
  applicationId: string;
  jobType: string;
  status: string;
  inputSnapshot: unknown;
  result: unknown;
  errorMessage: string | null;
  retryCount: number;
  idempotencyKey: string;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
export interface AnalysisRepository {
  create: (
    applicationId: string,
    jobType: AnalysisJobType,
    snapshot: unknown,
    key: string,
  ) => Promise<AnalysisJob>;
  list: () => Promise<AnalysisJob[]>;
  listByApplication: (id: string) => Promise<AnalysisJob[]>;
  get: (id: string) => Promise<AnalysisJob>;
}
export interface AnalysisService {
  create: (
    applicationId: string,
    input: { job_type: string },
  ) => Promise<AnalysisJob>;
  list: () => Promise<AnalysisJob[]>;
  listByApplication: (id: string) => Promise<AnalysisJob[]>;
  get: (id: string) => Promise<AnalysisJob>;
}
export function createAnalysisService(
  repository: AnalysisRepository,
): AnalysisService {
  return {
    async create(applicationId, input) {
      const jobType = input.job_type.trim();
      if (!jobTypes.includes(jobType as AnalysisJobType))
        throw new DomainValidationError("unsupported analysis job type");
      return repository.create(
        applicationId,
        jobType as AnalysisJobType,
        { application_id: applicationId, job_type: jobType },
        randomBytes(16).toString("hex"),
      );
    },
    list: repository.list,
    listByApplication: repository.listByApplication,
    get: repository.get,
  };
}

export interface AnalysisResult {
  summary: string;
  recommended_resume_id?: string | undefined;
  recommended_resume_name?: string | undefined;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  extracted_keywords?: string[] | undefined;
  core_requirements?: string[] | undefined;
  responsibilities?: string[] | undefined;
  seniority?: string | undefined;
  resume_feedback: string[];
  interview_focus: string[];
  prep_plan?: string[] | undefined;
  talking_points?: string[] | undefined;
  suggested_questions?: string[] | undefined;
  embedding_matches?: EmbeddingMatch[] | undefined;
  generated_at: string;
}
export interface EmbeddingMatch {
  resume_version_id: string;
  resume_version_name: string;
  similarity: number;
}
export interface AnalysisProvider {
  analyze: (input: unknown) => Promise<Omit<AnalysisResult, "generated_at">>;
  embed?: (text: string, taskType: EmbeddingTaskType) => Promise<number[]>;
}
export type EmbeddingTaskType = "RETRIEVAL_QUERY" | "RETRIEVAL_DOCUMENT";
