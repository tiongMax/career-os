import type { RedisClientType } from "redis";

import type {
  DashboardCache,
  DashboardSnapshot,
} from "../domain/dashboard/dashboard.js";

export const DASHBOARD_CACHE_KEY = "dashboard:v1";

export function createRedisDashboardCache(
  client: () => RedisClientType,
  ttlSeconds: number,
  onError: (error: unknown) => void = () => undefined,
): DashboardCache {
  return {
    async get() {
      try {
        const value = await client().get(DASHBOARD_CACHE_KEY);
        if (value === null) return null;
        const parsed: unknown = JSON.parse(value);
        return isDashboardSnapshot(parsed) ? parsed : null;
      } catch (error) {
        onError(error);
        return null;
      }
    },
    async set(snapshot) {
      try {
        await client().set(DASHBOARD_CACHE_KEY, JSON.stringify(snapshot), {
          EX: ttlSeconds,
        });
      } catch (error) {
        onError(error);
      }
    },
    async invalidate() {
      try {
        await client().del(DASHBOARD_CACHE_KEY);
      } catch (error) {
        onError(error);
      }
    },
  };
}

function isDashboardSnapshot(value: unknown): value is DashboardSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const upcoming = candidate.upcoming;
  return (
    typeof candidate.generatedAt === "string" &&
    typeof candidate.summary === "object" &&
    candidate.summary !== null &&
    typeof candidate.attention === "object" &&
    candidate.attention !== null &&
    typeof candidate.pipeline === "object" &&
    candidate.pipeline !== null &&
    Array.isArray(candidate.recentApplications) &&
    typeof upcoming === "object" &&
    upcoming !== null &&
    Array.isArray((upcoming as Record<string, unknown>).interviews) &&
    Array.isArray((upcoming as Record<string, unknown>).reminders) &&
    Array.isArray((upcoming as Record<string, unknown>).deadlines)
  );
}
