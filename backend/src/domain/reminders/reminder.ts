import { randomBytes } from "node:crypto";

import { z } from "zod";

import { DomainValidationError } from "../errors.js";

export const reminderStatuses = [
  "pending",
  "processing",
  "sent",
  "failed",
  "cancelled",
] as const;
export type ReminderStatus = (typeof reminderStatuses)[number];

const nullableString = z.string().nullable().optional();
const nullableDate = z.iso
  .datetime({ offset: true })
  .transform((value) => new Date(value))
  .nullable()
  .optional();

export const createReminderInputSchema = z.strictObject({
  application_id: z.string().default(""),
  contact_id: nullableString,
  title: z.string().default(""),
  description: nullableString,
  due_at: nullableDate,
});

export const updateReminderInputSchema = z.strictObject({
  application_id: nullableString,
  contact_id: nullableString,
  title: nullableString,
  description: nullableString,
  due_at: nullableDate,
});

export type CreateReminderInput = z.infer<typeof createReminderInputSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderInputSchema>;

export interface Reminder {
  id: string;
  applicationId: string;
  contactId: string | null;
  title: string;
  description: string | null;
  dueAt: Date;
  status: string;
  idempotencyKey: string;
  retryCount: number;
  lastError: string | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FailedReminderJob {
  id: string;
  reminderId: string | null;
  errorMessage: string;
  retryCount: number;
  payload: unknown;
  failedAt: Date;
}

export interface RemindersRepository {
  create: (
    input: CreateReminderInput,
    idempotencyKey: string,
  ) => Promise<Reminder>;
  list: () => Promise<Reminder[]>;
  listDue: (now: Date) => Promise<Reminder[]>;
  get: (id: string) => Promise<Reminder>;
  update: (id: string, input: UpdateReminderInput) => Promise<Reminder>;
  updateStatus: (id: string, status: ReminderStatus) => Promise<Reminder>;
  delete: (id: string) => Promise<void>;
  listFailed: () => Promise<FailedReminderJob[]>;
  resetForRetry: (id: string) => Promise<Reminder>;
}

export interface RemindersService {
  create: (input: CreateReminderInput) => Promise<Reminder>;
  list: () => Promise<Reminder[]>;
  listDue: () => Promise<Reminder[]>;
  get: (id: string) => Promise<Reminder>;
  update: (id: string, input: UpdateReminderInput) => Promise<Reminder>;
  cancel: (id: string) => Promise<Reminder>;
  delete: (id: string) => Promise<void>;
  listFailed: () => Promise<FailedReminderJob[]>;
  retry: (id: string) => Promise<Reminder>;
}

export function createRemindersService(
  repository: RemindersRepository,
  now: () => Date = () => new Date(),
  idempotencyKey: () => string = () => randomBytes(16).toString("hex"),
): RemindersService {
  return {
    async create(input) {
      requireTitle(input.title);
      requireDueAt(input.due_at);
      return repository.create(input, idempotencyKey());
    },
    list: () => repository.list(),
    listDue: () => repository.listDue(now()),
    get: (id) => repository.get(id),
    async update(id, input) {
      if (input.title != null) requireTitle(input.title);
      if (input.due_at === null)
        throw new DomainValidationError("reminder due_at is required");
      return repository.update(id, input);
    },
    cancel: (id) => repository.updateStatus(id, "cancelled"),
    delete: (id) => repository.delete(id),
    listFailed: () => repository.listFailed(),
    retry: (id) => repository.resetForRetry(id),
  };
}

function requireTitle(title: string): void {
  if (title.trim() === "")
    throw new DomainValidationError("reminder title is required");
}

function requireDueAt(dueAt: Date | null | undefined): asserts dueAt is Date {
  if (dueAt == null || Number.isNaN(dueAt.getTime()))
    throw new DomainValidationError("reminder due_at is required");
}
