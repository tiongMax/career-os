import { buildApp } from "../api/server.js";
import { createApiServices } from "../app/services.js";
import { loadConfig } from "../config/config.js";
import { createPostgres } from "../infrastructure/postgres.js";
import {
  createRedisConnection,
  type RedisConnection,
} from "../infrastructure/redis.js";
import { createRedisReminderScheduler } from "../infrastructure/reminders-redis.js";

const config = loadConfig();
const postgres = createPostgres(config.DATABASE_URL);
let redisConnection: RedisConnection | undefined;
const app = await buildApp({
  logLevel: config.LOG_LEVEL,
  services: createApiServices(postgres.db, {
    reminderScheduler: createRedisReminderScheduler(() => {
      if (redisConnection === undefined)
        throw new Error("redis is not connected");
      return redisConnection.client;
    }),
  }),
  healthChecks: {
    postgres: () => postgres.ping(),
    redis: async () => {
      if (redisConnection === undefined) {
        throw new Error("redis is not connected");
      }
      await redisConnection.ping();
    },
  },
});

let closing = false;

async function shutdown(signal: string): Promise<void> {
  if (closing) {
    return;
  }
  closing = true;
  app.log.info({ signal }, "api server shutting down");

  const shutdownTimeout = setTimeout(() => {
    app.log.fatal("api server shutdown timed out");
    process.exit(1);
  }, 10_000);
  shutdownTimeout.unref();

  try {
    await app.close();
    await redisConnection?.close();
    await postgres.close();
    clearTimeout(shutdownTimeout);
  } catch (error) {
    app.log.error({ err: error }, "api server shutdown failed");
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  redisConnection = await createRedisConnection(config.REDIS_URL, (error) => {
    app.log.error({ err: error }, "redis client error");
  });
  await postgres.ping();
  await redisConnection.ping();
  await app.listen({ host: config.API_HOST, port: config.API_PORT });
} catch (error) {
  app.log.fatal({ err: error }, "api server failed to start");
  await shutdown("startup-error");
  process.exitCode = 1;
}
