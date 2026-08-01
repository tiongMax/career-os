import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";

import {
  createRoleTrackInputSchema,
  type RoleTrack,
  type RoleTracksService,
} from "../../domain/role-tracks/role-track.js";
import { errorResponseSchema } from "./shared.js";

const roleTrackResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  created_at: z.iso.datetime(),
});

type RoleTrackResponse = z.infer<typeof roleTrackResponseSchema>;

export function roleTrackRoutes(
  service: RoleTracksService,
): FastifyPluginCallbackZod {
  return function registerRoleTrackRoutes(app, _options, done) {
    app.post(
      "/tracks",
      {
        schema: {
          tags: ["Role Tracks"],
          summary: "Create a role track",
          body: createRoleTrackInputSchema,
          response: {
            201: roleTrackResponseSchema,
            400: errorResponseSchema,
            409: errorResponseSchema,
          },
        },
      },
      async (request, reply) => {
        const roleTrack = await service.create(request.body);
        return reply.status(201).send(roleTrackDTO(roleTrack));
      },
    );

    app.get(
      "/tracks",
      {
        schema: {
          tags: ["Role Tracks"],
          summary: "List role tracks",
          response: {
            200: z.array(roleTrackResponseSchema),
          },
        },
      },
      async () => (await service.list()).map(roleTrackDTO),
    );

    done();
  };
}

function roleTrackDTO(roleTrack: RoleTrack): RoleTrackResponse {
  return {
    id: roleTrack.id,
    name: roleTrack.name,
    created_at: roleTrack.createdAt.toISOString(),
  };
}
