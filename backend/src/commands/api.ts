import { buildApp } from "../api/server.js";
import { createApiServices } from "../app/services.js";
import { loadConfig } from "../config/config.js";
import { createPostgres } from "../infrastructure/postgres.js";
import { createLoggerOptions } from "../infrastructure/logger.js";

const config = loadConfig();
const postgres = createPostgres(config.DATABASE_URL);
const app = await buildApp({
  logger: createLoggerOptions(config.LOG_LEVEL, config.LOG_PRETTY),
  services: createApiServices(postgres.db),
  healthChecks: {
    postgres: () => postgres.ping(),
  },
});

app.addHook("onClose", async () => {
  await postgres.close();
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
  await postgres.ping();
  await app.listen({ host: config.API_HOST, port: config.API_PORT });
} catch (error) {
  app.log.fatal({ err: error }, "api server failed to start");
  await shutdown("startup-error");
  process.exitCode = 1;
}
