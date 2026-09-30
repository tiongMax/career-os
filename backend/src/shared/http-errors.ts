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

const clientErrors: Readonly<
  Record<string, { status: number; message: string }>
> = {
  FST_ERR_CTP_INVALID_JSON_BODY: { status: 400, message: "invalid JSON body" },
  FST_ERR_CTP_EMPTY_JSON_BODY: { status: 400, message: "invalid JSON body" },
  FST_ERR_CTP_BODY_TOO_LARGE: {
    status: 413,
    message: "request body too large",
  },
  FST_ERR_CTP_INVALID_MEDIA_TYPE: {
    status: 415,
    message: "unsupported media type",
  },
  FST_REQ_FILE_TOO_LARGE: {
    status: 413,
    message: "PDF exceeds the 32 MiB limit",
  },
  FST_FILES_LIMIT: { status: 413, message: "too many uploaded files" },
  FST_FIELDS_LIMIT: { status: 413, message: "too many multipart fields" },
  FST_PARTS_LIMIT: { status: 413, message: "too many multipart parts" },
  FST_INVALID_MULTIPART_CONTENT_TYPE: {
    status: 415,
    message: "expected multipart/form-data",
  },
  FST_PROTO_VIOLATION: { status: 400, message: "invalid multipart field" },
  FST_MP_PREMATURE_CLOSE: { status: 400, message: "incomplete multipart form" },
};

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({
        error: "invalid JSON body",
      });
    }

    const clientError = clientErrors[error.code];
    if (clientError !== undefined) {
      return reply
        .status(clientError.status)
        .send({ error: clientError.message });
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
      return reply
        .status(400)
        .send({ error: "referenced resource does not exist" });
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
