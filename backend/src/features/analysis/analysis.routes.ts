import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  createAnalysisJobInputSchema,
  type AnalysisJob,
  type AnalysisService,
} from "./analysis.service.js";
import {
  errorResponseSchema,
  idParamsSchema,
  requireUUID,
} from "../../shared/http-schemas.js";
const schema = z.object({
  id: z.uuid(),
  application_id: z.uuid(),
  job_type: z.string(),
  status: z.string(),
  input_snapshot: z.unknown(),
  result: z.unknown().optional(),
  error_message: z.string().optional(),
  retry_count: z.number().int(),
  idempotency_key: z.string(),
  started_at: z.iso.datetime().optional(),
  completed_at: z.iso.datetime().optional(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
export function analysisRoutes(
  service: AnalysisService,
): FastifyPluginCallbackZod {
  return (app, _o, done) => {
    app.post(
      "/applications/:id/ai-analysis-jobs",
      {
        schema: {
          tags: ["AI analysis"],
          params: idParamsSchema,
          body: createAnalysisJobInputSchema,
          response: { 201: schema, 400: errorResponseSchema },
        },
      },
      async (req, reply) =>
        reply
          .status(201)
          .send(dto(await service.create(appId(req.params.id), req.body))),
    );
    app.get(
      "/applications/:id/ai-analysis-jobs",
      {
        schema: {
          tags: ["AI analysis"],
          params: idParamsSchema,
          response: { 200: z.array(schema) },
        },
      },
      async (req) =>
        (await service.listByApplication(appId(req.params.id))).map(dto),
    );
    app.get(
      "/ai-analysis-jobs",
      { schema: { tags: ["AI analysis"], response: { 200: z.array(schema) } } },
      async () => (await service.list()).map(dto),
    );
    app.get(
      "/ai-analysis-jobs/:id",
      {
        schema: {
          tags: ["AI analysis"],
          params: idParamsSchema,
          response: {
            200: schema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (req) => dto(await service.get(jobId(req.params.id))),
    );
    done();
  };
}
function appId(id: string) {
  return requireUUID(id, "invalid application id");
}
function jobId(id: string) {
  return requireUUID(id, "invalid analysis job id");
}
function dto(v: AnalysisJob) {
  return {
    id: v.id,
    application_id: v.applicationId,
    job_type: v.jobType,
    status: v.status,
    input_snapshot: v.inputSnapshot,
    ...(v.result === null ? {} : { result: v.result }),
    ...(v.errorMessage === null ? {} : { error_message: v.errorMessage }),
    retry_count: v.retryCount,
    idempotency_key: v.idempotencyKey,
    ...(v.startedAt === null ? {} : { started_at: v.startedAt.toISOString() }),
    ...(v.completedAt === null
      ? {}
      : { completed_at: v.completedAt.toISOString() }),
    created_at: v.createdAt.toISOString(),
    updated_at: v.updatedAt.toISOString(),
  };
}
