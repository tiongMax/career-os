import { buildApp } from "../api/server.js";
import { createApiServices } from "../app/services.js";
import { loadConfig } from "../config/config.js";
import { createPostgres } from "../infrastructure/postgres.js";
import { createLoggerOptions } from "../infrastructure/logger.js";
import {
  createRedisConnection,
  type RedisConnection,
} from "../infrastructure/redis.js";
import { createRedisDashboardCache } from "../infrastructure/dashboard-redis.js";

const config = loadConfig();
const postgres = createPostgres(config.DATABASE_URL);
let redisConnection: RedisConnection | undefined;
let reportDashboardCacheError: (error: unknown) => void = () => {
  // Replaced with the Fastify logger immediately after app construction.
};
const getRedisClient = () => {
  if (redisConnection === undefined) throw new Error("redis is not connected");
  return redisConnection.client;
};
const dashboardCache = createRedisDashboardCache(
  getRedisClient,
  config.DASHBOARD_CACHE_TTL_SECONDS,
  (error) => {
    reportDashboardCacheError(error);
  },
);
const app = await buildApp({
  logger: createLoggerOptions(config.LOG_LEVEL, config.LOG_PRETTY),
  services: createApiServices(postgres.db, {
    dashboardCache,
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
reportDashboardCacheError = (error) => {
  app.log.warn({ err: error }, "dashboard cache operation failed");
};

app.addHook("onClose", async () => {
  await Promise.all([redisConnection?.close(), postgres.close()]);
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
