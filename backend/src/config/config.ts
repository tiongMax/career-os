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
  AI_ANALYSIS_WORKER_POLL_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(1_000),
  AI_ANALYSIS_MAX_RETRIES: z.coerce.number().int().nonnegative().default(3),
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().min(1).default("gemini-3.5-flash"),
  GEMINI_EMBEDDING_MODEL: z.string().min(1).default("gemini-embedding-001"),
  GEMINI_BASE_URL: z
    .url()
    .default("https://generativelanguage.googleapis.com/v1beta"),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(90_000),
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
