import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyServerOptions } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { stringify } from "yaml";

import { registerErrorHandler } from "./errors.js";
import { healthRoutes, type HealthChecks } from "./routes/health.js";

export interface BuildAppOptions {
  healthChecks: HealthChecks;
  logger?: FastifyServerOptions["logger"];
  logLevel?: string;
}

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({
    logger: options.logger ?? { level: options.logLevel ?? "info" },
    requestIdHeader: "x-request-id",
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);

  await app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "CareerOS API",
        description: "REST API for the CareerOS job application operating system.",
        version: "1.0.0",
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: "/api/v1/docs",
  });

  await app.register(healthRoutes(options.healthChecks), { prefix: "/api/v1" });

  app.get(
    "/api/v1/openapi.yaml",
    {
      schema: { hide: true },
    },
    async (_request, reply) => {
      return reply
        .header("content-type", "application/yaml; charset=utf-8")
        .header("cache-control", "public, max-age=300")
        .send(stringify(app.swagger()));
    },
  );

  return app;
}
