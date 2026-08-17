import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  createContactInputSchema,
  updateContactInputSchema,
  type Contact,
  type ContactsService,
} from "./contact.service.js";
import {
  errorResponseSchema,
  idParamsSchema,
  requireUUID,
} from "../../shared/http-schemas.js";

export const contactResponseSchema = z.object({
  id: z.uuid(),
  company_id: z.uuid(),
  name: z.string(),
  role: z.string().optional(),
  email: z.string().optional(),
  linkedin_url: z.string().optional(),
  relationship: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});
type ContactResponse = z.infer<typeof contactResponseSchema>;

export function contactRoutes(
  service: ContactsService,
): FastifyPluginCallbackZod {
  return function registerContactRoutes(app, _options, done) {
    app.post(
      "/contacts",
      {
        schema: {
          tags: ["Contacts"],
          summary: "Create contact",
          body: createContactInputSchema,
          response: { 201: contactResponseSchema, 400: errorResponseSchema },
        },
      },
      async (request, reply) =>
        reply.status(201).send(contactDTO(await service.create(request.body))),
    );
    app.get(
      "/contacts",
      {
        schema: {
          tags: ["Contacts"],
          summary: "List contacts",
          response: { 200: z.array(contactResponseSchema) },
        },
      },
      async () => (await service.list()).map(contactDTO),
    );
    app.get(
      "/contacts/:id",
      {
        schema: {
          tags: ["Contacts"],
          summary: "Get contact",
          params: idParamsSchema,
          response: {
            200: contactResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        contactDTO(await service.get(contactId(request.params.id))),
    );
    app.patch(
      "/contacts/:id",
      {
        schema: {
          tags: ["Contacts"],
          summary: "Update contact",
          params: idParamsSchema,
          body: updateContactInputSchema,
          response: {
            200: contactResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) =>
        contactDTO(
          await service.update(contactId(request.params.id), request.body),
        ),
    );
    app.delete(
      "/contacts/:id",
      {
        schema: {
          tags: ["Contacts"],
          summary: "Delete contact",
          params: idParamsSchema,
          response: {
            204: z.null(),
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        await service.delete(contactId(request.params.id));
        return reply.status(204).send(null);
      },
    );
    done();
  };
}

function contactId(id: string): string {
  return requireUUID(id, "invalid contact id");
}
export function contactDTO(contact: Contact): ContactResponse {
  return {
    id: contact.id,
    company_id: contact.companyId,
    name: contact.name,
    ...(contact.role === null ? {} : { role: contact.role }),
    ...(contact.email === null ? {} : { email: contact.email }),
    ...(contact.linkedinUrl === null
      ? {}
      : { linkedin_url: contact.linkedinUrl }),
    ...(contact.relationship === null
      ? {}
      : { relationship: contact.relationship }),
    ...(contact.notes === null ? {} : { notes: contact.notes }),
    created_at: contact.createdAt.toISOString(),
    updated_at: contact.updatedAt.toISOString(),
  };
}
