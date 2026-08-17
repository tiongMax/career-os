import { sql } from "drizzle-orm";

import type {
  DashboardAttentionItem,
  DashboardRecentApplication,
  DashboardRepository,
  DashboardUpcomingDeadline,
  DashboardUpcomingInterview,
  DashboardUpcomingReminder,
} from "../../domain/dashboard/dashboard.js";
import type { Database } from "../../infrastructure/postgres.js";

const activeStatuses = `'applied','online_assessment','recruiter_screen','technical_screen','technical_screen_2','technical_screen_3','technical_screen_4','onsite','offer'`;
const respondedStatuses = `'online_assessment','recruiter_screen','technical_screen','technical_screen_2','technical_screen_3','technical_screen_4','onsite','offer','rejected'`;
const interviewStatuses = `'recruiter_screen','technical_screen','technical_screen_2','technical_screen_3','technical_screen_4','onsite','offer'`;
const finalStatuses = `'offer','rejected','ghosted','withdrawn','kiv'`;

type Row<T> = T & Record<string, unknown>;

interface MetricsRow {
  total: number;
  active: number;
  responded: number;
  interviewed: number;
  offers: number;
  rejected: number;
  staleApplications: number;
  missingResumeVersion: number;
  overdueReminders: number;
  dueTodayReminders: number;
  statusCounts: Record<string, number>;
}

type DatabaseTimestamp = Date | string;
type RecentRow = Omit<DashboardRecentApplication, "updatedAt"> & {
  updatedAt: DatabaseTimestamp;
};
type InterviewRow = Omit<DashboardUpcomingInterview, "scheduledAt"> & {
  scheduledAt: DatabaseTimestamp;
};
type ReminderRow = Omit<DashboardUpcomingReminder, "dueAt"> & {
  dueAt: DatabaseTimestamp;
};
type DeadlineRow = Omit<DashboardUpcomingDeadline, "deadlineAt"> & {
  deadlineAt: DatabaseTimestamp;
};
type AttentionRow = Omit<DashboardAttentionItem, "actionAt"> & {
  actionAt: DatabaseTimestamp;
};

