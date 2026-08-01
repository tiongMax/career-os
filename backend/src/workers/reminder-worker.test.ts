import { describe, expect, it, vi } from "vitest";

import type {
  FailedReminderJobInput,
  Reminder,
  ReminderRetryUpdate,
  ReminderWorkerStore,
} from "../domain/reminders/reminder.js";
import type { ReminderQueue } from "../infrastructure/reminders-redis.js";
import { createReminderWorker, retryBackoffMs } from "./reminder-worker.js";

const now = new Date("2026-08-01T01:02:03.000Z");
const pending: Reminder = {
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

function store(initial = pending) {
  let reminder = initial;
  let deliveries = 0;
  const retries: ReminderRetryUpdate[] = [];
  const failed: FailedReminderJobInput[] = [];
  const value: ReminderWorkerStore = {
    get: () => Promise.resolve(reminder),
    updateStatus: (_id, status) => {
      reminder = { ...reminder, status };
      return Promise.resolve(reminder);
    },
    createDelivery: () => {
      deliveries += 1;
      return Promise.resolve({
        id: "delivery",
        reminderId: reminder.id,
        idempotencyKey: reminder.idempotencyKey,
        deliveredAt: now,
        createdAt: now,
      });
    },
    markSent: () => {
      reminder = { ...reminder, status: "sent", deliveredAt: now };
      return Promise.resolve(reminder);
    },
    markRetry: (input) => {
      retries.push(input);
      reminder = {
        ...reminder,
        status: input.status,
        retryCount: input.retryCount,
        lastError: input.lastError,
      };
      return Promise.resolve(reminder);
    },
    createFailedJob: (input) => {
      failed.push(input);
      return Promise.resolve({
        id: "failed",
        reminderId: input.reminderId,
        errorMessage: input.errorMessage,
        retryCount: input.retryCount,
        payload: input.payload,
        failedAt: now,
      });
    },
  };
  return {
    value,
    retries,
    failed,
    current: () => reminder,
    deliveryCount: () => deliveries,
  };
}

function queue(): ReminderQueue & {
  scheduled: Array<{ id: string; dueAt: Date }>;
} {
  const scheduled: Array<{ id: string; dueAt: Date }> = [];
  return {
    scheduled,
    dueIds: () => Promise.resolve([pending.id, pending.id]),
    claim: (() => {
      let claimed = false;
      return () => {
        const result = !claimed;
        claimed = true;
        return Promise.resolve(result);
      };
    })(),
    schedule: (id, dueAt) => {
      scheduled.push({ id, dueAt });
      return Promise.resolve();
    },
  };
}

describe("reminder worker", () => {
  it("claims and delivers a pending reminder once", async () => {
    const state = store();
    const workQueue = queue();
    const deliver = vi.fn().mockResolvedValue(undefined);
    await createReminderWorker({
      store: state.value,
      queue: workQueue,
      deliver,
      pollIntervalMs: 1_000,
      maxRetries: 3,
      now: () => now,
    }).processDue();
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(state.deliveryCount()).toBe(1);
    expect(state.current().status).toBe("sent");
  });

  it("reschedules failures with the planned backoff", async () => {
    const state = store();
    const workQueue = queue();
    await createReminderWorker({
      store: state.value,
      queue: workQueue,
      deliver: vi.fn().mockRejectedValue(new Error("smtp unavailable")),
      pollIntervalMs: 1_000,
      maxRetries: 3,
      now: () => now,
    }).processDue();
    expect(state.retries).toEqual([
      expect.objectContaining({
        status: "pending",
        retryCount: 1,
        lastError: "smtp unavailable",
      }),
    ]);
    expect(workQueue.scheduled).toEqual([
      { id: pending.id, dueAt: new Date(now.getTime() + 30_000) },
    ]);
  });

  it("dead-letters the final failed attempt", async () => {
    const state = store({ ...pending, retryCount: 2 });
    const workQueue = queue();
    await createReminderWorker({
      store: state.value,
      queue: workQueue,
      deliver: vi.fn().mockRejectedValue(new Error("provider rejected")),
      pollIntervalMs: 1_000,
      maxRetries: 3,
      now: () => now,
    }).processDue();
    expect(state.retries[0]).toMatchObject({ status: "failed", retryCount: 3 });
    expect(state.failed[0]).toMatchObject({
      errorMessage: "provider rejected",
      retryCount: 3,
    });
    expect(workQueue.scheduled).toEqual([]);
  });

  it("uses the compatible retry schedule", () => {
    expect([1, 2, 3, 4].map(retryBackoffMs)).toEqual([
      30_000, 120_000, 300_000, 300_000,
    ]);
  });
});
