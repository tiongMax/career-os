import pino from "pino";
import { loadConfig } from "../config/config.js";
import { createPostgres } from "../infrastructure/postgres.js";
import { createAnalysisRepository } from "../persistence/postgres/analysis-repository.js";
import { createJobDescriptionsRepository } from "../persistence/postgres/job-descriptions-repository.js";
import { createResumeVersionsRepository } from "../persistence/postgres/resume-versions-repository.js";
import { createGeminiProvider } from "../infrastructure/gemini.js";
import { createAnalysisProcessor } from "../workers/analysis-worker.js";
import { createLoggerOptions } from "../infrastructure/logger.js";

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
