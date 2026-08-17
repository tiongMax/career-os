import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  changeApplicationStatusInputSchema,
  createApplicationInputSchema,
  updateApplicationInputSchema,
  type Application,
  type ApplicationsService,
  type AuditLog,
} from "./application.service.js";
import { AppError } from "../../shared/http-errors.js";
import {
  errorResponseSchema,
  idParamsSchema,
  requireUUID,
} from "../../shared/http-schemas.js";

export const applicationResponseSchema = z.object({
  id: z.uuid(),
  company_id: z.uuid(),
  resume_version_id: z.uuid().optional(),
  title: z.string(),
  role_track: z.string(),
  role_tracks: z.array(z.string()),
  source: z.string().optional(),
  status: z.string(),
  location: z.string().optional(),
  employment_type: z.string().optional(),
  job_url: z.string().optional(),
  portal_account: z.string().optional(),
  portal_password: z.string().optional(),
  applied_at: z.iso.datetime().optional(),
  deadline_at: z.iso.datetime().optional(),
  notes: z.string().optional(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

const applicationPageResponseSchema = z.object({
  items: z.array(applicationResponseSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});

export const auditLogResponseSchema = z.object({
  id: z.uuid(),
  entity_type: z.string(),
  entity_id: z.uuid(),
  action: z.string(),
  old_value: z.unknown().optional(),
  new_value: z.unknown().optional(),
  created_at: z.iso.datetime(),
});

const paginationQuerySchema = z.strictObject({
  limit: z.string().optional(),
  offset: z.string().optional(),
});
type ApplicationResponse = z.infer<typeof applicationResponseSchema>;

export function applicationRoutes(
  service: ApplicationsService,
): FastifyPluginCallbackZod {
  return function registerApplicationRoutes(app, _options, done) {
    app.post(
      "/applications",
      {
        schema: {
          tags: ["Applications"],
          summary: "Create application",
          body: createApplicationInputSchema,
          response: {
            201: applicationResponseSchema,
            400: errorResponseSchema,
          },
        },
      },
      async (request, reply) =>
        reply
          .status(201)
          .send(applicationDTO(await service.create(request.body))),
    );

    app.get(
      "/applications",
      {
        schema: {
          tags: ["Applications"],
          summary: "List applications",
          querystring: paginationQuerySchema,
          response: {
            200: z.union([
              z.array(applicationResponseSchema),
              applicationPageResponseSchema,
            ]),
            400: errorResponseSchema,
          },
        },
      },
      async (request) => {
        if (
          request.query.limit !== undefined ||
          request.query.offset !== undefined
        ) {
          const limit = parseInteger(request.query.limit, 25, "limit");
          const offset = parseInteger(request.query.offset, 0, "offset");
          const page = await service.listPage(limit, offset);
          return { ...page, items: page.items.map(applicationDTO) };
        }
        return (await service.list()).map(applicationDTO);
      },
    );

    app.get(
      "/applications/:id",
      {
        schema: {
          tags: ["Applications"],
          summary: "Get application",
          params: idParamsSchema,
          response: {
            200: applicationResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        applicationDTO(await service.get(applicationId(request.params.id))),
    );

    app.patch(
      "/applications/:id",
      {
        schema: {
          tags: ["Applications"],
          summary: "Update application",
          params: idParamsSchema,
          body: updateApplicationInputSchema,
          response: {
            200: applicationResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        applicationDTO(
          await service.update(applicationId(request.params.id), request.body),
        ),
    );

    app.delete(
      "/applications/:id",
      {
        schema: {
          tags: ["Applications"],
          summary: "Delete application",
          params: idParamsSchema,
          response: {
            204: z.null(),
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        await service.delete(applicationId(request.params.id));
        return reply.status(204).send(null);
      },
    );

    app.patch(
      "/applications/:id/status",
      {
        schema: {
          tags: ["Applications"],
          summary: "Transition application status",
          params: idParamsSchema,
          body: changeApplicationStatusInputSchema,
          response: {
            200: applicationResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request) =>
        applicationDTO(
          await service.changeStatus(
            applicationId(request.params.id),
            request.body,
          ),
        ),
    );

    app.get(
      "/applications/:id/audit-logs",
      {
        schema: {
          tags: ["Applications"],
          summary: "List application audit logs",
          params: idParamsSchema,
          response: {
            200: z.array(auditLogResponseSchema),
            400: errorResponseSchema,
          },
        },
      },
      async (request) =>
        (await service.listAuditLogs(applicationId(request.params.id))).map(
          auditLogDTO,
        ),
    );

    done();
  };
}

function applicationId(id: string): string {
  return requireUUID(id, "invalid application id");
}

function parseInteger(
  raw: string | undefined,
  fallback: number,
  key: string,
): number {
  if (raw === undefined || raw === "") return fallback;
  if (!/^[+-]?\d+$/.test(raw)) throw new AppError(`invalid ${key}`, 400);
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) throw new AppError(`invalid ${key}`, 400);
  return value;
}

export function applicationDTO(application: Application): ApplicationResponse {
  return {
    id: application.id,
    company_id: application.companyId,
    ...(application.resumeVersionId === null
      ? {}
      : { resume_version_id: application.resumeVersionId }),
    title: application.title,
    role_track: application.roleTrack,
    role_tracks: application.roleTracks,
    ...(application.source === null ? {} : { source: application.source }),
    status: application.status,
    ...(application.location === null
      ? {}
      : { location: application.location }),
    ...(application.employmentType === null
      ? {}
      : { employment_type: application.employmentType }),
    ...(application.jobUrl === null ? {} : { job_url: application.jobUrl }),
    ...(application.portalAccount === null
      ? {}
      : { portal_account: application.portalAccount }),
    ...(application.portalPassword === null
      ? {}
      : { portal_password: application.portalPassword }),
    ...(application.appliedAt === null
      ? {}
      : { applied_at: application.appliedAt.toISOString() }),
    ...(application.deadlineAt === null
      ? {}
      : { deadline_at: application.deadlineAt.toISOString() }),
    ...(application.notes === null ? {} : { notes: application.notes }),
    created_at: application.createdAt.toISOString(),
    updated_at: application.updatedAt.toISOString(),
  };
}

export function auditLogDTO(log: AuditLog) {
  return {
    id: log.id,
    entity_type: log.entityType,
    entity_id: log.entityId,
    action: log.action,
    ...(log.oldValue === null ? {} : { old_value: log.oldValue }),
    ...(log.newValue === null ? {} : { new_value: log.newValue }),
    created_at: log.createdAt.toISOString(),
  };
}
