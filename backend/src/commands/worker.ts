import pino from "pino";
import { loadConfig } from "../config/config.js";
import { createPostgres } from "../infrastructure/postgres.js";
import { createRedisReminderQueue } from "../infrastructure/reminders-redis.js";
import { createRedisConnection } from "../infrastructure/redis.js";
import { createRemindersRepository } from "../persistence/postgres/reminders-repository.js";
import { createAnalysisRepository } from "../persistence/postgres/analysis-repository.js";
import { createJobDescriptionsRepository } from "../persistence/postgres/job-descriptions-repository.js";
import { createResumeVersionsRepository } from "../persistence/postgres/resume-versions-repository.js";
import { createGeminiProvider } from "../infrastructure/gemini.js";
import { createAnalysisProcessor } from "../workers/analysis-worker.js";
import { createLoggerOptions } from "../infrastructure/logger.js";
import { createRedisDashboardCache } from "../infrastructure/dashboard-redis.js";
import {
  createReminderWorker,
  type ReminderWorkerLogger,
} from "../workers/reminder-worker.js";

const config = loadConfig();
const baseLogger = pino(
  createLoggerOptions(config.LOG_LEVEL, config.LOG_PRETTY),
);
const logger: ReminderWorkerLogger = {
  info(message, context) {
    baseLogger.info(context ?? {}, message);
  },
  error(message, error, context) {
    baseLogger.error(
      {
        ...context,
        err: error,
      },
      message,
    );
  },
};

const postgres = createPostgres(config.DATABASE_URL);
const redis = await createRedisConnection(config.REDIS_URL, (error) => {
  logger.error("redis client error", error);
});
const dashboardCache = createRedisDashboardCache(
  () => redis.client,
  config.DASHBOARD_CACHE_TTL_SECONDS,
  (error) => {
    logger.error("dashboard cache operation failed", error);
  },
);
const controller = new AbortController();
const worker = createReminderWorker({
  store: createRemindersRepository(postgres.db),
  queue: createRedisReminderQueue(redis.client),
  pollIntervalMs: config.REMINDER_WORKER_POLL_INTERVAL_MS,
  maxRetries: config.REMINDER_MAX_RETRIES,
  onChanged: () => dashboardCache.invalidate(),
  logger,
});
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
  await redis.ping();
  await Promise.all([
    worker.run(controller.signal),
    analysisWorker?.run(controller.signal),
  ]);
} catch (error) {
  logger.error("reminder worker failed", error);
  process.exitCode = 1;
} finally {
  await redis.close();
  await postgres.close();
}
