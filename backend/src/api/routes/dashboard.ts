import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import { z } from "zod";

import type { DashboardService } from "../../domain/dashboard/dashboard.js";

const count = z.number().int().nonnegative();
const dashboardResponseSchema = z.object({
  generated_at: z.iso.datetime(),
  summary: z.object({
    total: count,
    active: count,
    responded: count,
    interviewed: count,
    offers: count,
    rejected: count,
  }),
  attention: z.object({
    overdue_reminders: count,
    due_today_reminders: count,
    stale_applications: count,
    missing_resume_version: count,
    items: z.array(
      z.object({
        id: z.string(),
        application_id: z.uuid(),
        application_title: z.string(),
        company_name: z.string(),
        type: z.enum([
          "overdue_reminder",
          "due_reminder",
          "deadline",
          "interview",
          "follow_up",
          "stale",
          "missing_resume",
        ]),
        title: z.string().nullable(),
        action_at: z.iso.datetime(),
      }),
    ),
  }),
  pipeline: z.record(z.string(), count),
  recent_applications: z.array(
    z.object({
      id: z.uuid(),
      title: z.string(),
      status: z.string(),
      company_name: z.string(),
      updated_at: z.iso.datetime(),
    }),
  ),
  upcoming: z.object({
    interviews: z.array(
      z.object({
        id: z.uuid(),
        application_title: z.string(),
        company_name: z.string(),
        scheduled_at: z.iso.datetime(),
      }),
    ),
    reminders: z.array(
      z.object({
        id: z.uuid(),
        title: z.string(),
        application_title: z.string(),
        due_at: z.iso.datetime(),
      }),
    ),
    deadlines: z.array(
      z.object({
        id: z.uuid(),
        title: z.string(),
        company_name: z.string(),
        deadline_at: z.iso.datetime(),
      }),
    ),
  }),
});

export function dashboardRoutes(
  service: DashboardService,
): FastifyPluginCallbackZod {
  return (app, _options, done) => {
    app.get(
      "/dashboard",
      {
        schema: {
          tags: ["Dashboard"],
          summary: "Get the dashboard snapshot",
          response: { 200: dashboardResponseSchema },
        },
      },
      async (_request, reply) => {
        const { snapshot, cacheStatus } = await service.get();
        reply.header("x-cache", cacheStatus);
        return {
          generated_at: snapshot.generatedAt,
          summary: snapshot.summary,
          attention: {
            overdue_reminders: snapshot.attention.overdueReminders,
            due_today_reminders: snapshot.attention.dueTodayReminders,
            stale_applications: snapshot.attention.staleApplications,
            missing_resume_version: snapshot.attention.missingResumeVersion,
            items: snapshot.attention.items.map((item) => ({
              id: item.id,
              application_id: item.applicationId,
              application_title: item.applicationTitle,
              company_name: item.companyName,
              type: item.type,
              title: item.title,
              action_at: item.actionAt,
            })),
          },
          pipeline: snapshot.pipeline,
          recent_applications: snapshot.recentApplications.map(
            (application) => ({
              id: application.id,
              title: application.title,
              status: application.status,
              company_name: application.companyName,
              updated_at: application.updatedAt,
            }),
          ),
          upcoming: {
            interviews: snapshot.upcoming.interviews.map((interview) => ({
              id: interview.id,
              application_title: interview.applicationTitle,
              company_name: interview.companyName,
              scheduled_at: interview.scheduledAt,
            })),
            reminders: snapshot.upcoming.reminders.map((reminder) => ({
              id: reminder.id,
              title: reminder.title,
              application_title: reminder.applicationTitle,
              due_at: reminder.dueAt,
            })),
            deadlines: snapshot.upcoming.deadlines.map((deadline) => ({
              id: deadline.id,
              title: deadline.title,
              company_name: deadline.companyName,
              deadline_at: deadline.deadlineAt,
            })),
          },
        };
      },
    );
    done();
  };
}
