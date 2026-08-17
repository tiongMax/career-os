import { and, asc, desc, eq, lte } from "drizzle-orm";

import type { RemindersRepository } from "./reminder.service.js";
import type { Database } from "../../database/client.js";
import { EntityNotFoundError } from "../../database/errors.js";
import { failedReminderJobs, reminders } from "../../database/schema.js";

export type RemindersPersistence = RemindersRepository;

export function createRemindersRepository(
  database: Database,
): RemindersPersistence {
  return {
    async create(input, idempotencyKey) {
      const [reminder] = await database
        .insert(reminders)
        .values({
          applicationId: input.application_id,
          contactId: input.contact_id ?? null,
          title: input.title,
          description: input.description ?? null,
          dueAt: requireDueAt(input.due_at),
          idempotencyKey,
        })
        .returning();
      if (reminder === undefined)
        throw new Error("reminder insert returned no row");
      return reminder;
    },
    list: () =>
      database
        .select()
        .from(reminders)
        .orderBy(asc(reminders.dueAt), desc(reminders.createdAt))
        .limit(200),
    listDue: (now) =>
      database
        .select()
        .from(reminders)
        .where(and(eq(reminders.status, "pending"), lte(reminders.dueAt, now)))
        .orderBy(asc(reminders.dueAt)),
    async get(id) {
      const [reminder] = await database
        .select()
        .from(reminders)
        .where(eq(reminders.id, id))
        .limit(1);
      if (reminder === undefined) throw new EntityNotFoundError("reminder");
      return reminder;
    },
    async update(id, input) {
      const values: Partial<typeof reminders.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.application_id != null)
        values.applicationId = input.application_id;
      if ("contact_id" in input) values.contactId = input.contact_id ?? null;
      if (input.title != null) values.title = input.title;
      if ("description" in input)
        values.description = input.description ?? null;
      if (input.due_at != null) values.dueAt = input.due_at;
      const [reminder] = await database
        .update(reminders)
        .set(values)
        .where(eq(reminders.id, id))
        .returning();
      if (reminder === undefined) throw new EntityNotFoundError("reminder");
      return reminder;
    },
    async updateStatus(id, status) {
      const [reminder] = await database
        .update(reminders)
        .set({ status, updatedAt: new Date() })
        .where(eq(reminders.id, id))
        .returning();
      if (reminder === undefined) throw new EntityNotFoundError("reminder");
      return reminder;
    },
    async delete(id) {
      const deleted = await database
        .delete(reminders)
        .where(eq(reminders.id, id))
        .returning({ id: reminders.id });
      if (deleted.length === 0) throw new EntityNotFoundError("reminder");
    },
    listFailed: () =>
      database
        .select()
        .from(failedReminderJobs)
        .orderBy(desc(failedReminderJobs.failedAt)),
    async resetForRetry(id) {
      const [reminder] = await database
        .update(reminders)
        .set({
          status: "pending",
          retryCount: 0,
          lastError: null,
          updatedAt: new Date(),
        })
        .where(and(eq(reminders.id, id), eq(reminders.status, "failed")))
        .returning();
      if (reminder === undefined) throw new EntityNotFoundError("reminder");
      return reminder;
    },
  };
}

function requireDueAt(value: Date | null | undefined): Date {
  if (value == null) throw new Error("reminder due_at was not validated");
  return value;
}
