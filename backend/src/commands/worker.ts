import { loadConfig } from "../config/config.js";
import { createPostgres } from "../infrastructure/postgres.js";
import { createRedisReminderQueue } from "../infrastructure/reminders-redis.js";
import { createRedisConnection } from "../infrastructure/redis.js";
import { createRemindersRepository } from "../persistence/postgres/reminders-repository.js";
import {
  createReminderWorker,
  type ReminderWorkerLogger,
} from "../workers/reminder-worker.js";

const logger: ReminderWorkerLogger = {
  info(message, context) {
    writeLog("info", message, context);
  },
  error(message, error, context) {
    writeLog("error", message, {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    });
  },
};

const config = loadConfig();
const postgres = createPostgres(config.DATABASE_URL);
const redis = await createRedisConnection(config.REDIS_URL, (error) => {
  logger.error("redis client error", error);
});
const controller = new AbortController();
const worker = createReminderWorker({
  store: createRemindersRepository(postgres.db),
  queue: createRedisReminderQueue(redis.client),
  pollIntervalMs: config.REMINDER_WORKER_POLL_INTERVAL_MS,
  maxRetries: config.REMINDER_MAX_RETRIES,
  logger,
});

process.once("SIGINT", () => {
  controller.abort();
});
process.once("SIGTERM", () => {
  controller.abort();
});

try {
  await postgres.ping();
  await redis.ping();
  await worker.run(controller.signal);
} catch (error) {
  logger.error("reminder worker failed", error);
  process.exitCode = 1;
} finally {
  await redis.close();
  await postgres.close();
}

function writeLog(
  level: "info" | "error",
  message: string,
  context?: Record<string, unknown>,
): void {
  const record = JSON.stringify({
    level,
    time: new Date().toISOString(),
    message,
    ...context,
  });
  if (level === "error") console.error(record);
  else console.log(record);
}
