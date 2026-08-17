import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";

export interface HealthChecks {
  postgres: () => Promise<void>;
  redis: () => Promise<void>;
}

const healthResponseSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  postgres: z.enum(["ok", "error"]),
  redis: z.enum(["ok", "error"]),
});

const dependencyTimeoutMs = 2_000;

async function checkWithTimeout(
  check: () => Promise<void>,
): Promise<"ok" | "error"> {
  let timer: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      check(),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(new Error("health check timed out"));
        }, dependencyTimeoutMs);
      }),
    ]);
    return "ok";
  } catch {
    return "error";
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export function healthRoutes(checks: HealthChecks): FastifyPluginCallbackZod {
  return function registerHealthRoutes(app, _options, done) {
    app.get(
      "/health",
      {
        schema: {
          tags: ["system"],
          summary: "Check API dependencies",
          response: {
            200: healthResponseSchema,
            503: healthResponseSchema,
          },
        },
      },
      async (_request, reply) => {
        const [postgres, redis] = await Promise.all([
          checkWithTimeout(() => checks.postgres()),
          checkWithTimeout(() => checks.redis()),
        ]);
        const healthy = postgres === "ok" && redis === "ok";

        return reply.status(healthy ? 200 : 503).send({
          status: healthy ? "ok" : "degraded",
          postgres,
          redis,
        });
      },
    );
    done();
  };
}
