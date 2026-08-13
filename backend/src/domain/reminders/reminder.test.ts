import { describe, expect, it, vi } from "vitest";

import {
  createRemindersService,
  type Reminder,
  type RemindersRepository,
} from "./reminder.js";

const now = new Date("2026-08-01T01:02:03.000Z");
const reminder: Reminder = {
  id: "reminder",
  applicationId: "application",
  contactId: null,
  title: "Follow up",
  description: null,
  dueAt: now,
  status: "pending",
  idempotencyKey: "key",
  retryCount: 0,
  lastError: null,
  deliveredAt: null,
  createdAt: now,
  updatedAt: now,
};

function repository(): RemindersRepository {
  return {
    create: vi.fn().mockResolvedValue(reminder),
    list: vi.fn().mockResolvedValue([]),
    listDue: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(reminder),
    update: vi.fn().mockResolvedValue(reminder),
    updateStatus: vi.fn().mockResolvedValue({
      ...reminder,
      status: "cancelled",
    }),
    delete: vi.fn().mockResolvedValue(undefined),
    listFailed: vi.fn().mockResolvedValue([]),
    resetForRetry: vi.fn().mockResolvedValue(reminder),
  };
}

describe("reminders service", () => {
  it("validates required fields and stores new reminders", async () => {
    const repo = repository();
    const service = createRemindersService(
      repo,
      () => now,
      () => "key",
    );
    await expect(
      service.create({
        application_id: "application",
        title: " ",
        due_at: now,
      }),
    ).rejects.toThrow("reminder title is required");
    await expect(
      service.create({ application_id: "application", title: "Follow up" }),
    ).rejects.toThrow("reminder due_at is required");

    await service.create({
      application_id: "application",
      title: "Follow up",
      due_at: now,
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Follow up" }),
      "key",
    );
  });

  it("persists cancellation and manual retry state", async () => {
    const repo = repository();
    const service = createRemindersService(repo);
    await service.cancel(reminder.id);
    await service.retry(reminder.id);
    expect(repo.updateStatus).toHaveBeenCalledWith(reminder.id, "cancelled");
    expect(repo.resetForRetry).toHaveBeenCalledWith(reminder.id);
  });
});
