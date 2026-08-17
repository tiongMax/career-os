import pino from "pino";
import { loadConfig } from "../config/env.js";
import { createPostgres } from "../database/client.js";
import { createAnalysisRepository } from "../features/analysis/analysis.repository.js";
import { createJobDescriptionsRepository } from "../features/job-descriptions/job-description.repository.js";
import { createResumeVersionsRepository } from "../features/resumes/resume-version.repository.js";
import { createGeminiProvider } from "../features/analysis/gemini.provider.js";
import { createAnalysisProcessor } from "../features/analysis/analysis.worker.js";
import { createLoggerOptions } from "../shared/logger.js";

const config = loadConfig();
const baseLogger = pino(
  createLoggerOptions(config.LOG_LEVEL, config.LOG_PRETTY),
);

const postgres = createPostgres(config.DATABASE_URL);
const controller = new AbortController();
const analysisWorker =
  config.GEMINI_API_KEY === "" ? undefined : createAnalysisWorker();

function createAnalysisWorker() {
  const descriptions = createJobDescriptionsRepository(postgres.db);
  const resumes = createResumeVersionsRepository(postgres.db);
  return createAnalysisProcessor({
    store: createAnalysisRepository(postgres.db),
    provider: createGeminiProvider({
      apiKey: config.GEMINI_API_KEY,
      model: config.GEMINI_MODEL,
      embeddingModel: config.GEMINI_EMBEDDING_MODEL,
      baseUrl: config.GEMINI_BASE_URL,
      timeoutMs: config.GEMINI_TIMEOUT_MS,
    }),
    async buildInput(job) {
      const [context, resumeVersions] = await Promise.all([
        descriptions.getPrepContext(job.applicationId),
        resumes.list(),
      ]);
      return {
        job,
        application: context.application,
        company: context.company,
        job_description: context.jobDescription,
        resume: context.resume,
        resume_versions: resumeVersions,
      };
    },
    async persistJobDescriptionExtraction(description, result) {
      const keywords = result.extracted_keywords?.length
        ? result.extracted_keywords
        : result.matched_skills;
      if (!keywords.length && !result.summary.trim()) return;
      await descriptions.update(description.id, {
        ai_summary: result.summary || undefined,
        extracted_keywords: keywords.length ? keywords : undefined,
      });
    },
    maxRetries: config.AI_ANALYSIS_MAX_RETRIES,
    pollIntervalMs: config.AI_ANALYSIS_WORKER_POLL_INTERVAL_MS,
  });
}

process.once("SIGINT", () => {
  controller.abort();
});
process.once("SIGTERM", () => {
  controller.abort();
});

try {
  await postgres.ping();
  if (analysisWorker === undefined) {
    baseLogger.info("AI analysis worker disabled: GEMINI_API_KEY is empty");
    await waitForAbort(controller.signal);
  } else {
    baseLogger.info("AI analysis worker started");
    await analysisWorker.run(controller.signal);
  }
} catch (error) {
  baseLogger.error({ err: error }, "AI analysis worker failed");
  process.exitCode = 1;
} finally {
  await postgres.close();
}

function waitForAbort(signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    signal.addEventListener(
      "abort",
      () => {
        resolve();
      },
      { once: true },
    );
  });
}