export function createDashboardRepository(
  database: Database,
): DashboardRepository {
  return {
    async load(now) {
      const staleCutoff = new Date(now.getTime() - 14 * 86_400_000);
      const followUpCutoff = new Date(now.getTime() - 7 * 86_400_000);
      const deadlineCutoff = new Date(now.getTime() + 7 * 86_400_000);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      const [
        metricsResult,
        recentResult,
        interviewResult,
        reminderResult,
        deadlineResult,
        attentionResult,
      ] = await Promise.all([
        database.execute<Row<MetricsRow>>(sql`
            SELECT
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status IN (${sql.raw(activeStatuses)}))::int AS active,
              COUNT(*) FILTER (WHERE status IN (${sql.raw(respondedStatuses)}))::int AS responded,
              COUNT(*) FILTER (WHERE status IN (${sql.raw(interviewStatuses)}))::int AS interviewed,
              COUNT(*) FILTER (WHERE status = 'offer')::int AS offers,
              COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
              COUNT(*) FILTER (
                WHERE status NOT IN (${sql.raw(finalStatuses)})
                  AND status <> 'saved'
                  AND updated_at <= ${staleCutoff}
              )::int AS "staleApplications",
              COUNT(*) FILTER (
                WHERE resume_version_id IS NULL
                  AND status NOT IN (${sql.raw(finalStatuses)})
                  AND status <> 'saved'
              )::int AS "missingResumeVersion",
              (SELECT COUNT(*)::int FROM reminders WHERE status = 'pending' AND due_at < ${now}) AS "overdueReminders",
              (SELECT COUNT(*)::int FROM reminders WHERE status = 'pending' AND due_at >= ${now} AND due_at <= ${todayEnd}) AS "dueTodayReminders",
              COALESCE((
                SELECT jsonb_object_agg(grouped.status, grouped.count)
                FROM (
                  SELECT status, COUNT(*)::int AS count
                  FROM applications
                  GROUP BY status
                ) grouped
              ), '{}'::jsonb) AS "statusCounts"
            FROM applications
          `),
        database.execute<Row<RecentRow>>(sql`
            SELECT
              a.id::text,
              a.title,
              a.status,
              c.name AS "companyName",
              a.updated_at AS "updatedAt"
            FROM applications a
            JOIN companies c ON c.id = a.company_id
            ORDER BY a.updated_at DESC
            LIMIT 5
          `),
        database.execute<Row<InterviewRow>>(sql`
            SELECT
              ir.id::text,
              a.title AS "applicationTitle",
              c.name AS "companyName",
              ir.scheduled_at AS "scheduledAt"
            FROM interview_rounds ir
            JOIN applications a ON a.id = ir.application_id
            JOIN companies c ON c.id = a.company_id
            WHERE ir.scheduled_at > ${now}
            ORDER BY ir.scheduled_at
            LIMIT 10
          `),
        database.execute<Row<ReminderRow>>(sql`
            SELECT
              r.id::text,
              r.title,
              a.title AS "applicationTitle",
              r.due_at AS "dueAt"
            FROM reminders r
            JOIN applications a ON a.id = r.application_id
            WHERE r.status = 'pending' AND r.due_at > ${now}
            ORDER BY r.due_at
            LIMIT 10
          `),
        database.execute<Row<DeadlineRow>>(sql`
            SELECT
              a.id::text,
              a.title,
              c.name AS "companyName",
              a.deadline_at AS "deadlineAt"
            FROM applications a
            JOIN companies c ON c.id = a.company_id
            WHERE a.deadline_at >= ${now}
              AND a.deadline_at <= ${deadlineCutoff}
              AND a.status NOT IN (${sql.raw(finalStatuses)})
            ORDER BY a.deadline_at
            LIMIT 5
          `),
        database.execute<Row<AttentionRow>>(sql`
            WITH candidates AS (
              SELECT
                ('reminder-' || r.id::text) AS id,
                a.id::text AS "applicationId",
                a.title AS "applicationTitle",
                c.name AS "companyName",
                CASE WHEN r.due_at < ${now}
                  THEN 'overdue_reminder'
                  ELSE 'due_reminder'
                END AS type,
                r.title,
                r.due_at AS "actionAt",
                CASE WHEN r.due_at < ${now} THEN 0 ELSE 2 END AS priority
              FROM reminders r
              JOIN applications a ON a.id = r.application_id
              JOIN companies c ON c.id = a.company_id
              WHERE r.status = 'pending' AND r.due_at <= ${todayEnd}

              UNION ALL

              SELECT
                ('deadline-' || a.id::text), a.id::text, a.title, c.name,
                'deadline', NULL::text, a.deadline_at,
                CASE WHEN a.deadline_at < ${now} THEN 0 ELSE 1 END
              FROM applications a
              JOIN companies c ON c.id = a.company_id
              WHERE a.deadline_at <= ${deadlineCutoff}
                AND a.status NOT IN (${sql.raw(finalStatuses)})

              UNION ALL

              SELECT
                ('interview-' || ir.id::text), a.id::text, a.title, c.name,
                'interview', ir.round_type, ir.scheduled_at, 1
              FROM interview_rounds ir
              JOIN applications a ON a.id = ir.application_id
              JOIN companies c ON c.id = a.company_id
              WHERE ir.scheduled_at > ${now}

              UNION ALL

              SELECT
                ('follow-up-' || a.id::text), a.id::text, a.title, c.name,
                'follow_up', NULL::text, COALESCE(a.applied_at, a.created_at), 3
              FROM applications a
              JOIN companies c ON c.id = a.company_id
              WHERE a.status = 'applied'
                AND COALESCE(a.applied_at, a.created_at) <= ${followUpCutoff}

              UNION ALL

              SELECT
                ('stale-' || a.id::text), a.id::text, a.title, c.name,
                'stale', NULL::text, a.updated_at, 4
              FROM applications a
              JOIN companies c ON c.id = a.company_id
              WHERE a.status NOT IN (${sql.raw(finalStatuses)})
                AND a.status <> 'saved'
                AND a.updated_at <= ${staleCutoff}

              UNION ALL

              SELECT
                ('missing-resume-' || a.id::text), a.id::text, a.title, c.name,
                'missing_resume', NULL::text, a.created_at, 5
              FROM applications a
              JOIN companies c ON c.id = a.company_id
              WHERE a.resume_version_id IS NULL
                AND a.status NOT IN (${sql.raw(finalStatuses)})
                AND a.status <> 'saved'
            ), ranked AS (
              SELECT *, ROW_NUMBER() OVER (
                PARTITION BY "applicationId"
                ORDER BY priority, "actionAt"
              ) AS rank
              FROM candidates
            )
            SELECT id, "applicationId", "applicationTitle", "companyName",
              type, title, "actionAt"
            FROM ranked
            WHERE rank = 1
            ORDER BY priority, "actionAt"
            LIMIT 20
          `),
      ]);

      const metrics = metricsResult.rows[0];
      if (metrics === undefined)
        throw new Error("dashboard metrics returned no row");

      return {
        generatedAt: now.toISOString(),
        summary: {
          total: metrics.total,
          active: metrics.active,
          responded: metrics.responded,
          interviewed: metrics.interviewed,
          offers: metrics.offers,
          rejected: metrics.rejected,
        },
        attention: {
          overdueReminders: metrics.overdueReminders,
          dueTodayReminders: metrics.dueTodayReminders,
          staleApplications: metrics.staleApplications,
          missingResumeVersion: metrics.missingResumeVersion,
          items: attentionResult.rows.map((item) => ({
            ...item,
            actionAt: isoTimestamp(item.actionAt),
          })),
        },
        pipeline: metrics.statusCounts,
        recentApplications: recentResult.rows.map((application) => ({
          ...application,
          updatedAt: isoTimestamp(application.updatedAt),
        })),
        upcoming: {
          interviews: interviewResult.rows.map((interview) => ({
            ...interview,
            scheduledAt: isoTimestamp(interview.scheduledAt),
          })),
          reminders: reminderResult.rows.map((reminder) => ({
            ...reminder,
            dueAt: isoTimestamp(reminder.dueAt),
          })),
          deadlines: deadlineResult.rows.map((deadline) => ({
            ...deadline,
            deadlineAt: isoTimestamp(deadline.deadlineAt),
          })),
        },
      };
    },
  };
}

function isoTimestamp(value: DatabaseTimestamp): string {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}
