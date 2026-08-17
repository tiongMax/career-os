import { describe, expect, it, vi } from "vitest";

import type { DashboardCache } from "./features/dashboard/dashboard.service.js";
import { withInvalidation } from "./services.js";

describe("dashboard invalidation decorator", () => {
  it("invalidates only after a successful mutation", async () => {
    const cache = {
      get: vi.fn(),
      set: vi.fn(),
      invalidate: vi.fn().mockResolvedValue(undefined),
    } satisfies DashboardCache;
    const service = {
      read: vi.fn().mockResolvedValue("read"),
      write: vi.fn().mockResolvedValue("written"),
      fail: vi.fn().mockRejectedValue(new Error("write failed")),
    };
    const decorated = withInvalidation(service, cache, ["write", "fail"]);

    await expect(decorated.read()).resolves.toBe("read");
    await expect(decorated.write()).resolves.toBe("written");
    await expect(decorated.fail()).rejects.toThrow("write failed");
    expect(cache.invalidate).toHaveBeenCalledTimes(1);
  });
});
