import { describe, expect, it, vi } from "vitest";

import type { DashboardCache, DashboardSnapshot } from "./dashboard.service.js";
import { createDashboardService } from "./dashboard.service.js";

const snapshot: DashboardSnapshot = {
  generatedAt: "2026-08-02T10:00:00.000Z",
  summary: {
    total: 1,
    active: 1,
    responded: 0,
    interviewed: 0,
    offers: 0,
    rejected: 0,
  },
  attention: {
    overdueReminders: 0,
    dueTodayReminders: 0,
    staleApplications: 0,
    missingResumeVersion: 1,
    items: [],
  },
  pipeline: { applied: 1 },
  recentApplications: [],
  upcoming: { interviews: [], reminders: [], deadlines: [] },
};

function cache(overrides: Partial<DashboardCache> = {}): DashboardCache {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    invalidate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("dashboard service", () => {
  it("returns a cached snapshot without querying PostgreSQL", async () => {
    const repository = { load: vi.fn() };
    const service = createDashboardService(
      repository,
      cache({ get: vi.fn().mockResolvedValue(snapshot) }),
    );

    await expect(service.get()).resolves.toEqual({
      snapshot,
      cacheStatus: "HIT",
    });
    expect(repository.load).not.toHaveBeenCalled();
  });

  it("loads and caches a miss", async () => {
    const repository = { load: vi.fn().mockResolvedValue(snapshot) };
    const dashboardCache = cache();
    const service = createDashboardService(
      repository,
      dashboardCache,
      () => new Date(snapshot.generatedAt),
    );

    await expect(service.get()).resolves.toEqual({
      snapshot,
      cacheStatus: "MISS",
    });
    expect(repository.load).toHaveBeenCalledWith(
      new Date(snapshot.generatedAt),
    );
    expect(dashboardCache.set).toHaveBeenCalledWith(snapshot);
  });

  it("deduplicates simultaneous cache misses", async () => {
    let resolveLoad: (value: DashboardSnapshot) => void = () => {
      // Replaced by the promise constructor below.
    };
    const repository = {
      load: vi.fn().mockReturnValue(
        new Promise<DashboardSnapshot>((resolve) => {
          resolveLoad = resolve;
        }),
      ),
    };
    const service = createDashboardService(repository, cache());

    const first = service.get();
    const second = service.get();
    await vi.waitFor(() => {
      expect(repository.load).toHaveBeenCalledTimes(1);
    });
    resolveLoad(snapshot);

    await expect(Promise.all([first, second])).resolves.toEqual([
      { snapshot, cacheStatus: "MISS" },
      { snapshot, cacheStatus: "MISS" },
    ]);
  });
});
