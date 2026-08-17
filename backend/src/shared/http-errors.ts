import type { FastifyError, FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";

import { DomainConflictError, DomainValidationError } from "./domain-errors.js";
import { EntityNotFoundError, hasPostgresCode } from "../database/errors.js";

export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: "invalid JSON body",
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: error.message,
      });
    }

    if (error instanceof EntityNotFoundError) {
      return reply.status(404).send({ error: "not found" });
    }

    if (error instanceof DomainValidationError) {
      return reply.status(400).send({ error: error.message });
    }

    if (error instanceof DomainConflictError) {
      return reply.status(409).send({ error: error.message });
    }

    if (hasPostgresCode(error, "23505")) {
      return reply.status(409).send({ error: "already exists" });
    }

    if (hasPostgresCode(error, "23503")) {
      return reply.status(400).send({ error: "invalid role track" });
    }

    if (hasPostgresCode(error, "23514") || hasPostgresCode(error, "22P02")) {
      return reply
        .status(400)
        .send({ error: "request violates data constraints" });
    }

    request.log.error({ err: error }, "request failed");
    return reply.status(500).send({
      error: "internal server error",
    });
  });
}
