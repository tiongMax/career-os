import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { stringify } from "yaml";

export const openApiRoutes: FastifyPluginCallbackZod = (
  app,
  _options,
  done,
) => {
  app.get(
    "/openapi.yaml",
    { schema: { hide: true } },
    async (_request, reply) =>
      reply
        .header("content-type", "application/yaml; charset=utf-8")
        .header("cache-control", "public, max-age=300")
        .send(stringify(app.swagger())),
  );
  done();
};
