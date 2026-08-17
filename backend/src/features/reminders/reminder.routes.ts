import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  createReminderInputSchema,
  updateReminderInputSchema,
  type FailedReminderJob,
  type Reminder,
  type RemindersService,
} from "./reminder.service.js";
import {
  errorResponseSchema,
  idParamsSchema,
  requireUUID,
} from "../../shared/http-schemas.js";

export const reminderResponseSchema = z.object({
  id: z.uuid(),
  application_id: z.uuid(),
  contact_id: z.uuid().optional(),
  title: z.string(),
  description: z.string().optional(),
  due_at: z.iso.datetime(),
  status: z.string(),
  idempotency_key: z.string(),
  retry_count: z.number().int(),
  last_error: z.string().optional(),
  delivered_at: z.iso.datetime().optional(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
const failedJobResponseSchema = z.object({
  id: z.uuid(),
  reminder_id: z.uuid().optional(),
  error_message: z.string(),
  retry_count: z.number().int(),
  payload: z.unknown(),
  failed_at: z.iso.datetime(),
});

export function reminderRoutes(
  service: RemindersService,
): FastifyPluginCallbackZod {
  return function registerReminderRoutes(app, _options, done) {
    app.post(
      "/reminders",
      {
        schema: {
          tags: ["Reminders"],
          summary: "Create reminder",
          body: createReminderInputSchema,
          response: { 201: reminderResponseSchema, 400: errorResponseSchema },
        },
      },
      async (request, reply) =>
        reply.status(201).send(reminderDTO(await service.create(request.body))),
    );
    app.get(
      "/reminders",
      {
        schema: {
          tags: ["Reminders"],
          summary: "List reminders",
          response: { 200: z.array(reminderResponseSchema) },
        },
      },
      async () => (await service.list()).map(reminderDTO),
    );
    app.get(
      "/reminders/due",
      {
        schema: {
          tags: ["Reminders"],
          summary: "List due reminders",
          response: { 200: z.array(reminderResponseSchema) },
        },
      },
      async () => (await service.listDue()).map(reminderDTO),
    );
    app.get(
      "/reminders/failed",
      {
        schema: {
          tags: ["Reminders"],
          summary: "List failed reminder jobs",
          response: { 200: z.array(failedJobResponseSchema) },
        },
      },
      async () => (await service.listFailed()).map(failedJobDTO),
    );
    app.get(
      "/reminders/:id",
      {
        schema: {
          tags: ["Reminders"],
          summary: "Get reminder",
          params: idParamsSchema,
          response: {
            200: reminderResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        reminderDTO(await service.get(reminderId(request.params.id))),
    );
    app.patch(
      "/reminders/:id",
      {
        schema: {
          tags: ["Reminders"],
          summary: "Update reminder",
          params: idParamsSchema,
          body: updateReminderInputSchema,
          response: {
            200: reminderResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        reminderDTO(
          await service.update(reminderId(request.params.id), request.body),
        ),
    );
    app.delete(
      "/reminders/:id",
      {
        schema: {
          tags: ["Reminders"],
          summary: "Delete reminder",
          params: idParamsSchema,
          response: {
            204: z.null(),
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        await service.delete(reminderId(request.params.id));
        return reply.status(204).send(null);
      },
    );
    for (const [action, handler] of [
      ["cancel", service.cancel],
      ["retry", service.retry],
    ] as const) {
      app.post(
        `/reminders/:id/${action}`,
        {
          schema: {
            tags: ["Reminders"],
            summary: `${action === "cancel" ? "Cancel" : "Retry"} reminder`,
            params: idParamsSchema,
            response: {
              200: reminderResponseSchema,
              400: errorResponseSchema,
              404: errorResponseSchema,
            },
          },
        },
        async (request) =>
          reminderDTO(await handler(reminderId(request.params.id))),
      );
    }
    done();
  };
}

function reminderId(id: string): string {
  return requireUUID(id, "invalid reminder id");
}

export function reminderDTO(reminder: Reminder) {
  return {
    id: reminder.id,
    application_id: reminder.applicationId,
    ...(reminder.contactId === null ? {} : { contact_id: reminder.contactId }),
    title: reminder.title,
    ...(reminder.description === null
      ? {}
      : { description: reminder.description }),
    due_at: reminder.dueAt.toISOString(),
    status: reminder.status,
    idempotency_key: reminder.idempotencyKey,
    retry_count: reminder.retryCount,
    ...(reminder.lastError === null ? {} : { last_error: reminder.lastError }),
    ...(reminder.deliveredAt === null
      ? {}
      : { delivered_at: reminder.deliveredAt.toISOString() }),
    created_at: reminder.createdAt.toISOString(),
    updated_at: reminder.updatedAt.toISOString(),
  };
}

function failedJobDTO(job: FailedReminderJob) {
  return {
    id: job.id,
    ...(job.reminderId === null ? {} : { reminder_id: job.reminderId }),
    error_message: job.errorMessage,
    retry_count: job.retryCount,
    payload: job.payload,
    failed_at: job.failedAt.toISOString(),
  };
}
