import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { SearchService } from "../../domain/search/search.js";

const querySchema = z.strictObject({ q: z.string().default("") });
const responseSchema = z.object({
  query: z.string(),
  results: z.array(
    z.object({
      type: z.string(),
      id: z.uuid(),
      title: z.string(),
      company: z.string().optional(),
      rank: z.number(),
    }),
  ),
});
export function searchRoutes(service: SearchService): FastifyPluginCallbackZod {
  return (app, _options, done) => {
    app.get(
      "/search",
      {
        schema: {
          tags: ["Search"],
          summary: "Search applications and job descriptions",
          querystring: querySchema,
          response: { 200: responseSchema },
        },
      },
      async (request) => ({
        query: request.query.q,
        results: (await service.search(request.query.q)).map(
          ({ company, ...item }) => ({
            ...item,
            ...(company === null ? {} : { company }),
          }),
        ),
      }),
    );
    done();
  };
}
