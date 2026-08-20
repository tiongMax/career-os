import { describe, expect, it, vi } from "vitest";
import type { RedisClientType } from "redis";

import type { DashboardSnapshot } from "./dashboard.service.js";
import {
  createRedisDashboardCache,
  DASHBOARD_CACHE_KEY,
} from "./dashboard-cache.js";

const snapshot = {
  generatedAt: "2026-08-02T10:00:00.000Z",
  summary: {
    total: 0,
    active: 0,
    responded: 0,
    interviewed: 0,
    offers: 0,
    rejected: 0,
  },
  attention: {
    overdueReminders: 0,
    dueTodayReminders: 0,
    staleApplications: 0,
    missingResumeVersion: 0,
    items: [],
  },
  pipeline: {},
  reachedPipeline: {},
  recentApplications: [],
  upcoming: { interviews: [], reminders: [], deadlines: [] },
} satisfies DashboardSnapshot;

describe("Redis dashboard cache", () => {
  it("uses the versioned key and configured TTL", async () => {
    const client = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
    } as unknown as RedisClientType;
    const cache = createRedisDashboardCache(() => client, 60);

    await cache.set(snapshot);
    await cache.invalidate();

    expect(client.set).toHaveBeenCalledWith(
      DASHBOARD_CACHE_KEY,
      JSON.stringify(snapshot),
      { EX: 60 },
    );
    expect(client.del).toHaveBeenCalledWith(DASHBOARD_CACHE_KEY);
  });

  it("treats corrupt values and Redis failures as cache misses", async () => {
    const onError = vi.fn();
    const corruptClient = {
      get: vi.fn().mockResolvedValue("not-json"),
    } as unknown as RedisClientType;
    const failingClient = {
      get: vi.fn().mockRejectedValue(new Error("offline")),
    } as unknown as RedisClientType;

    await expect(
      createRedisDashboardCache(() => corruptClient, 60, onError).get(),
    ).resolves.toBeNull();
    await expect(
      createRedisDashboardCache(() => failingClient, 60, onError).get(),
    ).resolves.toBeNull();
    expect(onError).toHaveBeenCalledTimes(2);
  });
});
