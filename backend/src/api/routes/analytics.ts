import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { AnalyticsService } from "../../domain/analytics/analytics.js";

const count = z.number().int();
const rate = z.number();
const schemas = {
  summary: z.object({
    total: count,
    active: count,
    responded: count,
    offers: count,
    response_rate: rate,
    offer_rate: rate,
    pending_reminders: count,
  }),
  status: z.object({ status: z.string(), count }),
  track: z.object({ track: z.string(), count }),
  resume: z.object({
    id: z.uuid(),
    name: z.string(),
    track: z.string(),
    applications: count,
    responses: count,
    interviews: count,
    offers: count,
    response_rate: rate,
    offer_rate: rate,
  }),
  source: z.object({
    source: z.string(),
    applications: count,
    responses: count,
    offers: count,
    response_rate: rate,
  }),
  funnel: z.object({ stage: z.string(), count }),
  upcoming: z.object({
    interviews: z.array(
      z.object({
        id: z.uuid(),
        round_type: z.string(),
        scheduled_at: z.iso.datetime().optional(),
        application_title: z.string(),
        company_name: z.string(),
      }),
    ),
    reminders: z.array(
      z.object({
        id: z.uuid(),
        title: z.string(),
        due_at: z.iso.datetime(),
        application_title: z.string(),
      }),
    ),
  }),
};
export function analyticsRoutes(
  service: AnalyticsService,
): FastifyPluginCallbackZod {
  return (app, _options, done) => {
    app.get(
      "/analytics/summary",
      { schema: { tags: ["Analytics"], response: { 200: schemas.summary } } },
      async () => {
        const v = await service.summary();
        return {
          total: v.total,
          active: v.active,
          responded: v.responded,
          offers: v.offers,
          response_rate: v.responseRate,
          offer_rate: v.offerRate,
          pending_reminders: v.pendingReminders,
        };
      },
    );
    app.get(
      "/analytics/by-status",
      {
        schema: {
          tags: ["Analytics"],
          response: { 200: z.array(schemas.status) },
        },
      },
      service.byStatus,
    );
    app.get(
      "/analytics/by-role-track",
      {
        schema: {
          tags: ["Analytics"],
          response: { 200: z.array(schemas.track) },
        },
      },
      service.byTrack,
    );
    app.get(
      "/analytics/by-resume-version",
      {
        schema: {
          tags: ["Analytics"],
          response: { 200: z.array(schemas.resume) },
        },
      },
      async () =>
        (await service.byResume()).map((v) => ({
          ...v,
          response_rate: v.responseRate,
          offer_rate: v.offerRate,
        })),
    );
    app.get(
      "/analytics/source-performance",
      {
        schema: {
          tags: ["Analytics"],
          response: { 200: z.array(schemas.source) },
        },
      },
      async () =>
        (await service.sources()).map((v) => ({
          ...v,
          response_rate: v.responseRate,
        })),
    );
    app.get(
      "/analytics/funnel",
      {
        schema: {
          tags: ["Analytics"],
          response: { 200: z.array(schemas.funnel) },
        },
      },
      service.funnel,
    );
    app.get(
      "/analytics/upcoming",
      { schema: { tags: ["Analytics"], response: { 200: schemas.upcoming } } },
      async () => {
        const v = await service.upcoming();
        return {
          interviews: v.interviews.map((i) => ({
            id: i.id,
            round_type: i.roundType,
            ...(i.scheduledAt === null
              ? {}
              : { scheduled_at: i.scheduledAt.toISOString() }),
            application_title: i.applicationTitle,
            company_name: i.companyName,
          })),
          reminders: v.reminders.map((r) => ({
            id: r.id,
            title: r.title,
            due_at: r.dueAt.toISOString(),
            application_title: r.applicationTitle,
          })),
        };
      },
    );
    done();
  };
}
