import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import type { FastifyReply } from "fastify";
import type { ApiServices } from "../services.js";

type ExportServices = Pick<
  ApiServices,
  "applications" | "companies" | "contacts" | "reminders"
>;
export function exportRoutes(
  services: ExportServices,
): FastifyPluginCallbackZod {
  return (app, _options, done) => {
    app.get(
      "/exports/applications.csv",
      { schema: { tags: ["Exports"] } },
      async (_request, reply) => {
        const [items, companies] = await Promise.all([
          services.applications.list(),
          services.companies.list(),
        ]);
        const names = new Map(companies.map((c) => [c.id, c.name]));
        return csv(reply, "applications.csv", [
          [
            "id",
            "company_id",
            "company_name",
            "resume_version_id",
            "title",
            "role_track",
            "source",
            "status",
            "location",
            "employment_type",
            "job_url",
            "applied_at",
            "deadline_at",
            "notes",
            "created_at",
            "updated_at",
          ],
          ...items.map((a) => [
            a.id,
            a.companyId,
            names.get(a.companyId) ?? "",
            a.resumeVersionId ?? "",
            a.title,
            a.roleTrack,
            a.source ?? "",
            a.status,
            a.location ?? "",
            a.employmentType ?? "",
            a.jobUrl ?? "",
            date(a.appliedAt),
            date(a.deadlineAt),
            a.notes ?? "",
            date(a.createdAt),
            date(a.updatedAt),
          ]),
        ]);
      },
    );
    app.get(
      "/exports/contacts.csv",
      { schema: { tags: ["Exports"] } },
      async (_request, reply) => {
        const [items, companies] = await Promise.all([
          services.contacts.list(),
          services.companies.list(),
        ]);
        const names = new Map(companies.map((c) => [c.id, c.name]));
        return csv(reply, "contacts.csv", [
          [
            "id",
            "company_id",
            "company_name",
            "name",
            "role",
            "email",
            "linkedin_url",
            "relationship",
            "notes",
            "created_at",
            "updated_at",
          ],
          ...items.map((c) => [
            c.id,
            c.companyId,
            names.get(c.companyId) ?? "",
            c.name,
            c.role ?? "",
            c.email ?? "",
            c.linkedinUrl ?? "",
            c.relationship ?? "",
            c.notes ?? "",
            date(c.createdAt),
            date(c.updatedAt),
          ]),
        ]);
      },
    );
    app.get(
      "/exports/reminders.csv",
      { schema: { tags: ["Exports"] } },
      async (_request, reply) =>
        csv(reply, "reminders.csv", [
          [
            "id",
            "application_id",
            "contact_id",
            "title",
            "description",
            "due_at",
            "status",
            "retry_count",
            "last_error",
            "delivered_at",
            "created_at",
            "updated_at",
          ],
          ...(await services.reminders.list()).map((r) => [
            r.id,
            r.applicationId,
            r.contactId ?? "",
            r.title,
            r.description ?? "",
            date(r.dueAt),
            r.status,
            String(r.retryCount),
            r.lastError ?? "",
            date(r.deliveredAt),
            date(r.createdAt),
            date(r.updatedAt),
          ]),
        ]),
    );
    done();
  };
}
function csv(reply: FastifyReply, filename: string, rows: string[][]) {
  return reply
    .header("content-type", "text/csv; charset=utf-8")
    .header("content-disposition", `attachment; filename="${filename}"`)
    .header("cache-control", "no-store")
    .send(
      rows
        .map((row) =>
          row
            .map((cell) =>
              /[",\r\n]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell,
            )
            .join(","),
        )
        .join("\n") + "\n",
    );
}
function date(value: Date | null): string {
  return value === null ? "" : value.toISOString().replace(/\.\d{3}Z$/, "Z");
}
