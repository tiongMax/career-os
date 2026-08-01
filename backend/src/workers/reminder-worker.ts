import type {
  Reminder,
  ReminderWorkerStore,
} from "../domain/reminders/reminder.js";
import type { ReminderQueue } from "../infrastructure/reminders-redis.js";

export interface ReminderWorkerLogger {
  info: (message: string, context?: Record<string, unknown>) => void;
  error: (
    message: string,
    error: unknown,
    context?: Record<string, unknown>,
  ) => void;
}

export interface ReminderWorker {
  processDue: () => Promise<void>;
  run: (signal: AbortSignal) => Promise<void>;
}

export interface CreateReminderWorkerOptions {
  store: ReminderWorkerStore;
  queue: ReminderQueue;
  pollIntervalMs: number;
  maxRetries: number;
  deliver?: (reminder: Reminder) => Promise<void>;
  now?: () => Date;
  logger?: ReminderWorkerLogger;
}

export function createReminderWorker(
  options: CreateReminderWorkerOptions,
): ReminderWorker {
  const now = options.now ?? (() => new Date());
  const maxRetries = options.maxRetries <= 0 ? 3 : options.maxRetries;
  const deliver = options.deliver ?? (() => Promise.resolve());

  async function handleFailure(reminder: Reminder, cause: unknown) {
    const message = errorMessage(cause);
    const retryCount = reminder.retryCount + 1;
    if (retryCount >= maxRetries) {
      await options.store.markRetry({
        id: reminder.id,
        status: "failed",
        retryCount,
        lastError: message,
      });
      await options.store.createFailedJob({
        reminderId: reminder.id,
        errorMessage: message,
        retryCount,
        payload: {
          reminder_id: reminder.id,
          title: reminder.title,
          due_at: reminder.dueAt.toISOString(),
        },
      });
      return;
    }

    const updated = await options.store.markRetry({
      id: reminder.id,
      status: "pending",
      retryCount,
      lastError: message,
    });
    await options.queue.schedule(
      updated.id,
      new Date(now().getTime() + retryBackoffMs(retryCount)),
    );
  }

  async function processOne(id: string): Promise<void> {
    const current = await options.store.get(id);
    if (current.status !== "pending") return;
    const reminder = await options.store.updateStatus(id, "processing");
    try {
      await options.store.createDelivery(reminder);
      await deliver(reminder);
      await options.store.markSent(reminder.id);
      options.logger?.info("reminder processed", { reminderId: reminder.id });
    } catch (error) {
      await handleFailure(reminder, error);
      options.logger?.error("reminder delivery failed", error, {
        reminderId: reminder.id,
      });
    }
  }

  async function processDue(): Promise<void> {
    for (const id of await options.queue.dueIds(now())) {
      if (!(await options.queue.claim(id))) continue;
      try {
        await processOne(id);
      } catch (error) {
        options.logger?.error("reminder processing failed", error, {
          reminderId: id,
        });
      }
    }
  }

  return {
    processDue,
    async run(signal) {
      options.logger?.info("reminder worker started", {
        pollIntervalMs: options.pollIntervalMs,
        maxRetries,
      });
      for (;;) {
        await wait(options.pollIntervalMs, signal);
        if (signal.aborted) break;
        try {
          await processDue();
        } catch (error) {
          options.logger?.error("processing due reminders failed", error);
        }
      }
      options.logger?.info("reminder worker stopped");
    },
  };
}

export function retryBackoffMs(retryCount: number): number {
  if (retryCount === 1) return 30_000;
  if (retryCount === 2) return 120_000;
  return 300_000;
}

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timeout = setTimeout(done, milliseconds);
    function done() {
      clearTimeout(timeout);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
