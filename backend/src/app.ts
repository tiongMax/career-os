import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { LogController, type FastifyServerOptions } from "fastify";
import { randomUUID } from "node:crypto";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { registerErrorHandler } from "./shared/http-errors.js";
import type { HealthChecks } from "./routes/health.js";
import type { ApiServices } from "./services.js";
import { apiRoutes } from "./routes.js";

export interface BuildAppOptions {
  healthChecks: HealthChecks;
  logger?: FastifyServerOptions["logger"];
  logLevel?: string;
  services?: ApiServices;
}

export async function buildApp(options: BuildAppOptions) {
  const app = Fastify({
    logger: options.logger ?? { level: options.logLevel ?? "info" },
    logController: new LogController({ disableRequestLogging: true }),
    requestIdHeader: false,
    genReqId(request) {
      const incoming = request.headers["x-request-id"];
      return typeof incoming === "string" &&
        /^[A-Za-z0-9._-]{1,64}$/.test(incoming)
        ? incoming
        : randomUUID();
    },
    routerOptions: { ignoreTrailingSlash: true },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  registerErrorHandler(app);

  app.addHook("onRequest", (request, reply, done) => {
    reply.header("x-request-id", request.id);
    done();
  });

  app.addHook("onResponse", (request, reply, done) => {
    request.log.info(
      {
        method: request.method,
        path: request.url.split("?", 1)[0],
        responseTimeMs: Number(reply.elapsedTime.toFixed(1)),
        statusCode: reply.statusCode,
      },
      "request completed",
    );
    done();
  });

  await app.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  await app.register(multipart, {
    limits: { files: 1, fileSize: 32 * 1024 * 1024 },
  });

  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "CareerOS API",
        description:
          "REST API for the CareerOS job application operating system.",
        version: "1.0.0",
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: "/api/v1/docs",
  });

  await app.register(
    apiRoutes({
      healthChecks: options.healthChecks,
      ...(options.services ? { services: options.services } : {}),
    }),
    { prefix: "/api/v1" },
  );

  return app;
}
