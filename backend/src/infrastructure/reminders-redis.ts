import type { RedisClientType } from "redis";

import type {
  Reminder,
  ReminderScheduler,
} from "../domain/reminders/reminder.js";

export const reminderScheduleKey = "reminders:scheduled";

export interface ReminderQueue {
  dueIds: (now: Date) => Promise<string[]>;
  claim: (id: string) => Promise<boolean>;
  schedule: (id: string, dueAt: Date) => Promise<void>;
}

export function createRedisReminderScheduler(
  getClient: () => RedisClientType,
): ReminderScheduler {
  return {
    schedule: (reminder) => schedule(getClient(), reminder.id, reminder.dueAt),
    async unschedule(id) {
      await getClient().zRem(reminderScheduleKey, id);
    },
  };
}

export function createRedisReminderQueue(
  client: RedisClientType,
): ReminderQueue {
  return {
    dueIds: (now) =>
      client.zRangeByScore(reminderScheduleKey, "-inf", unixSeconds(now)),
    async claim(id) {
      return (await client.zRem(reminderScheduleKey, id)) > 0;
    },
    schedule: (id, dueAt) => schedule(client, id, dueAt),
  };
}

async function schedule(
  client: RedisClientType,
  id: Reminder["id"],
  dueAt: Date,
): Promise<void> {
  await client.zAdd(reminderScheduleKey, {
    score: unixSeconds(dueAt),
    value: id,
  });
}

function unixSeconds(date: Date): number {
  return Math.floor(date.getTime() / 1_000);
}
