import { afterAll, describe, expect, it } from "vitest";

import { createPostgres, type Postgres } from "../../database/client.js";
import { createDashboardRepository } from "./dashboard.repository.js";

const databaseUrl = process.env.CAREEROS_INTEGRATION_DATABASE_URL;
let postgres: Postgres | undefined;

describe.skipIf(databaseUrl === undefined)("dashboard repository", () => {
  afterAll(async () => {
    await postgres?.close();
  });

  it("returns a bounded, serializable snapshot", async () => {
    postgres = createPostgres(requireDatabaseUrl());
    const snapshot = await createDashboardRepository(postgres.db).load(
      new Date("2026-08-02T10:00:00.000Z"),
    );

    expect(snapshot.summary.total).toBeGreaterThanOrEqual(0);
    expect(snapshot.recentApplications.length).toBeLessThanOrEqual(5);
    expect(snapshot.upcoming.interviews.length).toBeLessThanOrEqual(10);
    expect(snapshot.upcoming.reminders.length).toBeLessThanOrEqual(10);
    expect(snapshot.upcoming.deadlines.length).toBeLessThanOrEqual(5);
    expect(snapshot.attention.items.length).toBeLessThanOrEqual(20);
    expect(() => JSON.stringify(snapshot)).not.toThrow();
    for (const application of snapshot.recentApplications) {
      expect(new Date(application.updatedAt).toISOString()).toBe(
        application.updatedAt,
      );
    }
  });
});

function requireDatabaseUrl(): string {
  if (databaseUrl === undefined)
    throw new Error("integration database URL is required");
  return databaseUrl;
}
