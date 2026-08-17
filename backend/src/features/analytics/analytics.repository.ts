import { sql } from "drizzle-orm";
import type {
  AnalyticsRepository,
  FunnelStep,
  ResumePerformance,
  SourcePerformance,
  StatusCount,
  TrackCount,
  UpcomingInterview,
  UpcomingReminder,
} from "./analytics.service.js";
import type { Database } from "../../database/client.js";

const responded = `'online_assessment','recruiter_screen','technical_screen','technical_screen_2','technical_screen_3','technical_screen_4','onsite','offer','rejected'`;
const active = `'applied','online_assessment','recruiter_screen','technical_screen','technical_screen_2','technical_screen_3','technical_screen_4','onsite','offer'`;
type Row<T> = T & Record<string, unknown>;
export function createAnalyticsRepository(
  database: Database,
): AnalyticsRepository {
  return {
    async summary() {
      const rows = await database.execute<
        Row<{
          total: number;
          active: number;
          responded: number;
          offers: number;
          pendingReminders: number;
        }>
      >(
        sql.raw(
          `SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE status IN (${active}))::int active, COUNT(*) FILTER (WHERE status IN (${responded}))::int responded, COUNT(*) FILTER (WHERE status='offer')::int offers, (SELECT COUNT(*)::int FROM reminders WHERE status='pending') AS "pendingReminders" FROM applications`,
        ),
      );
      const row = rows.rows[0];
      if (row === undefined)
        throw new Error("analytics summary returned no row");
      return {
        ...row,
        responseRate: row.total ? (row.responded / row.total) * 100 : 0,
        offerRate: row.total ? (row.offers / row.total) * 100 : 0,
      };
    },
    async byStatus() {
      return [
        ...(
          await database.execute<Row<StatusCount>>(
            sql.raw(
              `SELECT status, COUNT(*)::int count FROM applications GROUP BY status ORDER BY count DESC`,
            ),
          )
        ).rows,
      ];
    },
    async byTrack() {
      return [
        ...(
          await database.execute<Row<TrackCount>>(
            sql.raw(
              `SELECT role_track track, COUNT(DISTINCT application_id)::int count FROM application_role_tracks GROUP BY role_track ORDER BY count DESC`,
            ),
          )
        ).rows,
      ];
    },
    async byResume() {
      const rows = await database.execute<
        Row<Omit<ResumePerformance, "responseRate" | "offerRate">>
      >(
        sql.raw(
          `SELECT rv.id::text,rv.name,rv.track,COUNT(DISTINCT a.id)::int applications,COUNT(DISTINCT a.id) FILTER (WHERE a.status IN (${responded}))::int responses,COUNT(DISTINCT ir.id)::int interviews,COUNT(DISTINCT a.id) FILTER (WHERE a.status='offer')::int offers FROM resume_versions rv LEFT JOIN applications a ON a.resume_version_id=rv.id LEFT JOIN interview_rounds ir ON ir.application_id=a.id GROUP BY rv.id,rv.name,rv.track ORDER BY applications DESC`,
        ),
      );
      return rows.rows.map((r) => ({
        ...r,
        responseRate: r.applications ? (r.responses / r.applications) * 100 : 0,
        offerRate: r.applications ? (r.offers / r.applications) * 100 : 0,
      }));
    },
    async sources() {
      const rows = await database.execute<
        Row<Omit<SourcePerformance, "responseRate">>
      >(
        sql.raw(
          `SELECT COALESCE(source,'unknown') source,COUNT(*)::int applications,COUNT(*) FILTER (WHERE status IN (${responded}))::int responses,COUNT(*) FILTER (WHERE status='offer')::int offers FROM applications GROUP BY COALESCE(source,'unknown') ORDER BY applications DESC`,
        ),
      );
      return rows.rows.map((r) => ({
        ...r,
        responseRate: r.applications ? (r.responses / r.applications) * 100 : 0,
      }));
    },
    async funnel() {
      const stages = [
        "saved",
        "applied",
        "online_assessment",
        "recruiter_screen",
        "technical_screen",
        "technical_screen_2",
        "technical_screen_3",
        "technical_screen_4",
        "onsite",
        "offer",
      ];
      const rows = await database.execute<
        Row<{ stage: string; count: number }>
      >(
        sql.raw(
          `SELECT status stage,COUNT(*)::int count FROM applications WHERE status IN (${stages.map((s) => `'${s}'`).join(",")}) GROUP BY status`,
        ),
      );
      const counts = new Map(rows.rows.map((r) => [r.stage, r.count]));
      return stages.map(
        (stage) =>
          ({ stage, count: counts.get(stage) ?? 0 }) satisfies FunnelStep,
      );
    },
    async upcomingInterviews() {
      return [
        ...(
          await database.execute<Row<UpcomingInterview>>(
            sql.raw(
              `SELECT ir.id::text,ir.round_type "roundType",ir.scheduled_at "scheduledAt",a.title "applicationTitle",c.name "companyName" FROM interview_rounds ir JOIN applications a ON a.id=ir.application_id JOIN companies c ON c.id=a.company_id WHERE ir.scheduled_at>now() ORDER BY ir.scheduled_at LIMIT 10`,
            ),
          )
        ).rows,
      ];
    },
    async upcomingReminders() {
      return [
        ...(
          await database.execute<Row<UpcomingReminder>>(
            sql.raw(
              `SELECT r.id::text,r.title,r.due_at "dueAt",a.title "applicationTitle" FROM reminders r JOIN applications a ON a.id=r.application_id WHERE r.status='pending' AND r.due_at>now() ORDER BY r.due_at LIMIT 10`,
            ),
          )
        ).rows,
      ];
    },
  };
}
