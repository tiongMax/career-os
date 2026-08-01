import { and, asc, desc, eq, lte } from "drizzle-orm";

import type {
  RemindersRepository,
  ReminderWorkerStore,
} from "../../domain/reminders/reminder.js";
import type { Database } from "../../infrastructure/postgres.js";
import { EntityNotFoundError } from "./errors.js";
import { failedReminderJobs, reminderDeliveries, reminders } from "./schema.js";

export type RemindersPersistence = RemindersRepository & ReminderWorkerStore;

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
      if (input.contact_id != null) values.contactId = input.contact_id;
      if (input.title != null) values.title = input.title;
      if (input.description != null) values.description = input.description;
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
    async createDelivery(reminder) {
      const [delivery] = await database
        .insert(reminderDeliveries)
        .values({
          reminderId: reminder.id,
          idempotencyKey: reminder.idempotencyKey,
        })
        .onConflictDoUpdate({
          target: reminderDeliveries.idempotencyKey,
          set: { idempotencyKey: reminder.idempotencyKey },
        })
        .returning();
      if (delivery === undefined)
        throw new Error("reminder delivery insert returned no row");
      return delivery;
    },
    async markSent(id) {
      const [reminder] = await database
        .update(reminders)
        .set({
          status: "sent",
          deliveredAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, id))
        .returning();
      if (reminder === undefined) throw new EntityNotFoundError("reminder");
      return reminder;
    },
    async markRetry(input) {
      const [reminder] = await database
        .update(reminders)
        .set({
          status: input.status,
          retryCount: input.retryCount,
          lastError: input.lastError,
          updatedAt: new Date(),
        })
        .where(eq(reminders.id, input.id))
        .returning();
      if (reminder === undefined) throw new EntityNotFoundError("reminder");
      return reminder;
    },
    async createFailedJob(input) {
      const [job] = await database
        .insert(failedReminderJobs)
        .values(input)
        .returning();
      if (job === undefined)
        throw new Error("failed reminder job insert returned no row");
      return job;
    },
  };
}

function requireDueAt(value: Date | null | undefined): Date {
  if (value == null) throw new Error("reminder due_at was not validated");
  return value;
}
