import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  createJobDescriptionInputSchema,
  updateJobDescriptionInputSchema,
  type JobDescription,
  type JobDescriptionsService,
} from "./job-description.service.js";
import {
  errorResponseSchema,
  idParamsSchema,
  requireUUID,
} from "../../shared/http-schemas.js";

const jobDescriptionSchema = z.object({
  id: z.uuid(),
  application_id: z.uuid(),
  raw_text: z.string(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
export function jobDescriptionRoutes(
  service: JobDescriptionsService,
): FastifyPluginCallbackZod {
  return function registerJobDescriptionRoutes(app, _options, done) {
    app.post(
      "/applications/:id/job-description",
      {
        schema: {
          tags: ["Job descriptions"],
          summary: "Create job description",
          params: idParamsSchema,
          body: createJobDescriptionInputSchema,
          response: { 201: jobDescriptionSchema, 400: errorResponseSchema },
        },
      },
      async (request, reply) =>
        reply
          .status(201)
          .send(
            jobDescriptionDTO(
              await service.create(
                applicationId(request.params.id),
                request.body,
              ),
            ),
          ),
    );
    app.get(
      "/applications/:id/job-description",
      {
        schema: {
          tags: ["Job descriptions"],
          summary: "Get application job description",
          params: idParamsSchema,
          response: {
            200: jobDescriptionSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        jobDescriptionDTO(
          await service.getByApplication(applicationId(request.params.id)),
        ),
    );
    app.patch(
      "/job-descriptions/:id",
      {
        schema: {
          tags: ["Job descriptions"],
          summary: "Update job description",
          params: idParamsSchema,
          body: updateJobDescriptionInputSchema,
          response: {
            200: jobDescriptionSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        jobDescriptionDTO(
          await service.update(descriptionId(request.params.id), request.body),
        ),
    );
    done();
  };
}

function applicationId(id: string) {
  return requireUUID(id, "invalid application id");
}
function descriptionId(id: string) {
  return requireUUID(id, "invalid job description id");
}
function jobDescriptionDTO(value: JobDescription) {
  return {
    id: value.id,
    application_id: value.applicationId,
    raw_text: value.rawText,
    created_at: value.createdAt.toISOString(),
    updated_at: value.updatedAt.toISOString(),
  };
}
