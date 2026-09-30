import { z } from "zod";

const rawEnvironmentSchema = z.object({
  APP_ENV: z.string().min(1).default("development"),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(8080),
  DATABASE_URL: z
    .string()
    .min(1)
    .default(
      "postgres://postgres:postgres@localhost:5432/careeros?sslmode=disable",
    ),
  REDIS_URL: z.string().min(1).default("redis://localhost:6379"),
  DASHBOARD_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  LOG_PRETTY: z.stringbool().optional(),
});

const environmentSchema = rawEnvironmentSchema.transform((config) => ({
  ...config,
  LOG_PRETTY: config.LOG_PRETTY ?? config.APP_ENV === "development",
}));

export type Config = z.infer<typeof environmentSchema>;

export function loadConfig(
  environment: NodeJS.ProcessEnv = process.env,
): Config {
  return environmentSchema.parse(environment);
}
