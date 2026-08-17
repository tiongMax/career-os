import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  createCompanyInputSchema,
  updateCompanyInputSchema,
  type CompaniesService,
  type Company,
} from "./company.service.js";
import {
  errorResponseSchema,
  idParamsSchema,
  requireUUID,
} from "../../shared/http-schemas.js";

export const companyResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  website: z.string().optional(),
  industry: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
});

type CompanyResponse = z.infer<typeof companyResponseSchema>;

export function companyRoutes(
  service: CompaniesService,
): FastifyPluginCallbackZod {
  return function registerCompanyRoutes(app, _options, done) {
    app.post(
      "/companies",
      {
        schema: {
          tags: ["Companies"],
          summary: "Create a company",
          body: createCompanyInputSchema,
          response: {
            201: companyResponseSchema,
            400: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const company = await service.create(request.body);
        return reply.status(201).send(companyDTO(company));
      },
    );

    app.get(
      "/companies",
      {
        schema: {
          tags: ["Companies"],
          summary: "List companies",
          response: {
            200: z.array(companyResponseSchema),
          },
        },
      },
      async () => (await service.list()).map(companyDTO),
    );

    app.get(
      "/companies/:id",
      {
        schema: {
          tags: ["Companies"],
          summary: "Get company by id",
          params: idParamsSchema,
          response: {
            200: companyResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) => {
        const id = requireUUID(request.params.id, "invalid company id");
        return companyDTO(await service.get(id));
      },
    );

    app.patch(
      "/companies/:id",
      {
        schema: {
          tags: ["Companies"],
          summary: "Update company",
          params: idParamsSchema,
          body: updateCompanyInputSchema,
          response: {
            200: companyResponseSchema,
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request) => {
        const id = requireUUID(request.params.id, "invalid company id");
        return companyDTO(await service.update(id, request.body));
      },
    );

    app.delete(
      "/companies/:id",
      {
        schema: {
          tags: ["Companies"],
          summary: "Delete company",
          params: idParamsSchema,
          response: {
            204: z.null(),
            400: errorResponseSchema,
            404: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const id = requireUUID(request.params.id, "invalid company id");
        await service.delete(id);
        return reply.status(204).send(null);
      },
    );

    done();
  };
}

export function companyDTO(company: Company): CompanyResponse {
  return {
    id: company.id,
    name: company.name,
    ...(company.website === null ? {} : { website: company.website }),
    ...(company.industry === null ? {} : { industry: company.industry }),
    ...(company.location === null ? {} : { location: company.location }),
    ...(company.notes === null ? {} : { notes: company.notes }),
    created_at: company.createdAt.toISOString(),
    updated_at: company.updatedAt.toISOString(),
  };
}
