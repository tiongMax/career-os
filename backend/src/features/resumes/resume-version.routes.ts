import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  createResumeVersionInputSchema,
  updateResumeVersionInputSchema,
  type ResumeVersion,
  type ResumeVersionsService,
} from "./resume-version.service.js";
import { EntityNotFoundError } from "../../database/errors.js";
import { AppError } from "../../shared/http-errors.js";
import {
  errorResponseSchema,
  idParamsSchema,
  requireUUID,
} from "../../shared/http-schemas.js";

export const resumeVersionResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  track: z.string(),
  content_text: z.string().optional(),
  has_pdf: z.boolean(),
  tags: z.array(z.string()),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

type ResumeVersionResponse = z.infer<typeof resumeVersionResponseSchema>;

export function resumeVersionRoutes(
  service: ResumeVersionsService,
): FastifyPluginCallbackZod {
  return function registerResumeVersionRoutes(app, _options, done) {
    app.post(
      "/resume-versions",
      {
        schema: {
          tags: ["Resume Versions"],
          summary: "Create resume version",
          body: createResumeVersionInputSchema,
          response: {
            201: resumeVersionResponseSchema,
            400: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const resume = await service.create(request.body);
        return reply.status(201).send(resumeVersionDTO(resume));
      },
    );

    app.get(
      "/resume-versions",
      {
        schema: {
          tags: ["Resume Versions"],
          summary: "List resume versions",
          response: { 200: z.array(resumeVersionResponseSchema) },
        },
      },
      async () => (await service.list()).map(resumeVersionDTO),
    );

    app.get(
      "/resume-versions/:id",
      {
        schema: {
          tags: ["Resume Versions"],
          summary: "Get resume version",
          params: idParamsSchema,
          response: {
            200: resumeVersionResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) => {
        const id = requireUUID(request.params.id, "invalid resume version id");
        return resumeVersionDTO(await service.get(id));
      },
    );

    app.patch(
      "/resume-versions/:id",
      {
        schema: {
          tags: ["Resume Versions"],
          summary: "Update resume version",
          params: idParamsSchema,
          body: updateResumeVersionInputSchema,
          response: {
            200: resumeVersionResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) => {
        const id = requireUUID(request.params.id, "invalid resume version id");
        return resumeVersionDTO(await service.update(id, request.body));
      },
    );

    app.delete(
      "/resume-versions/:id",
      {
        schema: {
          tags: ["Resume Versions"],
          summary: "Delete resume version",
          params: idParamsSchema,
          response: {
            204: z.null(),
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const id = requireUUID(request.params.id, "invalid resume version id");
        await service.delete(id);
        return reply.status(204).send(null);
      },
    );

    app.post(
      "/resume-versions/:id/pdf",
      {
        schema: {
          tags: ["Resume Versions"],
          summary: "Upload PDF for resume version",
          params: idParamsSchema,
          response: { 204: z.null(), 400: errorResponseSchema },
        },
      },
      async (request, reply) => {
        const id = requireUUID(request.params.id, "invalid resume version id");
        let file;
        try {
          file = await request.file();
        } catch {
          throw new AppError("failed to parse form", 400);
        }
        if (file === undefined || file.fieldname !== "file") {
          throw new AppError("missing file field", 400);
        }

        let data: Buffer;
        try {
          data = await file.toBuffer();
        } catch {
          throw new AppError("failed to read file", 500);
        }
        await service.storePdf(id, data);
        return reply.status(204).send(null);
      },
    );

    app.get(
      "/resume-versions/:id/pdf",
      {
        schema: {
          tags: ["Resume Versions"],
          summary: "Download attached PDF",
          params: idParamsSchema,
          response: {
            200: z.any(),
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const id = requireUUID(request.params.id, "invalid resume version id");
        let data: Buffer | null;
        try {
          data = await service.getPdf(id);
        } catch (error) {
          if (error instanceof EntityNotFoundError) {
            throw new AppError("resume not found", 404);
          }
          throw error;
        }
        if (data === null) throw new AppError("no PDF attached", 404);
        return reply.type("application/pdf").send(data);
      },
    );

    done();
  };
}

export function resumeVersionDTO(resume: ResumeVersion): ResumeVersionResponse {
  return {
    id: resume.id,
    name: resume.name,
    track: resume.track,
    ...(resume.contentText === null
      ? {}
      : { content_text: resume.contentText }),
    has_pdf: resume.hasPdf,
    tags: resume.tags,
    created_at: resume.createdAt.toISOString(),
    updated_at: resume.updatedAt.toISOString(),
  };
}
