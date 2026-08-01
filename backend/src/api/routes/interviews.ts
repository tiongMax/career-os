import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  createInterviewInputSchema,
  updateInterviewInputSchema,
  type InterviewRound,
  type InterviewsService,
} from "../../domain/interviews/interview.js";
import { errorResponseSchema, idParamsSchema, requireUUID } from "./shared.js";

export const interviewResponseSchema = z.object({
  id: z.uuid(),
  application_id: z.uuid(),
  round_type: z.string(),
  scheduled_at: z.iso.datetime().optional(),
  interviewer: z.string().optional(),
  notes: z.string().optional(),
  outcome: z.string().optional(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
type InterviewResponse = z.infer<typeof interviewResponseSchema>;

export function interviewRoutes(
  service: InterviewsService,
): FastifyPluginCallbackZod {
  return function registerInterviewRoutes(app, _options, done) {
    app.post(
      "/applications/:id/interviews",
      {
        schema: {
          tags: ["Interviews"],
          summary: "Create interview round",
          params: idParamsSchema,
          body: createInterviewInputSchema,
          response: { 201: interviewResponseSchema, 400: errorResponseSchema },
        },
      },
      async (request, reply) =>
        reply
          .status(201)
          .send(
            interviewDTO(
              await service.create(
                applicationId(request.params.id),
                request.body,
              ),
            ),
          ),
    );
    app.get(
      "/applications/:id/interviews",
      {
        schema: {
          tags: ["Interviews"],
          summary: "List application interview rounds",
          params: idParamsSchema,
          response: {
            200: z.array(interviewResponseSchema),
            400: errorResponseSchema,
          },
        },
      },
      async (request) =>
        (await service.listByApplication(applicationId(request.params.id))).map(
          interviewDTO,
        ),
    );
    app.patch(
      "/interviews/:id",
      {
        schema: {
          tags: ["Interviews"],
          summary: "Update interview round",
          params: idParamsSchema,
          body: updateInterviewInputSchema,
          response: {
            200: interviewResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        interviewDTO(
          await service.update(interviewId(request.params.id), request.body),
        ),
    );
    app.delete(
      "/interviews/:id",
      {
        schema: {
          tags: ["Interviews"],
          summary: "Delete interview round",
          params: idParamsSchema,
          response: {
            204: z.null(),
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        await service.delete(interviewId(request.params.id));
        return reply.status(204).send(null);
      },
    );
    done();
  };
}

function applicationId(id: string): string {
  return requireUUID(id, "invalid application id");
}
function interviewId(id: string): string {
  return requireUUID(id, "invalid interview id");
}
export function interviewDTO(interview: InterviewRound): InterviewResponse {
  return {
    id: interview.id,
    application_id: interview.applicationId,
    round_type: interview.roundType,
    ...(interview.scheduledAt === null
      ? {}
      : { scheduled_at: interview.scheduledAt.toISOString() }),
    ...(interview.interviewer === null
      ? {}
      : { interviewer: interview.interviewer }),
    ...(interview.notes === null ? {} : { notes: interview.notes }),
    ...(interview.outcome === null ? {} : { outcome: interview.outcome }),
    created_at: interview.createdAt.toISOString(),
    updated_at: interview.updatedAt.toISOString(),
  };
}
