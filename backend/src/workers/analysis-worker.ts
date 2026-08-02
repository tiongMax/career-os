import type {
  AnalysisJob,
  AnalysisProvider,
  AnalysisResult,
  EmbeddingMatch,
} from "../domain/analysis/analysis.js";
import type { JobDescription } from "../domain/job-descriptions/job-description.js";
import type { ResumeVersion } from "../domain/resumes/resume-version.js";
import type { AnalysisPersistence } from "../persistence/postgres/analysis-repository.js";
export interface AnalysisInput {
  job: AnalysisJob;
  application: unknown;
  company: unknown;
  job_description: JobDescription | null;
  resume: ResumeVersion | null;
  resume_versions: ResumeVersion[];
  embedding_matches?: EmbeddingMatch[];
}
export interface AnalysisProcessor {
  processNext: () => Promise<AnalysisJob | null>;
  run: (signal: AbortSignal) => Promise<void>;
}
export function createAnalysisProcessor(options: {
  store: AnalysisPersistence;
  provider: AnalysisProvider;
  buildInput: (job: AnalysisJob) => Promise<AnalysisInput>;
  persistJobDescriptionExtraction?: (
    description: JobDescription,
    result: Omit<AnalysisResult, "generated_at">,
  ) => Promise<void>;
  maxRetries: number;
  pollIntervalMs: number;
  now?: () => Date;
}): AnalysisProcessor {
  const max = options.maxRetries <= 0 ? 3 : options.maxRetries;
  const now = options.now ?? (() => new Date());
  async function processNext() {
    const job = await options.store.claim();
    if (!job) return null;
    try {
      const input = await options.buildInput(job);
      if (job.jobType === "resume_match" && options.provider.embed) {
        input.embedding_matches = await rankResumes(
          input,
          options.provider.embed,
        );
      }
      const result = await options.provider.analyze(input);
      if (input.embedding_matches?.length) {
        const bestMatch = input.embedding_matches[0];
        result.embedding_matches = input.embedding_matches;
        if (bestMatch) {
          result.recommended_resume_id ??= bestMatch.resume_version_id;
          result.recommended_resume_name ??= bestMatch.resume_version_name;
        }
        if (result.match_score === 0)
          result.match_score = bestMatch?.similarity ?? 0;
      }
      if (
        job.jobType === "jd_extract" &&
        input.job_description &&
        options.persistJobDescriptionExtraction
      ) {
        await options.persistJobDescriptionExtraction(
          input.job_description,
          result,
        );
      }
      return await options.store.complete(job.id, {
        ...result,
        matched_skills: result.matched_skills,
        missing_skills: result.missing_skills,
        resume_feedback: result.resume_feedback,
        interview_focus: result.interview_focus,
        generated_at: now().toISOString(),
      });
    } catch (error) {
      return await options.store.fail(
        job.id,
        error instanceof Error ? error.message : String(error),
        max,
      );
    }
  }
  return {
    processNext,
    async run(signal) {
      for (;;) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, options.pollIntervalMs);
          signal.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true },
          );
        });
        if (signal.aborted) break;
        await processNext();
      }
    },
  };
}

async function rankResumes(
  input: AnalysisInput,
  embed: NonNullable<AnalysisProvider["embed"]>,
): Promise<EmbeddingMatch[]> {
  if (!input.job_description) return [];
  const query = await embed(input.job_description.rawText, "RETRIEVAL_QUERY");
  const matches = await Promise.all(
    input.resume_versions.map(async (resume) => ({
      resume_version_id: resume.id,
      resume_version_name: resume.name,
      similarity: cosineSimilarity(
        query,
        await embed(resumeText(resume), "RETRIEVAL_DOCUMENT"),
      ),
    })),
  );
  return matches
    .filter(({ resume_version_name, similarity }) =>
      Boolean(resume_version_name.trim() && similarity > 0),
    )
    .sort((left, right) => right.similarity - left.similarity);
}

function resumeText(resume: ResumeVersion): string {
  return [resume.name, resume.track, resume.contentText, ...resume.tags]
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) return 0;
  const dot = left.reduce(
    (sum, value, index) => sum + value * (right[index] ?? 0),
    0,
  );
  const leftNorm = Math.sqrt(left.reduce((sum, value) => sum + value ** 2, 0));
  const rightNorm = Math.sqrt(
    right.reduce((sum, value) => sum + value ** 2, 0),
  );
  return leftNorm === 0 || rightNorm === 0 ? 0 : dot / (leftNorm * rightNorm);
}
